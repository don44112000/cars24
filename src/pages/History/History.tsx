import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingCart, Tag, ArrowRight, Trash2, AlertTriangle, CheckCircle2, FileText,
} from 'lucide-react';
import { useChecklistStore } from '../../store/checklistStore';
import { getFilteredItems, calculateProgress, isItemVisible } from '../../hooks/useChecklist';
import { WIZARD_STEPS } from '../Wizard/wizardSteps';
import styles from './History.module.css';

export default function History() {
  const sessions = useChecklistStore((s) => s.sessions);
  const resumeSession = useChecklistStore((s) => s.resumeSession);
  const deleteSession = useChecklistStore((s) => s.deleteSession);
  const navigate = useNavigate();

  const handleResume = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    resumeSession(id);
    // Resume into the wizard if the session has wizard step state, else into
    // the standalone /check (legacy sessions).
    if (session?.currentStep) {
      const step = WIZARD_STEPS.find((s) => s.id === session.currentStep);
      navigate(step?.path ?? '/wizard/setup');
    } else {
      navigate('/check');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Deal History</h1>
        <p className={styles.subtitle}>
          Every deal you've started — resume mid-flow, review the readiness score, or remove old entries.
        </p>

        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No deals yet</h3>
            <p>Start a wizard run or a standalone checklist to see it here.</p>
            <Link to="/wizard/setup">
              Begin Wizard <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {sessions.map((session, i) => {
              const allItems = getFilteredItems(session.role, session.scenarioFlags);
              const items = allItems.filter((item) => isItemVisible(item, session.items));
              // Recompute on read to ensure cards reflect current state even when
              // the cached snapshot is stale (legacy sessions had no snapshot).
              const progress = calculateProgress(
                items,
                session.items,
                session.crossCheckFlags ?? [],
                session.aiOptIn ?? null,
              );
              const isBuyer = session.role === 'buyer';

              const score = progress.readinessScore;
              const scoreClass =
                progress.hasStopCondition || score < 50 ? styles.scoreChipRed
                : score < 80 ? styles.scoreChipAmber
                : styles.scoreChip;

              const isCompleted = !!session.completedAt;
              const stepDef = WIZARD_STEPS.find((s) => s.id === (session.currentStep ?? 1));

              const statusLabel =
                progress.hasStopCondition ? 'STOP — red flags'
                : isCompleted ? 'Filed / completed'
                : session.currentStep && session.currentStep > 1
                ? `Step ${session.currentStep} of 5 — ${stepDef?.label ?? ''}`
                : 'In progress';
              const statusClass =
                progress.hasStopCondition ? styles.statusPillStop
                : isCompleted ? styles.statusPillReady
                : styles.statusPillProgress;

              return (
                <motion.div
                  key={session.id}
                  className={styles.sessionCard}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div
                    className={styles.sessionIcon}
                    style={{
                      background: isBuyer ? 'var(--color-primary-light)' : 'var(--color-cta-light)',
                      color: isBuyer ? 'var(--color-primary)' : 'var(--color-cta)',
                    }}
                  >
                    {isBuyer ? <ShoppingCart size={24} /> : <Tag size={24} />}
                  </div>
                  <div className={styles.sessionBody}>
                    <div className={styles.sessionRole}>
                      {isBuyer ? 'Buyer' : 'Seller'} Deal
                      {session.vehicleRegNo ? ` · ${session.vehicleRegNo}` : ''}
                      {' '}
                      <span className={`${styles.scoreChip} ${scoreClass}`}>
                        {score} / 100
                      </span>
                      {' '}
                      <span className={`${styles.statusPill} ${statusClass}`}>
                        {progress.hasStopCondition && <AlertTriangle size={11} />}
                        {isCompleted && <CheckCircle2 size={11} />}
                        {statusLabel}
                      </span>
                    </div>
                    <div className={styles.sessionMeta}>
                      {progress.percentage}% answered ·{' '}
                      {progress.answered}/{progress.total} items ·{' '}
                      {Object.values(session.formsFiled ?? {}).filter(Boolean).length} forms filed ·{' '}
                      {new Date(session.lastUpdatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    {(progress.redFlagCount > 0 || progress.yellowFlagCount > 0) && session.aiOptIn === 'photos' && (
                      <div className={styles.flagBits}>
                        {progress.redFlagCount > 0 && (
                          <span className={`${styles.flagBit} ${styles.flagBitRed}`}>
                            <AlertTriangle size={11} /> {progress.redFlagCount} red
                          </span>
                        )}
                        {progress.yellowFlagCount > 0 && (
                          <span className={`${styles.flagBit} ${styles.flagBitYellow}`}>
                            <FileText size={11} /> {progress.yellowFlagCount} yellow
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className={styles.sessionActions}>
                    <button
                      className={styles.resumeBtn}
                      onClick={() => handleResume(session.id)}
                    >
                      Resume
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteSession(session.id)}
                      title="Delete deal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
