// ── RC Readiness Checker — Core Types ──

export type ItemStatus = 'pending' | 'yes' | 'no' | 'na' | 'fixed';
export type Severity = 'critical' | 'important' | 'advisory' | 'branching';
export type UserRole = 'buyer' | 'seller';

export type ScenarioFlags = {
  hasLoan: boolean;
  isOutOfState: boolean;
  isSameRTO: boolean;
};

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
