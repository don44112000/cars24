/**
 * Cache for AI extractions.
 *
 * Key = `${docId}:${sha256(fileBytes)}`. The hash is over the raw image
 * bytes, so the cache is invalidated automatically when the user replaces
 * the file (new bytes → new hash → cache miss).
 *
 * Backed by sessionStorage so the cache survives:
 *   - page reloads
 *   - Vite HMR reloads during development
 *   - SPA navigation away and back
 * sessionStorage is cleared when the browser tab is closed, which is the
 * right lifetime: the cache holds PII (names, Aadhaar last-4, PAN), and we
 * do NOT want that persisting across browser sessions.
 *
 * We cache the RAW parsed JSON from the AI, not the validated result.
 * Validation (mismatch / low-quality detection) runs on every call so the
 * user always sees a proper error — but the API call itself happens at most
 * once per unique (docId, file) pair.
 */

const STORAGE_KEY = 'rcready:ai-cache:v1';

function loadFromStorage(): Map<string, unknown> {
  if (typeof sessionStorage === 'undefined') return new Map();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function persistToStorage(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(cache)));
  } catch {
    /* quota exceeded or storage disabled — best effort only */
  }
}

const cache: Map<string, unknown> = loadFromStorage();

export async function fileHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  const bytes = new Uint8Array(digest);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

const keyOf = (docId: string, hash: string): string => `${docId}:${hash}`;

export function getCachedRaw<T>(docId: string, hash: string): T | undefined {
  return cache.get(keyOf(docId, hash)) as T | undefined;
}

export function setCachedRaw<T>(docId: string, hash: string, value: T): void {
  cache.set(keyOf(docId, hash), value);
  persistToStorage();
}

export function clearCache(): void {
  cache.clear();
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }
}

export function cacheSize(): number {
  return cache.size;
}
