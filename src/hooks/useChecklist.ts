import { useEffect, useMemo, useRef } from 'react';
import type {
  ChecklistItem,
  UserRole,
  ScenarioFlags,
  ItemStatus,
  AutoEvalContext,
  DealFacts,
  DealSnapshot,
} from '../types/checklist';
import { emptyDealFacts } from '../types/checklist';
import { buyerChecklist } from '../data/buyerChecklist';
import { sellerChecklist } from '../data/sellerChecklist';
import { loanChecklist } from '../data/loanChecklist';
import { outOfStateChecklist } from '../data/outOfStateChecklist';
import { useChecklistStore } from '../store/checklistStore';
import type { CheckResult } from '../services/ai/crossCheck';
import type { ExtractedSet } from '../services/ai/documents';

/** Get all items that apply to a given role and scenario. */
export function getFilteredItems(
  role: UserRole,
  flags: ScenarioFlags,
): ChecklistItem[] {
  let items: ChecklistItem[] =
    role === 'buyer' ? [...buyerChecklist] : [...sellerChecklist];

  if (flags.hasLoan) {
    items = [...items, ...loanChecklist.filter((i) => i.applicableTo.includes(role))];
  }

  if (flags.isOutOfState && role === 'buyer') {
    items = [...items, ...outOfStateChecklist];
  }

  items = items.filter((item) => {
    if (item.requiresLoan && !flags.hasLoan) return false;
    if (item.requiresOutOfState && !flags.isOutOfState) return false;
    if (item.requiresSameRTO && !flags.isSameRTO) return false;
    if (item.hideIfLoan && flags.hasLoan) return false;
    if (item.hideIfOutOfState && flags.isOutOfState) return false;
    if (item.hideIfSameRTO && flags.isSameRTO) return false;
    return true;
  });

  return items;
}

/** Group checklist items by phase. */
export function groupByPhase(
  items: ChecklistItem[],
): { phase: string; partLabel: string; items: ChecklistItem[] }[] {
  const groups: { phase: string; partLabel: string; items: ChecklistItem[] }[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const key = `${item.partLabel}::${item.phase}`;
    if (!seen.has(key)) {
      seen.add(key);
      groups.push({
        phase: item.phase,
        partLabel: item.partLabel,
        items: items.filter(
          (i) => i.phase === item.phase && i.partLabel === item.partLabel,
        ),
      });
    }
  }

  return groups;
}

const SEVERITY_WEIGHT: Record<ChecklistItem['severity'], number> = {
  critical: 3,
  important: 2,
  advisory: 1,
  branching: 0,
};

const RED_FLAG_PENALTY = 5;
const YELLOW_FLAG_PENALTY = 2;

/** Calculate progress stats — flat counts, percentage, and severity-weighted readiness. */
export function calculateProgress(
  items: ChecklistItem[],
  statuses: Record<string, ItemStatus>,
  crossCheckFlags: CheckResult[] = [],
  aiOptIn: 'photos' | 'manual' | 'skip' | null = null,
) {
  const total = items.length;
  const isAnswered = (s: ItemStatus | undefined) =>
    s === 'yes' || s === 'no' || s === 'na' || s === 'fixed';
  const isReady = (s: ItemStatus | undefined) =>
    s === 'yes' || s === 'na' || s === 'fixed';

  let answered = 0;
  let yesCount = 0;
  let noCount = 0;
  let naCount = 0;
  let fixedCount = 0;
  let weightTotal = 0;
  let weightEarned = 0;
  let criticalNoCount = 0;

  for (const item of items) {
    const s = statuses[item.id];
    if (isAnswered(s)) answered++;
    if (s === 'yes') yesCount++;
    else if (s === 'no') noCount++;
    else if (s === 'na') naCount++;
    else if (s === 'fixed') fixedCount++;

    const w = SEVERITY_WEIGHT[item.severity];
    weightTotal += w;
    if (isReady(s)) weightEarned += w;
    if (s === 'no' && item.severity === 'critical') criticalNoCount++;
  }

  const pendingCount = total - answered;
  const readyCount = yesCount + naCount + fixedCount;
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
  const baseScore = weightTotal > 0
    ? Math.round((weightEarned / weightTotal) * 100)
    : 0;

  // AI penalty applies only if user did the AI step.
  let aiPenalty = 0;
  let redFlagCount = 0;
  let yellowFlagCount = 0;
  if (aiOptIn === 'photos') {
    for (const f of crossCheckFlags) {
      if (f.status !== 'fail') continue;
      if (f.severity === 'red') {
        redFlagCount++;
        aiPenalty += RED_FLAG_PENALTY;
      } else if (f.severity === 'yellow') {
        yellowFlagCount++;
        aiPenalty += YELLOW_FLAG_PENALTY;
      }
    }
  }

  const readinessScore = Math.max(0, Math.min(100, baseScore - aiPenalty));
  const hasStopCondition = criticalNoCount > 0 || redFlagCount > 0;

  return {
    total,
    answered,
    yesCount,
    noCount,
    naCount,
    fixedCount,
    pendingCount,
    readyCount,
    percentage,
    readinessScore,
    baseScore,
    aiPenalty,
    redFlagCount,
    yellowFlagCount,
    criticalNoCount,
    hasStopCondition,
  };
}

/** Visibility: hidden when any dependency was answered 'no'. */
export function isItemVisible(
  item: ChecklistItem,
  statuses: Record<string, ItemStatus>,
): boolean {
  if (!item.dependsOn || item.dependsOn.length === 0) return true;
  return !item.dependsOn.some((depId) => statuses[depId] === 'no');
}

/** Hash of the inputs that drive auto-eval — used to avoid re-running on every render. */
function autoEvalInputsHash(
  facts: DealFacts,
  flags: CheckResult[],
  extracted: ExtractedSet,
): string {
  return JSON.stringify({
    f: facts,
    fl: flags.map((c) => `${c.id}:${c.status}:${c.severity}`).sort(),
    e: Object.keys(extracted).sort(),
  });
}

/** Hook that provides the full checklist logic for the active session. */
export function useChecklist() {
  const activeSession = useChecklistStore((s) => s.activeSession);
  const updateItemStatus = useChecklistStore((s) => s.updateItemStatus);
  const updateNote = useChecklistStore((s) => s.updateNote);
  const applyAutoEvaluations = useChecklistStore((s) => s.applyAutoEvaluations);
  const confirmAutoSuggestion = useChecklistStore((s) => s.confirmAutoSuggestion);

  const items = useMemo(() => {
    if (!activeSession) return [];
    return getFilteredItems(activeSession.role, activeSession.scenarioFlags);
  }, [activeSession]);

  const visibleItems = useMemo(() => {
    if (!activeSession) return [];
    return items.filter((item) => isItemVisible(item, activeSession.items));
  }, [items, activeSession]);

  const phases = useMemo(() => groupByPhase(items), [items]);

  const progress = useMemo(() => {
    if (!activeSession) return calculateProgress([], {});
    return calculateProgress(
      visibleItems,
      activeSession.items,
      activeSession.crossCheckFlags ?? [],
      activeSession.aiOptIn ?? null,
    );
  }, [visibleItems, activeSession]);

  const isVisible = (item: ChecklistItem): boolean => {
    if (!activeSession) return true;
    return isItemVisible(item, activeSession.items);
  };

  const getStatus = (itemId: string): ItemStatus =>
    activeSession?.items[itemId] ?? 'pending';

  const getNote = (itemId: string): string =>
    activeSession?.notes[itemId] ?? '';

  const getAutoReason = (itemId: string): string | null =>
    activeSession?.autoReasons?.[itemId] ?? null;

  const isAutoConfirmed = (itemId: string): boolean =>
    !!activeSession?.confirmedAuto?.[itemId];

  // ── Auto-eval seeding: re-run whenever facts/flags change. ──
  const lastHashRef = useRef<string>('');

  useEffect(() => {
    if (!activeSession) return;
    const facts = activeSession.facts ?? emptyDealFacts();
    const flags = activeSession.crossCheckFlags ?? [];
    const extracted = activeSession.extractedDocs ?? {};
    const hash = autoEvalInputsHash(facts, flags, extracted);
    if (hash === lastHashRef.current) return;
    lastHashRef.current = hash;

    const ctx: AutoEvalContext = { facts, flags, extractedDocs: extracted };
    const results: Record<
      string,
      { intent: 'suggest' | 'finalise'; status: ItemStatus; reason: string }
    > = {};
    for (const item of items) {
      if (!item.autoEvaluate) continue;
      const r = item.autoEvaluate(ctx);
      if (!r) continue;
      results[item.id] = { intent: r.intent, status: r.status, reason: r.reason };
    }
    if (Object.keys(results).length > 0) {
      applyAutoEvaluations(results);
    }
  }, [activeSession, items, applyAutoEvaluations]);

  const snapshot: DealSnapshot = useMemo(
    () => ({
      score: progress.readinessScore,
      hasStopCondition: progress.hasStopCondition,
      redFlagCount: progress.redFlagCount,
      yellowFlagCount: progress.yellowFlagCount,
      answeredCount: progress.answered,
      totalCount: progress.total,
    }),
    [progress],
  );

  // Persist the snapshot back to the store so History rendering doesn't
  // need to recompute from scratch.
  const setSnapshot = useChecklistStore((s) => s.setSnapshot);
  const lastSnapshotRef = useRef<string>('');
  useEffect(() => {
    if (!activeSession) return;
    const sig = JSON.stringify(snapshot);
    if (sig === lastSnapshotRef.current) return;
    lastSnapshotRef.current = sig;
    setSnapshot(snapshot);
  }, [activeSession, snapshot, setSnapshot]);

  return {
    activeSession,
    items,
    visibleItems,
    phases,
    progress,
    snapshot,
    isVisible,
    getStatus,
    getNote,
    getAutoReason,
    isAutoConfirmed,
    updateItemStatus,
    updateNote,
    confirmAutoSuggestion,
  };
}
