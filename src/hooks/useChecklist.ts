import { useMemo } from 'react';
import type { ChecklistItem, UserRole, ScenarioFlags, ItemStatus } from '../types/checklist';
import { buyerChecklist } from '../data/buyerChecklist';
import { sellerChecklist } from '../data/sellerChecklist';
import { loanChecklist } from '../data/loanChecklist';
import { outOfStateChecklist } from '../data/outOfStateChecklist';
import { useChecklistStore } from '../store/checklistStore';

/** Get all items that apply to a given role and scenario. */
export function getFilteredItems(
  role: UserRole,
  flags: ScenarioFlags
): ChecklistItem[] {
  // Start with role-specific items
  let items: ChecklistItem[] =
    role === 'buyer' ? [...buyerChecklist] : [...sellerChecklist];

  // Add loan checklist if vehicle has a loan
  if (flags.hasLoan) {
    items = [...items, ...loanChecklist.filter((i) => i.applicableTo.includes(role))];
  }

  // Add out-of-state checklist if applicable
  if (flags.isOutOfState && role === 'buyer') {
    items = [...items, ...outOfStateChecklist];
  }

  // Filter out items based on scenario flags
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
  items: ChecklistItem[]
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
          (i) => i.phase === item.phase && i.partLabel === item.partLabel
        ),
      });
    }
  }

  return groups;
}

/** Calculate progress stats. */
export function calculateProgress(
  items: ChecklistItem[],
  statuses: Record<string, ItemStatus>
) {
  const total = items.length;
  const answered = items.filter((i) => {
    const s = statuses[i.id];
    return s === 'yes' || s === 'no' || s === 'na' || s === 'fixed';
  }).length;

  const yesCount = items.filter((i) => statuses[i.id] === 'yes').length;
  const noCount = items.filter((i) => statuses[i.id] === 'no').length;
  const naCount = items.filter((i) => statuses[i.id] === 'na').length;
  const fixedCount = items.filter((i) => statuses[i.id] === 'fixed').length;
  const pendingCount = total - answered;

  const readyCount = yesCount + naCount + fixedCount;
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
  const readinessScore = total > 0 ? Math.round((readyCount / total) * 100) : 0;

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
  };
}

/** Check if an item should be visible.
 *  Hidden when any dependency was answered 'no' (the path doesn't apply).
 *  Visible in all other cases — including when dependencies are still pending. */
export function isItemVisible(
  item: ChecklistItem,
  statuses: Record<string, ItemStatus>
): boolean {
  if (!item.dependsOn || item.dependsOn.length === 0) return true;
  // Hide this item if ANY dependency was explicitly answered 'no'
  return !item.dependsOn.some((depId) => statuses[depId] === 'no');
}

/** Hook that provides the full checklist logic for the active session. */
export function useChecklist() {
  const activeSession = useChecklistStore((s) => s.activeSession);
  const updateItemStatus = useChecklistStore((s) => s.updateItemStatus);
  const updateNote = useChecklistStore((s) => s.updateNote);

  const items = useMemo(() => {
    if (!activeSession) return [];
    return getFilteredItems(activeSession.role, activeSession.scenarioFlags);
  }, [activeSession]);

  // Items currently visible (excluding those hidden by a "no" dependency)
  const visibleItems = useMemo(() => {
    if (!activeSession) return [];
    return items.filter((item) => isItemVisible(item, activeSession.items));
  }, [items, activeSession]);

  const phases = useMemo(() => groupByPhase(items), [items]);

  // Progress is based on visible items only
  const progress = useMemo(() => {
    if (!activeSession) return calculateProgress([], {});
    return calculateProgress(visibleItems, activeSession.items);
  }, [visibleItems, activeSession]);

  const isVisible = (item: ChecklistItem): boolean => {
    if (!activeSession) return true;
    return isItemVisible(item, activeSession.items);
  };

  const getStatus = (itemId: string): ItemStatus => {
    return activeSession?.items[itemId] ?? 'pending';
  };

  const getNote = (itemId: string): string => {
    return activeSession?.notes[itemId] ?? '';
  };

  return {
    activeSession,
    items,
    visibleItems,
    phases,
    progress,
    isVisible,
    getStatus,
    getNote,
    updateItemStatus,
    updateNote,
  };
}
