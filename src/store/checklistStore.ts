import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChecklistSession, ItemStatus, UserRole, ScenarioFlags } from '../types/checklist';

interface ChecklistStore {
  // Current active session
  activeSession: ChecklistSession | null;

  // All past sessions
  sessions: ChecklistSession[];

  // Actions
  startSession: (role: UserRole, vehicleRegNo: string, scenarioFlags: ScenarioFlags) => void;
  resumeSession: (sessionId: string) => void;
  updateItemStatus: (itemId: string, status: ItemStatus) => void;
  updateNote: (itemId: string, note: string) => void;
  deleteSession: (sessionId: string) => void;
  clearActiveSession: () => void;
}

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

export const useChecklistStore = create<ChecklistStore>()(
  persist(
    (set, get) => ({
      activeSession: null,
      sessions: [],

      startSession: (role, vehicleRegNo, scenarioFlags) => {
        const newSession: ChecklistSession = {
          id: generateId(),
          role,
          vehicleRegNo,
          scenarioFlags,
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
          items: {},
          notes: {},
        };
        set((state) => ({
          activeSession: newSession,
          sessions: [newSession, ...state.sessions],
        }));
      },

      resumeSession: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (session) {
          set({ activeSession: session });
        }
      },

      updateItemStatus: (itemId, status) => {
        set((state) => {
          if (!state.activeSession) return state;

          const updatedSession: ChecklistSession = {
            ...state.activeSession,
            items: { ...state.activeSession.items, [itemId]: status },
            lastUpdatedAt: new Date().toISOString(),
          };

          return {
            activeSession: updatedSession,
            sessions: state.sessions.map((s) =>
              s.id === updatedSession.id ? updatedSession : s
            ),
          };
        });
      },

      updateNote: (itemId, note) => {
        set((state) => {
          if (!state.activeSession) return state;

          const updatedSession: ChecklistSession = {
            ...state.activeSession,
            notes: { ...state.activeSession.notes, [itemId]: note },
            lastUpdatedAt: new Date().toISOString(),
          };

          return {
            activeSession: updatedSession,
            sessions: state.sessions.map((s) =>
              s.id === updatedSession.id ? updatedSession : s
            ),
          };
        });
      },

      deleteSession: (sessionId) => {
        set((state) => ({
          activeSession:
            state.activeSession?.id === sessionId
              ? null
              : state.activeSession,
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));
      },

      clearActiveSession: () => {
        set({ activeSession: null });
      },
    }),
    {
      name: 'rc-checker-sessions',
    }
  )
);
