/**
 * Wizard chrome — sticky stepper + outlet for the 5 wizard pages.
 *
 * Steps:
 *   1. Setup       — role, scenario flags, reg number
 *   2. Verify      — AI photos / manual facts / skip
 *   3. Checklist   — auto-evaluated where possible, manual elsewhere
 *   4. Forms       — only forms applicable to role+flags, prefilled
 *   5. Readiness   — score + top-3 actions + submission package
 *
 * The stepper is navigation-aware: users can jump to any step they've
 * already passed but cannot skip ahead (enforced via step gating).
 */

import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useChecklistStore } from '../../store/checklistStore';
import { WIZARD_STEPS, type StepDef } from './wizardSteps';
import styles from './WizardLayout.module.css';

export default function WizardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSession = useChecklistStore((s) => s.activeSession);
  const setCurrentStep = useChecklistStore((s) => s.setCurrentStep);

  const reachedStep = activeSession?.currentStep ?? 1;
  const currentStepDef =
    WIZARD_STEPS.find((s) => location.pathname.startsWith(s.path)) ?? WIZARD_STEPS[0];

  // No active session and user is past Setup → bounce them to Setup.
  if (!activeSession && currentStepDef.id !== 1) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <h1 className={styles.emptyTitle}>No active deal</h1>
          <p className={styles.emptyDesc}>
            Start a new RC transfer wizard to begin. Your progress will be saved automatically.
          </p>
          <Link to="/wizard/setup" className={styles.emptyCta}>
            Begin Setup <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const goToStep = (step: StepDef) => {
    if (step.id > reachedStep) return; // gating
    setCurrentStep(step.id);
    navigate(step.path);
  };

  const progressPct = Math.round(((currentStepDef.id - 1) / (WIZARD_STEPS.length - 1)) * 100);

  return (
    <div className={styles.page}>
      <div className={styles.stepper}>
        <div className={styles.stepperInner}>
          <div className={styles.stepperTopRow}>
            <div className={styles.stepperTitle}>
              <span className={styles.stepperBadge}>
                <Sparkles size={11} /> Wizard
              </span>
              {activeSession?.role
                ? `${activeSession.role[0].toUpperCase()}${activeSession.role.slice(1)} flow`
                : 'New Deal'}
              {activeSession?.vehicleRegNo && ` · ${activeSession.vehicleRegNo}`}
            </div>
            <div className={styles.stepperMeta}>
              Step <span className={styles.stepperMetaStrong}>{currentStepDef.id}</span> of {WIZARD_STEPS.length}
            </div>
          </div>

          <div className={styles.steps}>
            {WIZARD_STEPS.map((s) => {
              const isActive = s.id === currentStepDef.id;
              const isDone = s.id < reachedStep && !isActive;
              const isReachable = s.id <= reachedStep;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${styles.step} ${isActive ? styles.stepActive : ''} ${
                    isDone ? styles.stepDone : ''
                  }`}
                  onClick={() => goToStep(s)}
                  disabled={!isReachable}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className={styles.stepHeader}>
                    <span className={styles.stepNum}>{s.id}</span>
                    <span className={styles.stepLabel}>{s.label}</span>
                  </div>
                  <span className={styles.stepSub}>{s.sub}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.progressBar}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
