// Indian RC plate: 2 letters (state) + 2 digits (RTO) + 1–3 letters (series) + 4 digits (number).
// Total length 9–11 characters once whitespace and punctuation are stripped.
export const REG_NO_PATTERN = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}$/;

const REG_NO_MAX_LEN = 11;

export function stripRegNo(v: string): string {
  return v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, REG_NO_MAX_LEN);
}

export function isValidRegNo(v: string): boolean {
  return REG_NO_PATTERN.test(stripRegNo(v));
}

// Chunk by character class (letters vs digits) so 1-, 2-, and 3-letter series
// all format correctly: MH12A1234 → "MH 12 A 1234", MH12ABC1234 → "MH 12 ABC 1234".
export function formatRegNo(raw: string): string {
  const c = stripRegNo(raw);
  if (!c) return '';
  const groups: string[] = [];
  let buf = '';
  let bufClass: 'A' | 'D' | null = null;
  for (const ch of c) {
    const cls: 'A' | 'D' = /\d/.test(ch) ? 'D' : 'A';
    if (cls === bufClass) {
      buf += ch;
    } else {
      if (buf) groups.push(buf);
      buf = ch;
      bufClass = cls;
    }
  }
  if (buf) groups.push(buf);
  return groups.join(' ');
}

export function diagnoseRegNo(value: string): string | null {
  if (!value) return null;
  const c = stripRegNo(value);
  if (REG_NO_PATTERN.test(c)) return null;
  if (c.length < 9) return `Need at least 9 characters (you have ${c.length}).`;
  if (!/^[A-Z]{2}/.test(c)) return 'First 2 must be letters (state code, e.g. MH).';
  if (!/^[A-Z]{2}\d{2}/.test(c)) return 'Position 3–4 must be digits (RTO code).';
  if (!/^[A-Z]{2}\d{2}[A-Z]/.test(c)) return 'After RTO code, 1–3 series letters are required.';
  if (!/^[A-Z]{2}\d{2}[A-Z]{1,3}\d/.test(c)) return 'Series can be at most 3 letters.';
  return 'Last 4 characters must be digits.';
}

export function isValidMobile(v: string): boolean {
  return /^[6-9]\d{9}$/.test(v);
}

export function isValidAge(v: string): boolean {
  if (!v) return false;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 18 && n <= 120;
}
