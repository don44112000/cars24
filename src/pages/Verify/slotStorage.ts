/**
 * Persists per-slot state to sessionStorage so a page reload doesn't lose
 * the user's uploaded images, extracted fields, and error states.
 *
 * Keyed per slot (`rcready:slot:v1:${docId}`) so quota issues with one slot
 * don't take down the rest. File bytes are stored as base64 — large enough
 * that we may hit the ~5-10 MB sessionStorage quota; if we do, we fall back
 * to saving everything except the file bytes (the user keeps their
 * extracted data and errors, but has to re-upload to see the preview).
 *
 * sessionStorage clears on tab close, which is the right lifetime: we hold
 * PII (Aadhaar last-4, PAN, names, photos), and we do NOT want it
 * persisting across browser sessions.
 */

import { DOC_ORDER, type DocId } from '../../services/ai/documents';

const PREFIX = 'rcready:slot:v1:';

type DocStatus = 'idle' | 'uploaded' | 'extracting' | 'extracted' | 'error';
type ErrorKind = 'mismatch' | 'lowQuality' | 'config' | 'generic';

export interface DocSlotError {
  kind: ErrorKind;
  message: string;
}

export interface DocSlot {
  status: DocStatus;
  file: File | null;
  previewUrl: string | null;
  extracted: unknown | null;
  error: DocSlotError | null;
  fromCache: boolean;
}

interface SerializedSlot {
  fileName: string;
  fileType: string;
  fileBase64: string | null;
  status: DocStatus;
  extracted: unknown | null;
  error: DocSlotError | null;
  fromCache: boolean;
}

export const emptySlot = (): DocSlot => ({
  status: 'idle',
  file: null,
  previewUrl: null,
  extracted: null,
  error: null,
  fromCache: false,
});

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToFile(b64: string, name: string, type: string): File {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: type || 'application/octet-stream' });
}

/**
 * Hydrate slots synchronously from sessionStorage. Returns a fresh map of
 * empty slots if storage is unavailable / empty / corrupt.
 *
 * NOTE: If you call this twice you'll create duplicate blob URLs. Call once
 * during state initialisation only.
 */
export function loadSlots(): Record<DocId, DocSlot> {
  const result: Record<DocId, DocSlot> = DOC_ORDER.reduce((acc, id) => {
    acc[id] = emptySlot();
    return acc;
  }, {} as Record<DocId, DocSlot>);

  if (typeof sessionStorage === 'undefined') return result;

  for (const id of DOC_ORDER) {
    try {
      const raw = sessionStorage.getItem(PREFIX + id);
      if (!raw) continue;
      const s = JSON.parse(raw) as SerializedSlot;

      let file: File | null = null;
      let previewUrl: string | null = null;
      if (s.fileBase64) {
        try {
          file = base64ToFile(s.fileBase64, s.fileName, s.fileType);
          previewUrl = URL.createObjectURL(file);
        } catch {
          file = null;
          previewUrl = null;
        }
      }

      result[id] = {
        status: s.status,
        file,
        previewUrl,
        extracted: s.extracted,
        error: s.error,
        fromCache: s.fromCache,
      };
    } catch {
      /* corrupt entry — skip */
    }
  }

  return result;
}

/**
 * Save a single slot to sessionStorage. Removes the entry when the slot is
 * idle. Uses `fileBase64Cache` so we don't re-read the same file's bytes
 * on every state change.
 */
export async function saveSlot(
  id: DocId,
  slot: DocSlot,
  fileBase64Cache: Map<File, string>,
): Promise<void> {
  if (typeof sessionStorage === 'undefined') return;
  const key = PREFIX + id;

  if (slot.status === 'idle' && !slot.file) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* noop */
    }
    return;
  }

  let fileBase64: string | null = null;
  let fileName = '';
  let fileType = '';

  if (slot.file) {
    fileName = slot.file.name;
    fileType = slot.file.type;
    const cached = fileBase64Cache.get(slot.file);
    if (cached) {
      fileBase64 = cached;
    } else {
      try {
        fileBase64 = await fileToBase64(slot.file);
        fileBase64Cache.set(slot.file, fileBase64);
      } catch {
        fileBase64 = null;
      }
    }
  }

  const serialized: SerializedSlot = {
    fileName,
    fileType,
    fileBase64,
    status: slot.status,
    extracted: slot.extracted,
    error: slot.error,
    fromCache: slot.fromCache,
  };

  try {
    sessionStorage.setItem(key, JSON.stringify(serialized));
  } catch {
    // Quota exceeded — fall back to dropping the file bytes for this slot.
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({ ...serialized, fileBase64: null }),
      );
    } catch {
      /* truly full — best effort only */
    }
  }
}

export function clearSlotStorage(id: DocId): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(PREFIX + id);
  } catch {
    /* noop */
  }
}
