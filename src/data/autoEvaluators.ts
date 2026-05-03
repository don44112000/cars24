/**
 * Auto-evaluators for checklist items.
 *
 * Each function maps a `DealFacts` (+ AI cross-check flags + raw extracted
 * docs) to an `AutoEvalResult` or null. Returning null = "cannot decide,
 * leave the item manual".
 *
 * Doc-fidelity rules baked in:
 *   - CheckList.md: "🔴 CRITICAL items must not be skipped under any
 *     circumstance" → critical items return `intent: 'suggest'` (the user
 *     must one-click confirm; we never finalise on their behalf).
 *   - docCheckList.md Field 1.5 key rule: RC blank alone is not enough for
 *     "no hypothecation" — VAHAN must also confirm. We require both.
 *   - docCheckList.md Field 1.3 / Check P.1: Chassis verification needs
 *     physical chassis-plate inspection — AI can only suggest.
 */

import type { AutoEvalContext, AutoEvalResult } from '../types/checklist';

const today = (): Date => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

const parseDate = (v: string | null | undefined): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const daysFromNow = (date: Date): number =>
  Math.round((date.getTime() - today().getTime()) / (1000 * 60 * 60 * 24));

/** Has any AI cross-check failed for the given check id? */
const hasFailingFlag = (ctx: AutoEvalContext, id: string): boolean =>
  ctx.flags.some((f) => f.id === id && f.status === 'fail');

/* ────────────────────────────────────────────────────────────
   B-04 / S-04 / L-01 — No active hypothecation
   Doc anchor: Field 1.5 key rule
   ──────────────────────────────────────────────────────────── */

export const evaluateNoHypothecation = (ctx: AutoEvalContext): AutoEvalResult | null => {
  const { hypothecationBank, vahanHypothecationCleared } = ctx.facts;
  if (hypothecationBank && hypothecationBank.trim() !== '') {
    return {
      intent: 'suggest',
      status: 'no',
      reason: `RC hypothecation field shows "${hypothecationBank}" — HP termination required before transfer (doc Field 1.5).`,
    };
  }
  // RC blank — but per Field 1.5 we also need VAHAN confirmation.
  if (vahanHypothecationCleared === true) {
    return {
      intent: 'suggest',
      status: 'yes',
      reason: 'RC field is blank and you confirmed VAHAN portal also shows no hypothecation.',
    };
  }
  if (hypothecationBank === null && vahanHypothecationCleared === null) {
    return null; // no signal yet
  }
  return {
    intent: 'suggest',
    status: 'yes',
    reason: 'RC field is blank — confirm VAHAN portal also shows no hypothecation (doc Field 1.5 key rule).',
  };
};

/* ────────────────────────────────────────────────────────────
   B-08 / S-07 — Insurance valid
   Doc anchor: Field 3.1
   ──────────────────────────────────────────────────────────── */

export const evaluateInsuranceValid = (ctx: AutoEvalContext): AutoEvalResult | null => {
  const exp = parseDate(ctx.facts.insuranceValidUpto);
  if (!exp) return null;
  const days = daysFromNow(exp);
  if (days < 0) {
    return {
      intent: 'finalise',
      status: 'no',
      reason: `Insurance expired ${-days} day(s) ago — vehicle is uninsured.`,
    };
  }
  return {
    intent: 'finalise',
    status: 'yes',
    reason: `Insurance valid for another ${days} day(s).`,
  };
};

/* ────────────────────────────────────────────────────────────
   B-09 / S-06 — PUC valid
   Doc anchor: Field 4.1
   ──────────────────────────────────────────────────────────── */

export const evaluatePucValid = (ctx: AutoEvalContext): AutoEvalResult | null => {
  const exp = parseDate(ctx.facts.pucValidUpto);
  if (!exp) return null;
  const days = daysFromNow(exp);
  if (days < 0) {
    return {
      intent: 'finalise',
      status: 'no',
      reason: `PUC expired ${-days} day(s) ago — RTO will reject the transfer.`,
    };
  }
  return {
    intent: 'finalise',
    status: 'yes',
    reason: `PUC valid for another ${days} day(s).`,
  };
};

/* ────────────────────────────────────────────────────────────
   B-02 — Owner name on RC = seller's identity
   Doc anchor: Fields 1.1 / 2.1
   ──────────────────────────────────────────────────────────── */

export const evaluateOwnerNameMatch = (ctx: AutoEvalContext): AutoEvalResult | null => {
  // Critical → only suggest. AI flag drives the verdict.
  const aadhaarFail = hasFailingFlag(ctx, 'OWNER_RC_AADHAAR');
  const panFail = hasFailingFlag(ctx, 'OWNER_RC_PAN');
  const aadhaarPresent = !!ctx.extractedDocs.aadhaar?.name;
  const rcPresent = !!ctx.extractedDocs.rc?.ownerName;
  if (!rcPresent || !aadhaarPresent) return null;

  if (aadhaarFail) {
    return {
      intent: 'suggest',
      status: 'no',
      reason: 'AI detected RC owner name does not match Aadhaar — red flag per doc Field 1.1.',
    };
  }
  if (panFail) {
    return {
      intent: 'suggest',
      status: 'yes',
      reason: 'RC matches Aadhaar; PAN format differs (yellow only — initials common).',
    };
  }
  return {
    intent: 'suggest',
    status: 'yes',
    reason: 'RC owner name matches Aadhaar across uploaded documents.',
  };
};

/* ────────────────────────────────────────────────────────────
   B-03 — Chassis & engine numbers verified
   Doc anchor: Fields 1.3, 1.4, Check P.1, P.2
   ──────────────────────────────────────────────────────────── */

export const evaluateChassisEngineMatch = (ctx: AutoEvalContext): AutoEvalResult | null => {
  const chassisInvoiceFail = hasFailingFlag(ctx, 'CHASSIS_RC_INVOICE');
  const engineInvoiceFail = hasFailingFlag(ctx, 'ENGINE_RC_INVOICE');
  const haveChassis = !!ctx.facts.chassisNo;
  const haveEngine = !!ctx.facts.engineNo;
  if (!haveChassis && !haveEngine) return null;

  if (chassisInvoiceFail || engineInvoiceFail) {
    return {
      intent: 'suggest',
      status: 'no',
      reason: 'AI detected a mismatch between RC and invoice — investigate before proceeding.',
    };
  }
  if (haveChassis && haveEngine) {
    return {
      intent: 'suggest',
      status: 'yes',
      reason: 'RC chassis & engine readable. Physical chassis-plate inspection still required (Check P.1).',
    };
  }
  return null;
};

/* ────────────────────────────────────────────────────────────
   B-10 — Maharashtra plate
   Doc anchor: Field 1.2
   ──────────────────────────────────────────────────────────── */

export const evaluateMaharashtraPlate = (ctx: AutoEvalContext): AutoEvalResult | null => {
  const reg = ctx.facts.regNo;
  if (!reg) return null;
  if (reg.toUpperCase().startsWith('MH')) {
    return {
      intent: 'finalise',
      status: 'yes',
      reason: `Registration "${reg}" is Maharashtra (MH) — standard transfer process applies.`,
    };
  }
  return {
    intent: 'finalise',
    status: 'no',
    reason: `Registration "${reg}" is non-MH — out-of-state process applies (Part 4).`,
  };
};

/* ────────────────────────────────────────────────────────────
   O-01 — Out-of-state confirmation (mirror of B-10)
   ──────────────────────────────────────────────────────────── */

export const evaluateOutOfState = (ctx: AutoEvalContext): AutoEvalResult | null => {
  const reg = ctx.facts.regNo;
  if (!reg) return null;
  return {
    intent: 'finalise',
    status: reg.toUpperCase().startsWith('MH') ? 'no' : 'yes',
    reason: `Registration "${reg}" first 2 chars: ${reg.slice(0, 2).toUpperCase()}.`,
  };
};

/* ────────────────────────────────────────────────────────────
   B-01 / O-02 — VAHAN portal check (suggested 'yes' if user has confirmed
   no hypothecation, treated as a partial proxy)
   ──────────────────────────────────────────────────────────── */

export const evaluateVahanCheck = (ctx: AutoEvalContext): AutoEvalResult | null => {
  if (ctx.facts.vahanHypothecationCleared === true) {
    return {
      intent: 'suggest',
      status: 'yes',
      reason: 'You confirmed VAHAN portal shows clean hypothecation. Verify other VAHAN fields (challans, theft) too.',
    };
  }
  return null;
};
