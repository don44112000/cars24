// ── RC Readiness Checker — Core Types ──

import type { CheckResult } from '../services/ai/crossCheck';
import type { ExtractedSet } from '../services/ai/documents';
import type { FormId, WizardAnswers } from '../data/formGenerator';

export type ItemStatus = 'pending' | 'yes' | 'no' | 'na' | 'fixed';
export type Severity = 'critical' | 'important' | 'advisory' | 'branching';
export type UserRole = 'buyer' | 'seller';

export type ScenarioFlags = {
  hasLoan: boolean;
  isOutOfState: boolean;
  isSameRTO: boolean;
};

/** Single source of truth for facts about the deal, fed by either AI extraction
 *  or manual entry. Every field is optional — auto-evaluators degrade gracefully
 *  when a fact is missing. */
export interface DealFacts {
  regNo: string | null;
  chassisNo: string | null;
  engineNo: string | null;
  ownerName: string | null;
  hypothecationBank: string | null;
  fuelType: string | null;
  insuranceValidUpto: string | null; // ISO date
  pucValidUpto: string | null;       // ISO date
  /** User-confirmed VAHAN-clear (we don't fetch VAHAN — user ticks after checking). */
  vahanHypothecationCleared: boolean | null;
}

export const emptyDealFacts = (): DealFacts => ({
  regNo: null,
  chassisNo: null,
  engineNo: null,
  ownerName: null,
  hypothecationBank: null,
  fuelType: null,
  insuranceValidUpto: null,
  pucValidUpto: null,
  vahanHypothecationCleared: null,
});

export type FactSource = 'extracted' | 'manual' | 'unknown';

export const emptyFactSource = (): Record<keyof DealFacts, FactSource> => ({
  regNo: 'unknown',
  chassisNo: 'unknown',
  engineNo: 'unknown',
  ownerName: 'unknown',
  hypothecationBank: 'unknown',
  fuelType: 'unknown',
  insuranceValidUpto: 'unknown',
  pucValidUpto: 'unknown',
  vahanHypothecationCleared: 'unknown',
});

/** Outcome of an item's autoEvaluate function.
 *  - 'suggest': pre-filled but user must confirm (used for critical items per CheckList.md
 *    rule "Items marked 🔴 CRITICAL must not be skipped under any circumstance").
 *  - 'finalise': applied directly, user can override. */
export type AutoEvalIntent = 'suggest' | 'finalise';

export interface AutoEvalResult {
  intent: AutoEvalIntent;
  status: 'yes' | 'no' | 'na';
  reason: string;
}

export interface AutoEvalContext {
  facts: DealFacts;
  flags: CheckResult[];
  extractedDocs: ExtractedSet;
}

export type AutoEvaluator = (ctx: AutoEvalContext) => AutoEvalResult | null;

export interface ChecklistItem {
  id: string;                    // e.g. "B-01", "S-03", "L-05"
  title: string;
  severity: Severity;
  phase: string;                 // e.g. "Pre-Purchase Verification"
  partLabel: string;             // e.g. "Part 1 — Buyer Checklist"
  description: string;           // What to check
  fields?: string[];             // Sub-items to verify
  yesText: string;               // What happens when YES
  noText: string;                // What happens when NO
  fixSteps: string[];            // Ordered remediation steps
  naCondition?: string;          // e.g. "N/A if no loan"
  dependsOn?: string[];          // Items that must be 'yes'/'na' before unlock
  applicableTo: UserRole[];
  // Scenario-based visibility
  requiresLoan?: boolean;        // Only show if vehicle has a loan
  requiresOutOfState?: boolean;  // Only show if out-of-state vehicle
  requiresSameRTO?: boolean;     // Only show if same RTO
  hideIfLoan?: boolean;
  hideIfOutOfState?: boolean;
  hideIfSameRTO?: boolean;
  /** Optional auto-evaluator. Returning null = leave manual.
   *  See AutoEvalResult for 'suggest' vs 'finalise' semantics. */
  autoEvaluate?: AutoEvaluator;
  /** Optional form id this item maps to — used by the readiness page to
   *  surface a "Jump to form" CTA next to action items. */
  relatedForm?: FormId;
}

export interface ChecklistSession {
  id: string;
  role: UserRole;
  vehicleRegNo: string;
  scenarioFlags: ScenarioFlags;
  createdAt: string;
  lastUpdatedAt: string;
  items: Record<string, ItemStatus>;
  notes: Record<string, string>;
  /** Reasons attached to items by the auto-evaluator (per-item, suggest or finalise). */
  autoReasons?: Record<string, string>;
  /** Items the user has explicitly confirmed after a 'suggest' evaluation. */
  confirmedAuto?: Record<string, true>;
  // ── New deal-level fields (all optional for backwards-compat) ──
  /** Wizard step the user is currently on (1..5). Drives History "Resume" routing. */
  currentStep?: 1 | 2 | 3 | 4 | 5;
  /** Did the user pick photos / manual / skip in Step 2? */
  aiOptIn?: 'photos' | 'manual' | 'skip' | null;
  /** Shared facts. Source is recorded per-field in factSource. */
  facts?: DealFacts;
  factSource?: Record<keyof DealFacts, FactSource>;
  /** Last-extracted document set (per-field values; raw image bytes are NOT stored here). */
  extractedDocs?: ExtractedSet;
  /** Cross-check flags from the last AI extraction run. */
  crossCheckFlags?: CheckResult[];
  /** Form-generator answers (full WizardAnswers shape). */
  formAnswers?: WizardAnswers;
  /** Per-form "filed" toggle. */
  formsFiled?: Partial<Record<FormId, boolean>>;
  /** When the wizard was completed (user reached results page with score). */
  completedAt?: string | null;
  /** Cached snapshot for fast History rendering. */
  snapshot?: DealSnapshot;
}

export interface DealSnapshot {
  score: number;             // 0..100
  hasStopCondition: boolean; // doc-mandated stop banner
  redFlagCount: number;
  yellowFlagCount: number;
  answeredCount: number;
  totalCount: number;
}

export interface FormReference {
  formNumber: string;
  fullName: string;
  whoUsesIt: string;
  copies: string;
  filedAt: string;
}

export interface FeeItem {
  item: string;
  amount: string;
}

export interface TimelineItem {
  activity: string;
  timeline: string;
}

export interface LegalReference {
  section: string;
  covers: string;
}
