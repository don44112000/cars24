/**
 * Pure helpers that move data between the three feature islands.
 *
 *   factsFromExtraction(extracted)        → DealFacts
 *   prefillFormAnswers(answers, facts)    → WizardAnswers (overlay facts onto form state)
 *
 * Writing each fact once and propagating it everywhere is what makes
 * "facts entered once, used everywhere" possible.
 */

import type { ExtractedSet } from '../services/ai/documents';
import type { DealFacts, FactSource } from '../types/checklist';
import { emptyDealFacts, emptyFactSource } from '../types/checklist';
import type { WizardAnswers } from './formGenerator';

const firstNonEmpty = (...values: Array<string | null | undefined>): string | null => {
  for (const v of values) {
    if (v && v.trim() !== '') return v.trim();
  }
  return null;
};

/**
 * Flatten the per-document `ExtractedSet` into a single DealFacts shape.
 * RC is the authoritative source for most fields; other docs back-fill.
 */
export function factsFromExtraction(extracted: ExtractedSet): {
  facts: DealFacts;
  source: Record<keyof DealFacts, FactSource>;
} {
  const facts = emptyDealFacts();
  const source = emptyFactSource();

  const rc = extracted.rc;
  const inv = extracted.invoice;
  const ins = extracted.insurance;
  const puc = extracted.puc;
  const noc = extracted.bankNoc;

  // Registration number — RC is canonical, all others should match it.
  const reg = firstNonEmpty(
    rc?.registrationNumber,
    ins?.registrationNumber,
    puc?.registrationNumber,
    noc?.registrationNumber,
  );
  if (reg) {
    facts.regNo = reg.toUpperCase().replace(/\s+/g, '');
    source.regNo = 'extracted';
  }

  // Chassis — RC > invoice > insurance > NOC.
  const chassis = firstNonEmpty(
    rc?.chassisNumber,
    inv?.chassisNumber,
    ins?.chassisNumber,
    noc?.chassisNumber,
  );
  if (chassis) {
    facts.chassisNo = chassis.toUpperCase().replace(/\s+/g, '');
    source.chassisNo = 'extracted';
  }

  // Engine — RC > invoice.
  const engine = firstNonEmpty(rc?.engineNumber, inv?.engineNumber);
  if (engine) {
    facts.engineNo = engine.toUpperCase().replace(/\s+/g, '');
    source.engineNo = 'extracted';
  }

  // Owner name — RC owner is primary.
  const owner = firstNonEmpty(rc?.ownerName, ins?.insuredName, noc?.ownerName);
  if (owner) {
    facts.ownerName = owner;
    source.ownerName = 'extracted';
  }

  // Hypothecation bank — RC is primary.
  if (rc?.hypothecationBank && rc.hypothecationBank.trim() !== '') {
    facts.hypothecationBank = rc.hypothecationBank.trim();
    source.hypothecationBank = 'extracted';
  } else if (noc?.bankName) {
    // RC blank but NOC present — store the NOC bank as advisory.
    facts.hypothecationBank = noc.bankName.trim();
    source.hypothecationBank = 'extracted';
  }

  // Fuel — RC > PUC.
  const fuel = firstNonEmpty(rc?.fuelType, puc?.fuelType);
  if (fuel) {
    facts.fuelType = fuel;
    source.fuelType = 'extracted';
  }

  if (ins?.validTo) {
    facts.insuranceValidUpto = ins.validTo;
    source.insuranceValidUpto = 'extracted';
  }
  if (puc?.validUpto) {
    facts.pucValidUpto = puc.validUpto;
    source.pucValidUpto = 'extracted';
  }

  return { facts, source };
}

/**
 * Merge two DealFacts records — `manual` wins over `extracted` when present,
 * but `extracted` fills holes manual didn't fill.
 *
 * Used when the user enters something manually after AI has already
 * populated facts — their input takes priority.
 */
export function mergeFacts(
  base: DealFacts,
  baseSource: Record<keyof DealFacts, FactSource>,
  patch: Partial<DealFacts>,
  patchSource: FactSource,
): { facts: DealFacts; source: Record<keyof DealFacts, FactSource> } {
  const facts = { ...base };
  const source = { ...baseSource };
  (Object.keys(patch) as Array<keyof DealFacts>).forEach((key) => {
    const val = patch[key];
    if (val !== undefined && val !== null && val !== '') {
      // assignment is safe: patch[key] ⊆ DealFacts[key] by Partial<DealFacts>
      (facts[key] as DealFacts[typeof key]) = val as DealFacts[typeof key];
      source[key] = patchSource;
    }
  });
  return { facts, source };
}

/**
 * Overlay DealFacts onto an existing WizardAnswers without clobbering anything
 * the user has already typed. Only fills empty slots.
 */
export function prefillFormAnswers(
  answers: WizardAnswers,
  facts: DealFacts,
): WizardAnswers {
  const next: WizardAnswers = { ...answers };
  if (!next.regNo && facts.regNo) next.regNo = facts.regNo;
  if (!next.chassisNo && facts.chassisNo) next.chassisNo = facts.chassisNo;
  if (!next.engineNo && facts.engineNo) next.engineNo = facts.engineNo;
  if (!next.ownerName && facts.ownerName) next.ownerName = facts.ownerName;
  if (!next.bankName && facts.hypothecationBank) next.bankName = facts.hypothecationBank;
  return next;
}

/**
 * Quick check: are there any extracted facts at all? Used to gate UI states
 * like "Enter manually" vs "Auto-extracted from your uploads".
 */
export function hasAnyFacts(facts: DealFacts): boolean {
  return (Object.values(facts) as Array<string | boolean | null>).some(
    (v) => v !== null && v !== '' && v !== false,
  );
}
