/**
 * Thin Gemini REST client used to extract structured fields from a document
 * image. We use Google's `generateContent` endpoint with `responseSchema` so
 * the model is forced to return JSON in the exact shape we asked for.
 *
 * SECURITY NOTE: VITE_* env vars are bundled into the browser. The API key
 * below is therefore visible to any visitor. Move this call behind a server
 * proxy before shipping to real users.
 */

import {
  describeSchemaForPrompt,
  DOC_DESCRIPTORS,
  DOC_LABEL_BY_DETECTED,
  FIELD_LABELS,
  findMissingRequiredFields,
  type DetectedValue,
  type DocDescriptor,
  type DocId,
  type ExtractedByDoc,
} from './documents';
import { fileHash, getCachedRaw, setCachedRaw } from './cache';
import { acquireSlot, notifyRateLimited } from './rateLimiter';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Request body uses snake_case for `inline_data` / `mime_type` /
 * `response_mime_type` / `response_schema` to match the cURL examples in
 * https://ai.google.dev/api/generate-content. The v1beta endpoint also
 * accepts camelCase, but snake_case is the canonical form shown in the docs.
 */
interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

export class GeminiConfigError extends Error {}
export class GeminiCallError extends Error {}
export class GeminiParseError extends Error {}

/** Model said the image is a different document than the slot the user picked. */
export class DocumentMismatchError extends Error {
  expected: DocId;
  detected: DetectedValue;
  constructor(expected: DocId, detected: DetectedValue, message: string) {
    super(message);
    this.expected = expected;
    this.detected = detected;
  }
}

/** Image was readable enough for the model to respond, but required fields came back null. */
export class LowQualityImageError extends Error {
  missingFields: string[];
  constructor(missingFields: string[], message: string) {
    super(message);
    this.missingFields = missingFields;
  }
}

function getConfig(): { apiKey: string; model: string } {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = import.meta.env.VITE_GEMINI_MODEL;
  if (!apiKey) {
    throw new GeminiConfigError(
      'VITE_GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.',
    );
  }
  if (!model) {
    throw new GeminiConfigError(
      'VITE_GEMINI_MODEL is not set. Add it to .env (e.g. gemini-2.5-flash).',
    );
  }
  return { apiKey, model };
}

async function fileToInlineData(file: File): Promise<{ mime_type: string; data: string }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return {
    mime_type: file.type || 'image/jpeg',
    data: btoa(binary),
  };
}

/**
 * Validate the parsed Gemini response against the slot's expectations.
 * Throws `DocumentMismatchError` or `LowQualityImageError` on disagreement.
 * Runs on every call (including cache hits) so the user always sees the
 * right error.
 */
function validateExtraction<K extends DocId>(
  docId: K,
  descriptor: DocDescriptor<ExtractedByDoc[K]>,
  parsed: ExtractedByDoc[K],
): void {
  // 1. Did the model see a different document than this slot expects?
  // Prefer the explicit yes/no; fall back to the enum if boolean is null.
  const detected = parsed.documentTypeDetected;
  const matches = parsed.matchesExpectedDocument;
  const reason = parsed.matchReason;

  const enumDisagrees = !!detected && detected !== descriptor.canonicalDetectedValue;
  const booleanDisagrees = matches === false;

  if (booleanDisagrees || enumDisagrees) {
    const detectedLabel = detected ? DOC_LABEL_BY_DETECTED[detected] ?? 'something else' : 'a different document';
    const reasonSuffix = reason ? ` Reason: ${reason}` : '';
    throw new DocumentMismatchError(
      docId,
      detected ?? 'other',
      `This image looks like ${detectedLabel}, but it was uploaded into the ${descriptor.label} slot. Please upload the correct document or move this image to the right slot.${reasonSuffix}`,
    );
  }

  // 2. Are required fields all present?
  const missing = findMissingRequiredFields(docId, parsed);
  if (missing.length > 0) {
    const labels = missing.map(f => FIELD_LABELS[f] ?? f);
    throw new LowQualityImageError(
      missing,
      `Could not read ${labels.join(', ')} from this image. Please upload a clearer, higher-resolution photo with the full document visible and good lighting.`,
    );
  }
}

/**
 * Strip Markdown code fences the model sometimes wraps JSON in.
 * Handles ```json\n{...}\n```, ```\n{...}\n```, and bare {...}.
 */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

/**
 * Build the full prompt: human-readable instructions from the descriptor,
 * followed by the exact JSON shape we want back. Used in prompt-based JSON
 * mode (no constrained decoding).
 */
function buildJsonPrompt(descriptor: { prompt: string; responseSchema: DocDescriptor<never>['responseSchema'] }): string {
  const shape = describeSchemaForPrompt(descriptor.responseSchema);
  return `${descriptor.prompt}

OUTPUT FORMAT — IMPORTANT:
Return ONLY a single JSON object. No prose, no commentary, no markdown code fences.
The object must have EXACTLY these keys with the types shown (use null for any field you cannot read with confidence):

${shape}`;
}

async function callGemini<K extends DocId>(
  descriptor: DocDescriptor<ExtractedByDoc[K]>,
  file: File,
  signal: AbortSignal | undefined,
): Promise<ExtractedByDoc[K]> {
  const { apiKey, model } = getConfig();
  const inlineData = await fileToInlineData(file);

  const parts: GeminiPart[] = [
    { text: buildJsonPrompt(descriptor) },
    { inline_data: inlineData },
  ];

  // Prompt-based JSON: leave response_mime_type as text/plain (the default
  // for Gemini) and rely on the prompt to specify the shape. No
  // response_schema = no constrained decoding.
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0,
      response_mime_type: 'text/plain',
    },
  };

  const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // One retry on 429 with the server's Retry-After hint. Anything else
  // bubbles up so the user sees a real error.
  const maxAttempts = 2;
  let res: Response | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await acquireSlot();
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (res.status !== 429) break;

    const retryAfter = Number(res.headers.get('retry-after')) || undefined;
    notifyRateLimited(retryAfter);
    if (attempt === maxAttempts) {
      throw new GeminiCallError(
        `Gemini rate limit hit (429). Try again in ${retryAfter ?? 'a few'} seconds, or lower your usage.`,
      );
    }
  }

  if (!res || !res.ok) {
    let message = `Gemini API error (${res?.status ?? 'no response'})`;
    try {
      const errBody = (await res!.json()) as GeminiResponse;
      if (errBody.error?.message) message = `Gemini API error: ${errBody.error.message}`;
    } catch {
      /* ignore JSON parse error on error body */
    }
    throw new GeminiCallError(message);
  }

  const json = (await res.json()) as GeminiResponse;
  if (json.promptFeedback?.blockReason) {
    throw new GeminiCallError(`Prompt blocked: ${json.promptFeedback.blockReason}`);
  }

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiParseError('Gemini returned an empty response.');
  }

  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned) as ExtractedByDoc[K];
  } catch {
    throw new GeminiParseError('Gemini response was not valid JSON.');
  }
}

export interface ExtractionOutcome<T> {
  data: T;
  /** True when the API was hit; false when served from the in-memory cache. */
  fromCache: boolean;
}

/**
 * Extract structured fields from a single document image, with content-hash
 * caching so the API is only billed once per unique (docId, file) pair.
 *
 * Cache key = `${docId}:${sha256(fileBytes)}`. Replacing the file in the UI
 * gives a different hash and naturally invalidates the entry.
 *
 * Validation runs on every call (cache hits included) so the user still sees
 * mismatch / low-quality errors after a cache hit.
 */
export async function extractFromImage<K extends DocId>(
  docId: K,
  file: File,
  signal?: AbortSignal,
): Promise<ExtractionOutcome<ExtractedByDoc[K]>> {
  const descriptor = DOC_DESCRIPTORS[docId] as DocDescriptor<ExtractedByDoc[K]>;
  const hash = await fileHash(file);

  const cached = getCachedRaw<ExtractedByDoc[K]>(docId, hash);
  if (cached) {
    validateExtraction(docId, descriptor, cached);
    return { data: cached, fromCache: true };
  }

  const parsed = await callGemini<K>(descriptor, file, signal);
  setCachedRaw(docId, hash, parsed);
  validateExtraction(docId, descriptor, parsed);
  return { data: parsed, fromCache: false };
}
