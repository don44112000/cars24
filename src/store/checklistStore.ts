/**
 * Unified store for both the standalone checklist flow and the merged wizard.
 *
 * Each session is a "Deal" — one full RC-transfer cycle for a single vehicle.
 * The wizard pages and the standalone /start → /check → /results pages all
 * operate on the same `activeSession`, so a user can drift between them
 * without losing progress.
 *
 * Persisted to localStorage under `rc-checker-sessions`. Raw uploaded image
 * bytes are NOT persisted here — only the structured fields the AI extracted.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ChecklistSession,
  ItemStatus,
  UserRole,
  ScenarioFlags,
  DealFacts,
  FactSource,
  DealSnapshot,
} from '../types/checklist';
import { emptyDealFacts, emptyFactSource } from '../types/checklist';
import { mergeFacts } from '../data/factsMapping';
import { emptyAnswers, type FormId, type WizardAnswers } from '../data/formGenerator';
import type { ExtractedSet } from '../services/ai/documents';
import type { CheckResult } from '../services/ai/crossCheck';

interface ChecklistStore {
  // Current active session
  activeSession: ChecklistSession | null;

  // All past sessions
  sessions: ChecklistSession[];

  // ── Lifecycle ──
  startSession: (role: UserRole, vehicleRegNo: string, scenarioFlags: ScenarioFlags) => string;
  resumeSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  clearActiveSession: () => void;

  // ── Checklist actions (existing) ──
  updateItemStatus: (itemId: string, status: ItemStatus) => void;
  updateNote: (itemId: string, note: string) => void;

  // ── Auto-evaluator integration ──
  /** Apply auto-evaluator results to items.
   *  - 'finalise' → writes status + note directly.
   *  - 'suggest'  → records the reason but leaves status as 'pending' until
   *    the user calls confirmAutoSuggestion or overrides via updateItemStatus. */
  applyAutoEvaluations: (
    results: Record<string, { intent: 'suggest' | 'finalise'; status: ItemStatus; reason: string }>,
  ) => void;
  /** User has explicitly approved a 'suggest' pre-mark. */
  confirmAutoSuggestion: (itemId: string, status: ItemStatus) => void;

  // ── Wizard / deal-level actions ──
  setCurrentStep: (step: 1 | 2 | 3 | 4 | 5) => void;
  setAiOptIn: (mode: 'photos' | 'manual' | 'skip' | null) => void;
  setFacts: (patch: Partial<DealFacts>, source: FactSource) => void;
  resetExtractedFacts: () => void;
  setExtractedDocs: (extracted: ExtractedSet, flags: CheckResult[]) => void;
  setFormAnswers: (patch: Partial<WizardAnswers>) => void;
  setFormFiled: (formId: FormId, filed: boolean) => void;
  setSnapshot: (snapshot: DealSnapshot) => void;
  markCompleted: () => void;
  setScenarioFlags: (flags: ScenarioFlags) => void;
  setVehicleRegNo: (regNo: string) => void;
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

const baseFormAnswers = (role: UserRole, flags: ScenarioFlags): WizardAnswers => {
  const a = emptyAnswers();
  a.intent = role;
  a.hasLoan = flags.hasLoan;
  a.isOutOfState = flags.isOutOfState;
  return a;
};

const ensureDealFields = (s: ChecklistSession): ChecklistSession => ({
  ...s,
  currentStep: s.currentStep ?? 1,
  aiOptIn: s.aiOptIn ?? null,
  facts: s.facts ?? emptyDealFacts(),
  factSource: s.factSource ?? emptyFactSource(),
  extractedDocs: s.extractedDocs ?? {},
  crossCheckFlags: s.crossCheckFlags ?? [],
  formAnswers: s.formAnswers ?? baseFormAnswers(s.role, s.scenarioFlags),
  formsFiled: s.formsFiled ?? {},
  autoReasons: s.autoReasons ?? {},
  confirmedAuto: s.confirmedAuto ?? {},
  completedAt: s.completedAt ?? null,
});

export const useChecklistStore = create<ChecklistStore>()(
  persist(
    (set, get) => ({
      activeSession: null,
      sessions: [],

      startSession: (role, vehicleRegNo, scenarioFlags) => {
        const newSession: ChecklistSession = ensureDealFields({
          id: generateId(),
          role,
          vehicleRegNo,
          scenarioFlags,
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          items: {},
          notes: {},
          formAnswers: baseFormAnswers(role, scenarioFlags),
          currentStep: 1,
        });
        set((state) => ({
          activeSession: newSession,
          sessions: [newSession, ...state.sessions],
        }));
        return newSession.id;
      },

      resumeSession: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (session) {
          set({ activeSession: ensureDealFields(session) });
        }
      },

      updateItemStatus: (itemId, status) => {
        set((state) => {
          if (!state.activeSession) return state;
          const updated: ChecklistSession = {
            ...state.activeSession,
            items: { ...state.activeSession.items, [itemId]: status },
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      updateNote: (itemId, note) => {
        set((state) => {
          if (!state.activeSession) return state;
          const updated: ChecklistSession = {
            ...state.activeSession,
            notes: { ...state.activeSession.notes, [itemId]: note },
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      applyAutoEvaluations: (results) => {
        set((state) => {
          if (!state.activeSession) return state;
          const items = { ...state.activeSession.items };
          const reasons = { ...(state.activeSession.autoReasons ?? {}) };

          Object.entries(results).forEach(([id, r]) => {
            const current = items[id];
            // Don't overwrite a user's existing answer.
            if (current && current !== 'pending') return;
            reasons[id] = r.reason;
            if (r.intent === 'finalise') {
              items[id] = r.status;
            }
            // 'suggest' intent: stay pending; reason is shown next to YES/NO buttons.
          });

          const updated: ChecklistSession = {
            ...state.activeSession,
            items,
            autoReasons: reasons,
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      confirmAutoSuggestion: (itemId, status) => {
        set((state) => {
          if (!state.activeSession) return state;
          const updated: ChecklistSession = {
            ...state.activeSession,
            items: { ...state.activeSession.items, [itemId]: status },
            confirmedAuto: { ...(state.activeSession.confirmedAuto ?? {}), [itemId]: true },
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      setCurrentStep: (step) => {
        set((state) => {
          if (!state.activeSession) return state;
          const updated: ChecklistSession = {
            ...state.activeSession,
            currentStep: step,
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      setAiOptIn: (mode) => {
        set((state) => {
          if (!state.activeSession) return state;
          const updated: ChecklistSession = {
            ...state.activeSession,
            aiOptIn: mode,
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      setFacts: (patch, source) => {
        set((state) => {
          if (!state.activeSession) return state;
          const merged = mergeFacts(
            state.activeSession.facts ?? emptyDealFacts(),
            state.activeSession.factSource ?? emptyFactSource(),
            patch,
            source,
          );
          const updated: ChecklistSession = {
            ...state.activeSession,
            facts: merged.facts,
            factSource: merged.source,
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      resetExtractedFacts: () => {
        set((state) => {
          if (!state.activeSession) return state;
          const facts = { ...(state.activeSession.facts ?? emptyDealFacts()) };
          const source = { ...(state.activeSession.factSource ?? emptyFactSource()) };
          (Object.keys(source) as Array<keyof FactSource | string>).forEach((k) => {
            const key = k as keyof typeof source;
            if (source[key] === 'extracted') {
              source[key] = 'unknown';
              (facts as Record<string, unknown>)[key as string] = null;
            }
          });
          const updated: ChecklistSession = {
            ...state.activeSession,
            facts,
            factSource: source,
            extractedDocs: {},
            crossCheckFlags: [],
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      setExtractedDocs: (extracted, flags) => {
        set((state) => {
          if (!state.activeSession) return state;
          const updated: ChecklistSession = {
            ...state.activeSession,
            extractedDocs: extracted,
            crossCheckFlags: flags,
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      setFormAnswers: (patch) => {
        set((state) => {
          if (!state.activeSession) return state;
          const current = state.activeSession.formAnswers ?? baseFormAnswers(state.activeSession.role, state.activeSession.scenarioFlags);
          const updated: ChecklistSession = {
            ...state.activeSession,
            formAnswers: { ...current, ...patch },
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      setFormFiled: (formId, filed) => {
        set((state) => {
          if (!state.activeSession) return state;
          const updated: ChecklistSession = {
            ...state.activeSession,
            formsFiled: { ...(state.activeSession.formsFiled ?? {}), [formId]: filed },
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      setSnapshot: (snapshot) => {
        set((state) => {
          if (!state.activeSession) return state;
          const updated: ChecklistSession = {
            ...state.activeSession,
            snapshot,
            // intentionally not bumping lastUpdatedAt — snapshots are derived
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      markCompleted: () => {
        set((state) => {
          if (!state.activeSession) return state;
          const updated: ChecklistSession = {
            ...state.activeSession,
            completedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      setScenarioFlags: (flags) => {
        set((state) => {
          if (!state.activeSession) return state;
          const formAnswers = state.activeSession.formAnswers ?? baseFormAnswers(state.activeSession.role, flags);
          const updated: ChecklistSession = {
            ...state.activeSession,
            scenarioFlags: flags,
            formAnswers: {
              ...formAnswers,
              hasLoan: flags.hasLoan,
              isOutOfState: flags.isOutOfState,
            },
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      setVehicleRegNo: (regNo) => {
        set((state) => {
          if (!state.activeSession) return state;
          const updated: ChecklistSession = {
            ...state.activeSession,
            vehicleRegNo: regNo,
            lastUpdatedAt: new Date().toISOString(),
          };
          return {
            activeSession: updated,
            sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
          };
        });
      },

      deleteSession: (sessionId) => {
        set((state) => ({
          activeSession:
            state.activeSession?.id === sessionId ? null : state.activeSession,
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));
      },

      clearActiveSession: () => {
        set({ activeSession: null });
      },
    }),
    {
      name: 'rc-checker-sessions',
    },
  ),
);
