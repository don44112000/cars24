/** Wizard step definitions — kept in a separate file so the layout
 *  component file only exports a component (Vite fast-refresh constraint). */

export interface StepDef {
  id: 1 | 2 | 3 | 4 | 5;
  path: string;
  label: string;
  sub: string;
}

export const WIZARD_STEPS: StepDef[] = [
  { id: 1, path: '/wizard/setup', label: 'Setup', sub: 'Role & vehicle' },
  { id: 2, path: '/wizard/verify', label: 'Verify', sub: 'AI or manual' },
  { id: 3, path: '/wizard/check', label: 'Checklist', sub: 'Smart checks' },
  { id: 4, path: '/wizard/forms', label: 'Forms', sub: 'Pre-filled RTO forms' },
  { id: 5, path: '/wizard/results', label: 'Readiness', sub: 'Score & next steps' },
];
