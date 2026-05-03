/**
 * Cross-document checks derived from docs/docCheckList.md (the Master
 * Cross-Match Matrix and per-document field tables).
 *
 * Each check returns a `CheckResult`:
 *   - `status`: 'pass' | 'fail' | 'skipped'
 *     - 'skipped' = required inputs missing (cannot evaluate)
 *   - `severity`: 'red' | 'yellow' | 'info' — matches the doc's flag system.
 *   - `message`: short user-facing explanation.
 *
 * Physical-only checks (raised ink, hologram, lamination, panel gaps, HSRP
 * fastener type, ink texture) are deliberately omitted — they cannot be
 * decided from a single uploaded image.
 */

import type { ExtractedSet, ServiceEntry } from './documents';

export type Severity = 'red' | 'yellow' | 'info';
export type Status = 'pass' | 'fail' | 'skipped';

export interface CheckResult {
  id: string;
  /** Map back to the docCheckList field number, e.g. "1.1" or "P.6". */
  origin: string;
  title: string;
  severity: Severity;
  status: Status;
  message: string;
  /** Documents involved in the comparison. */
  involved: string[];
}

/* ---------- normalization helpers ---------- */

const isMissing = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

const NO_HYPO_TOKENS = new Set(['', 'NA', 'N.A', 'N/A', 'NIL', 'NONE', '-', '--']);

const normalizeBank = (v: string | null): string | null => {
  if (isMissing(v)) return null;
  const cleaned = v!.trim().toUpperCase();
  if (NO_HYPO_TOKENS.has(cleaned.replace(/[\s.]+/g, ''))) return null;
  return cleaned.replace(/\s+/g, ' ').replace(/\bLTD\.?\b|\bLIMITED\b/g, '').trim();
};

const normalizeName = (v: string | null): string | null => {
  if (isMissing(v)) return null;
  return v!.trim().toUpperCase().replace(/[.,]/g, '').replace(/\s+/g, ' ');
};

const normalizeAlnum = (v: string | null): string | null => {
  if (isMissing(v)) return null;
  return v!.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const namesEqual = (a: string | null, b: string | null): boolean | null => {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return null;
  return na === nb;
};

const alnumEqual = (a: string | null, b: string | null): boolean | null => {
  const na = normalizeAlnum(a);
  const nb = normalizeAlnum(b);
  if (!na || !nb) return null;
  return na === nb;
};

const banksEqual = (a: string | null, b: string | null): boolean | null => {
  const na = normalizeBank(a);
  const nb = normalizeBank(b);
  if (!na || !nb) return null;
  return na === nb || na.includes(nb) || nb.includes(na);
};

const parseDate = (v: string | null): Date | null => {
  if (isMissing(v)) return null;
  const d = new Date(v!);
  return Number.isNaN(d.getTime()) ? null : d;
};

const daysBetween = (a: Date, b: Date): number =>
  Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

const today = (): Date => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

/* ---------- builders ---------- */

const skipped = (
  id: string,
  origin: string,
  title: string,
  severity: Severity,
  involved: string[],
  reason: string,
): CheckResult => ({
  id,
  origin,
  title,
  severity,
  status: 'skipped',
  message: `Cannot evaluate — ${reason}.`,
  involved,
});

const result = (
  id: string,
  origin: string,
  title: string,
  severity: Severity,
  involved: string[],
  passed: boolean,
  passMsg: string,
  failMsg: string,
): CheckResult => ({
  id,
  origin,
  title,
  severity,
  status: passed ? 'pass' : 'fail',
  message: passed ? passMsg : failMsg,
  involved,
});

/* ---------- check helpers ---------- */

function compareName(
  id: string,
  origin: string,
  title: string,
  severity: Severity,
  involved: string[],
  a: string | null | undefined,
  b: string | null | undefined,
  labelA: string,
  labelB: string,
): CheckResult {
  if (isMissing(a) || isMissing(b)) {
    return skipped(id, origin, title, severity, involved, `${labelA} or ${labelB} missing`);
  }
  const eq = namesEqual(a as string, b as string);
  return result(
    id,
    origin,
    title,
    severity,
    involved,
    eq === true,
    `${labelA} matches ${labelB}.`,
    `${labelA} "${a}" does not match ${labelB} "${b}".`,
  );
}

function compareAlnum(
  id: string,
  origin: string,
  title: string,
  severity: Severity,
  involved: string[],
  a: string | null | undefined,
  b: string | null | undefined,
  labelA: string,
  labelB: string,
): CheckResult {
  if (isMissing(a) || isMissing(b)) {
    return skipped(id, origin, title, severity, involved, `${labelA} or ${labelB} missing`);
  }
  const eq = alnumEqual(a as string, b as string);
  return result(
    id,
    origin,
    title,
    severity,
    involved,
    eq === true,
    `${labelA} matches ${labelB}.`,
    `${labelA} "${a}" does not match ${labelB} "${b}".`,
  );
}

/* ---------- service-history odometer logic ---------- */

function odometerSequenceCheck(entries: ServiceEntry[]): {
  monotonic: boolean;
  firstViolationIndex: number | null;
} {
  let last = -Infinity;
  for (let i = 0; i < entries.length; i++) {
    const km = entries[i].odometerKm;
    if (km == null) continue;
    if (km < last) return { monotonic: false, firstViolationIndex: i };
    last = km;
  }
  return { monotonic: true, firstViolationIndex: null };
}

function dateOrderCheck(entries: ServiceEntry[]): boolean {
  let last = -Infinity;
  for (const e of entries) {
    const d = parseDate(e.date);
    if (!d) continue;
    if (d.getTime() < last) return false;
    last = d.getTime();
  }
  return true;
}

/* ---------- main entrypoint ---------- */

export function runChecks(extracted: ExtractedSet): CheckResult[] {
  const checks: CheckResult[] = [];
  const rc = extracted.rc;
  const aadhaar = extracted.aadhaar;
  const pan = extracted.pan;
  const ins = extracted.insurance;
  const puc = extracted.puc;
  const noc = extracted.bankNoc;
  const f35 = extracted.form35;
  const inv = extracted.invoice;
  const sb = extracted.serviceBook;

  /* ---------- Owner identity chain (Field 1.1, 2.1, 5.2) ---------- */

  if (rc && aadhaar) {
    checks.push(
      compareName(
        'OWNER_RC_AADHAAR',
        '1.1 / 2.1',
        'RC owner name = Aadhaar name',
        'red',
        ['rc', 'aadhaar'],
        rc.ownerName,
        aadhaar.name,
        'RC owner',
        'Aadhaar name',
      ),
    );
  }
  if (rc && pan) {
    checks.push(
      compareName(
        'OWNER_RC_PAN',
        '1.1',
        'RC owner name = PAN name',
        'yellow',
        ['rc', 'pan'],
        rc.ownerName,
        pan.name,
        'RC owner',
        'PAN name',
      ),
    );
  }
  if (aadhaar && pan) {
    checks.push(
      compareName(
        'AADHAAR_PAN',
        '2.1',
        'Aadhaar name = PAN name',
        'yellow',
        ['aadhaar', 'pan'],
        aadhaar.name,
        pan.name,
        'Aadhaar name',
        'PAN name',
      ),
    );
  }
  if (rc && ins) {
    checks.push(
      compareName(
        'OWNER_RC_INSURANCE',
        '1.1 / 3.2',
        'RC owner name = Insurance insured name',
        'yellow',
        ['rc', 'insurance'],
        rc.ownerName,
        ins.insuredName,
        'RC owner',
        'Insurance insured',
      ),
    );
  }
  if (rc && noc) {
    checks.push(
      compareName(
        'OWNER_RC_NOC',
        '1.1 / 5.2',
        'RC owner name = Bank NOC owner name',
        'red',
        ['rc', 'bankNoc'],
        rc.ownerName,
        noc.ownerName,
        'RC owner',
        'NOC owner',
      ),
    );
  }
  if (rc && f35) {
    checks.push(
      compareName(
        'OWNER_RC_FORM35',
        '5 / Form 35',
        'RC owner name = Form 35 owner name',
        'red',
        ['rc', 'form35'],
        rc.ownerName,
        f35.ownerName,
        'RC owner',
        'Form 35 owner',
      ),
    );
  }

  /* ---------- Registration number (Field 1.2) ---------- */

  if (rc && ins) {
    checks.push(
      compareAlnum(
        'REG_RC_INSURANCE',
        '1.2 / 3.3',
        'Registration number = Insurance reg no.',
        'red',
        ['rc', 'insurance'],
        rc.registrationNumber,
        ins.registrationNumber,
        'RC reg no.',
        'Insurance reg no.',
      ),
    );
  }
  if (rc && puc) {
    checks.push(
      compareAlnum(
        'REG_RC_PUC',
        '1.2 / 4.2',
        'Registration number = PUC reg no.',
        'red',
        ['rc', 'puc'],
        rc.registrationNumber,
        puc.registrationNumber,
        'RC reg no.',
        'PUC reg no.',
      ),
    );
  }
  if (rc && noc) {
    checks.push(
      compareAlnum(
        'REG_RC_NOC',
        '1.2 / 5.3',
        'Registration number = Bank NOC reg no.',
        'red',
        ['rc', 'bankNoc'],
        rc.registrationNumber,
        noc.registrationNumber,
        'RC reg no.',
        'NOC reg no.',
      ),
    );
  }
  if (rc && f35) {
    checks.push(
      compareAlnum(
        'REG_RC_FORM35',
        '1.2 / Form 35',
        'Registration number = Form 35 reg no.',
        'red',
        ['rc', 'form35'],
        rc.registrationNumber,
        f35.registrationNumber,
        'RC reg no.',
        'Form 35 reg no.',
      ),
    );
  }

  /* ---------- Chassis number (Field 1.3, 6.1, 7.1) ---------- */

  if (rc && inv) {
    checks.push(
      compareAlnum(
        'CHASSIS_RC_INVOICE',
        '1.3 / 6.1',
        'Chassis number = Invoice chassis',
        'red',
        ['rc', 'invoice'],
        rc.chassisNumber,
        inv.chassisNumber,
        'RC chassis',
        'Invoice chassis',
      ),
    );
  }
  if (rc && ins && !isMissing(ins.chassisNumber)) {
    checks.push(
      compareAlnum(
        'CHASSIS_RC_INSURANCE',
        '1.3 / 3.3',
        'Chassis number = Insurance chassis',
        'red',
        ['rc', 'insurance'],
        rc.chassisNumber,
        ins.chassisNumber,
        'RC chassis',
        'Insurance chassis',
      ),
    );
  }
  if (rc && noc && !isMissing(noc.chassisNumber)) {
    checks.push(
      compareAlnum(
        'CHASSIS_RC_NOC',
        '1.3',
        'Chassis number = Bank NOC chassis',
        'red',
        ['rc', 'bankNoc'],
        rc.chassisNumber,
        noc.chassisNumber,
        'RC chassis',
        'NOC chassis',
      ),
    );
  }
  if (rc && sb && !isMissing(sb.chassisNumber)) {
    checks.push(
      compareAlnum(
        'CHASSIS_RC_SERVICEBOOK',
        '7.1',
        'Chassis number = Service book VIN',
        'yellow',
        ['rc', 'serviceBook'],
        rc.chassisNumber,
        sb.chassisNumber,
        'RC chassis',
        'Service book VIN',
      ),
    );
  }

  /* ---------- Engine number (Field 1.4, 6.1) ---------- */

  if (rc && inv) {
    checks.push(
      compareAlnum(
        'ENGINE_RC_INVOICE',
        '1.4 / 6.1',
        'Engine number = Invoice engine',
        'red',
        ['rc', 'invoice'],
        rc.engineNumber,
        inv.engineNumber,
        'RC engine',
        'Invoice engine',
      ),
    );
  }

  /* ---------- Hypothecation chain (Field 1.5) ---------- */

  if (rc) {
    const rcBank = normalizeBank(rc.hypothecationBank);
    if (noc) {
      if (!rcBank && !normalizeBank(noc.bankName)) {
        // No hypothecation, no NOC — vacuously consistent; skip.
      } else if (!rcBank) {
        checks.push({
          id: 'HYPO_RC_NOC',
          origin: '1.5 / 5.4',
          title: 'RC hypothecation = Bank NOC issuer',
          severity: 'yellow',
          status: 'fail',
          message: 'RC shows no hypothecation but a bank NOC was uploaded — confirm whether HP termination has already been completed.',
          involved: ['rc', 'bankNoc'],
        });
      } else {
        const eq = banksEqual(rc.hypothecationBank, noc.bankName);
        if (eq === null) {
          checks.push(skipped('HYPO_RC_NOC', '1.5 / 5.4', 'RC hypothecation = Bank NOC issuer', 'red', ['rc', 'bankNoc'], 'bank name unreadable'));
        } else {
          checks.push(
            result(
              'HYPO_RC_NOC',
              '1.5 / 5.4',
              'RC hypothecation = Bank NOC issuer',
              'red',
              ['rc', 'bankNoc'],
              eq,
              `Hypothecation bank "${rc.hypothecationBank}" matches NOC bank.`,
              `RC hypothecation "${rc.hypothecationBank}" does not match NOC bank "${noc.bankName}". NOC cannot be used for HP termination.`,
            ),
          );
        }
      }
    }
    if (f35 && rcBank) {
      const eq = banksEqual(rc.hypothecationBank, f35.financierName);
      if (eq === null) {
        checks.push(skipped('HYPO_RC_FORM35', '1.5 / Form 35', 'RC hypothecation = Form 35 financier', 'red', ['rc', 'form35'], 'financier name unreadable'));
      } else {
        checks.push(
          result(
            'HYPO_RC_FORM35',
            '1.5 / Form 35',
            'RC hypothecation = Form 35 financier',
            'red',
            ['rc', 'form35'],
            eq,
            `Form 35 financier matches RC hypothecation.`,
            `RC hypothecation "${rc.hypothecationBank}" does not match Form 35 financier "${f35.financierName}".`,
          ),
        );
      }
    }
    if (ins && rcBank) {
      const eq = banksEqual(rc.hypothecationBank, ins.hypothecationBank);
      if (eq === null) {
        checks.push(skipped('HYPO_RC_INSURANCE', '1.5 / 3.4', 'RC hypothecation = Insurance endorsement', 'yellow', ['rc', 'insurance'], 'insurance endorsement unreadable'));
      } else {
        checks.push(
          result(
            'HYPO_RC_INSURANCE',
            '1.5 / 3.4',
            'RC hypothecation = Insurance endorsement',
            'yellow',
            ['rc', 'insurance'],
            eq,
            `Insurance endorsement matches RC hypothecation.`,
            `Insurance endorsement bank "${ins.hypothecationBank}" does not match RC hypothecation "${rc.hypothecationBank}".`,
          ),
        );
      }
    }
  }

  /* ---------- Fuel type (Field 1.6, 4.3) ---------- */

  if (rc && puc) {
    if (isMissing(rc.fuelType) || isMissing(puc.fuelType)) {
      checks.push(skipped('FUEL_RC_PUC', '1.6 / 4.3', 'RC fuel type = PUC fuel type', 'red', ['rc', 'puc'], 'fuel type missing'));
    } else {
      const eq = normalizeName(rc.fuelType) === normalizeName(puc.fuelType);
      checks.push(
        result(
          'FUEL_RC_PUC',
          '1.6 / 4.3',
          'RC fuel type = PUC fuel type',
          'red',
          ['rc', 'puc'],
          eq,
          'Fuel type consistent across RC and PUC.',
          `Fuel mismatch: RC "${rc.fuelType}" vs PUC "${puc.fuelType}".`,
        ),
      );
    }
  }

  /* ---------- Validity dates (Field 1.7, 3.1, 4.1, 5.1) ---------- */

  const now = today();

  if (rc) {
    const exp = parseDate(rc.registrationValidUpto);
    if (exp) {
      const days = daysBetween(exp, now);
      checks.push({
        id: 'RC_VALIDITY',
        origin: '1.7',
        title: 'RC registration not expired',
        severity: days < 0 ? 'yellow' : days < 30 ? 'yellow' : 'info',
        status: days < 0 ? 'fail' : 'pass',
        message:
          days < 0
            ? `Registration expired ${-days} day(s) ago.`
            : days < 30
            ? `Registration expires in ${days} day(s) — renew before transfer.`
            : `Registration valid for another ${days} day(s).`,
        involved: ['rc'],
      });
    }
  }

  if (ins) {
    const to = parseDate(ins.validTo);
    if (to) {
      const days = daysBetween(to, now);
      checks.push({
        id: 'INSURANCE_VALIDITY',
        origin: '3.1',
        title: 'Insurance currently valid',
        severity: 'red',
        status: days < 0 ? 'fail' : 'pass',
        message:
          days < 0
            ? `Insurance expired ${-days} day(s) ago — vehicle is uninsured. Must renew before handover.`
            : `Insurance valid for another ${days} day(s).`,
        involved: ['insurance'],
      });
    }
  }

  if (puc) {
    const exp = parseDate(puc.validUpto);
    if (exp) {
      const days = daysBetween(exp, now);
      checks.push({
        id: 'PUC_VALIDITY',
        origin: '4.1',
        title: 'PUC currently valid',
        severity: 'red',
        status: days < 0 ? 'fail' : 'pass',
        message:
          days < 0
            ? `PUC expired ${-days} day(s) ago — RTO will reject the transfer.`
            : `PUC valid for another ${days} day(s).`,
        involved: ['puc'],
      });
    }
  }

  if (noc) {
    const issued = parseDate(noc.issueDate);
    if (issued) {
      const ageDays = daysBetween(now, issued);
      checks.push({
        id: 'NOC_FRESHNESS',
        origin: '5.1',
        title: 'Bank NOC issued within 90 days',
        severity: 'red',
        status: ageDays > 90 ? 'fail' : 'pass',
        message:
          ageDays > 90
            ? `NOC is ${ageDays} day(s) old — exceeds the 90-day validity. Seller must obtain a fresh NOC.`
            : `NOC issued ${ageDays} day(s) ago — within the 90-day window.`,
        involved: ['bankNoc'],
      });
    }
  }

  /* ---------- Form 35 signatures (Field 5.5) ---------- */

  if (f35) {
    if (f35.sellerSignaturePresent === false || f35.bankSignaturePresent === false) {
      checks.push({
        id: 'FORM35_SIGNATURES',
        origin: 'Form 35',
        title: 'Form 35 signed by both seller and bank',
        severity: 'red',
        status: 'fail',
        message: `Form 35 missing ${f35.sellerSignaturePresent === false ? 'seller signature' : ''}${f35.sellerSignaturePresent === false && f35.bankSignaturePresent === false ? ' and ' : ''}${f35.bankSignaturePresent === false ? 'bank signature' : ''}. RTO will reject.`,
        involved: ['form35'],
      });
    } else if (f35.sellerSignaturePresent && f35.bankSignaturePresent) {
      checks.push({
        id: 'FORM35_SIGNATURES',
        origin: 'Form 35',
        title: 'Form 35 signed by both seller and bank',
        severity: 'red',
        status: 'pass',
        message: 'Both signatures detected on Form 35.',
        involved: ['form35'],
      });
    } else {
      checks.push(skipped('FORM35_SIGNATURES', 'Form 35', 'Form 35 signed by both seller and bank', 'red', ['form35'], 'signature presence not determinable from image'));
    }
  }

  /* ---------- PAN 4th character (Field 2.4) ---------- */

  if (pan && !isMissing(pan.fourthCharacter)) {
    const c = pan.fourthCharacter!.toUpperCase();
    const isIndividual = c === 'P';
    checks.push({
      id: 'PAN_HOLDER_TYPE',
      origin: '2.4',
      title: 'PAN belongs to an individual',
      severity: isIndividual ? 'info' : 'red',
      status: isIndividual ? 'pass' : 'fail',
      message: isIndividual
        ? 'PAN 4th character is "P" (individual).'
        : `PAN 4th character is "${c}" — not an individual. If buying from a company, demand a Board Resolution authorising the sale.`,
      involved: ['pan'],
    });
  }

  /* ---------- Owner serial number consistency (Field 1.8 / 6.3) ---------- */

  if (rc && inv && rc.ownerSerialNumber === 1) {
    checks.push(
      compareName(
        'INVOICE_BUYER_FIRST_OWNER',
        '1.8 / 6.3',
        'First-owner: Invoice buyer = RC owner',
        'yellow',
        ['rc', 'invoice'],
        rc.ownerName,
        inv.buyerName,
        'RC owner',
        'Invoice buyer',
      ),
    );
  }

  /* ---------- Service-book odometer consistency (Field 7.2 / P.6) ---------- */

  if (sb && sb.entries.length > 0) {
    const seq = odometerSequenceCheck(sb.entries);
    checks.push({
      id: 'ODOMETER_MONOTONIC',
      origin: '7.2 / P.6',
      title: 'Service book odometer readings increase monotonically',
      severity: 'red',
      status: seq.monotonic ? 'pass' : 'fail',
      message: seq.monotonic
        ? 'All readable odometer entries increase across services.'
        : `Odometer drops at entry #${(seq.firstViolationIndex ?? 0) + 1} — possible tampering.`,
      involved: ['serviceBook'],
    });

    const dateOk = dateOrderCheck(sb.entries);
    checks.push({
      id: 'SERVICE_DATE_ORDER',
      origin: '7.3',
      title: 'Service entry dates are in chronological order',
      severity: 'red',
      status: dateOk ? 'pass' : 'fail',
      message: dateOk
        ? 'Service dates progress chronologically.'
        : 'Service dates are out of order — possible forged or backdated stamps.',
      involved: ['serviceBook'],
    });
  }

  /* ---------- Make/Model + Colour (Field 1.6) ---------- */

  if (rc && ins) {
    checks.push(
      compareName(
        'MAKEMODEL_RC_INSURANCE',
        '1.6',
        'Make/Model = Insurance vehicle',
        'yellow',
        ['rc', 'insurance'],
        rc.makeModel,
        ins.makeModel,
        'RC make/model',
        'Insurance make/model',
      ),
    );
  }
  if (rc && inv) {
    if (!isMissing(rc.colour) && !isMissing(inv.colour)) {
      const eq = namesEqual(rc.colour, inv.colour);
      checks.push(
        result(
          'COLOUR_RC_INVOICE',
          '1.6 / P.5',
          'RC colour = Invoice colour',
          'yellow',
          ['rc', 'invoice'],
          eq === true,
          'Colour matches between RC and invoice.',
          `Colour mismatch: RC "${rc.colour}" vs Invoice "${inv.colour}". Possible respray.`,
        ),
      );
    }
  }

  return checks;
}

/* ---------- summary helpers ---------- */

export interface CheckSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  redFails: number;
  yellowFails: number;
}

export function summarise(checks: CheckResult[]): CheckSummary {
  const s: CheckSummary = {
    total: checks.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    redFails: 0,
    yellowFails: 0,
  };
  for (const c of checks) {
    if (c.status === 'pass') s.passed++;
    else if (c.status === 'skipped') s.skipped++;
    else {
      s.failed++;
      if (c.severity === 'red') s.redFails++;
      else if (c.severity === 'yellow') s.yellowFails++;
    }
  }
  return s;
}
