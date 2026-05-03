import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Check, X, Minus, ArrowRight, ArrowLeft,
  Wrench, StickyNote, FileText, List, Target, Sparkles,
} from 'lucide-react';
import type { ChecklistItem, ItemStatus } from '../../types/checklist';
import { useChecklist } from '../../hooks/useChecklist';
import { useChecklistStore } from '../../store/checklistStore';
import styles from './Check.module.css';

type Mode = 'focus' | 'review';

const SEVERITY_LABEL: Record<ChecklistItem['severity'], string> = {
  critical: 'Critical',
  important: 'Important',
  advisory: 'Advisory',
  branching: 'Branching',
};

function SeverityPill({ severity }: { severity: ChecklistItem['severity'] }) {
  return (
    <span className={`${styles.sevPill} ${styles[`sevPill_${severity}`]}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

function StatusIcon({ status, size = 20 }: { status: ItemStatus; size?: number }) {
  const map: Record<ItemStatus, { cls: string; icon: React.ReactNode }> = {
    pending: { cls: styles.statusPending, icon: null },
    yes: { cls: styles.statusYes, icon: <Check size={size * 0.6} strokeWidth={3} /> },
    no: { cls: styles.statusNo, icon: <X size={size * 0.6} strokeWidth={3} /> },
    na: { cls: styles.statusNa, icon: <Minus size={size * 0.6} strokeWidth={3} /> },
    fixed: { cls: styles.statusYes, icon: <Check size={size * 0.6} strokeWidth={3} /> },
  };
  const { cls, icon } = map[status];
  return (
    <div
      className={`${styles.statusIcon} ${cls}`}
      style={{ width: size, height: size }}
    >
      {icon}
    </div>
  );
}

/* ───────────────── REVIEW MODE — compact rows ───────────────── */

function ChecklistRow({
  item,
  status,
  note,
  onStatus,
  onNote,
  onJump,
}: {
  item: ChecklistItem;
  status: ItemStatus;
  note: string;
  onStatus: (s: ItemStatus) => void;
  onNote: (n: string) => void;
  onJump: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNote, setShowNote] = useState(!!note);

  const handleStatus = (s: ItemStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    onStatus(s);
    if (s === 'no') setExpanded(true);
  };

  return (
    <motion.div
      className={`${styles.row} ${status === 'no' ? styles.rowNo : ''} ${
        status === 'yes' || status === 'fixed' ? styles.rowYes : ''
      } ${status === 'na' ? styles.rowNa : ''}`}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
    >
      <button
        type="button"
        className={styles.rowMain}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <StatusIcon status={status} size={18} />
        <span className={`${styles.sevDot} ${styles[`sevDot_${item.severity}`]}`} />
        <span className={styles.rowId}>{item.id}</span>
        <span className={styles.rowTitle}>{item.title}</span>
        <ChevronDown
          size={14}
          className={`${styles.rowChevron} ${expanded ? styles.rowChevronOpen : ''}`}
        />
      </button>

      <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
        <button
          className={`${styles.pill} ${styles.pillYes} ${status === 'yes' ? styles.pillYesActive : ''}`}
          onClick={(e) => handleStatus('yes', e)}
          title="Yes"
          aria-label="Yes"
        >
          <Check size={13} strokeWidth={2.5} />
        </button>
        <button
          className={`${styles.pill} ${styles.pillNo} ${status === 'no' ? styles.pillNoActive : ''}`}
          onClick={(e) => handleStatus('no', e)}
          title="No"
          aria-label="No"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
        {item.naCondition && (
          <button
            className={`${styles.pill} ${styles.pillNa} ${status === 'na' ? styles.pillNaActive : ''}`}
            onClick={(e) => handleStatus('na', e)}
            title={item.naCondition}
            aria-label="N/A"
          >
            <Minus size={13} strokeWidth={2.5} />
          </button>
        )}
        <button
          className={styles.pillJump}
          onClick={(e) => {
            e.stopPropagation();
            onJump();
          }}
          title="Open in focus mode"
          aria-label="Open in focus mode"
        >
          <Target size={13} strokeWidth={2} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className={styles.rowExpand}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <p className={styles.rowDesc}>{item.description}</p>

            {item.fields && item.fields.length > 0 && (
              <ul className={styles.fieldsList}>
                {item.fields.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}

            {status === 'no' && (
              <div className={styles.fixPanel}>
                <div className={styles.fixTitle}>
                  <Wrench size={13} /> How to Fix
                </div>
                <ol className={styles.fixSteps}>
                  {item.fixSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className={styles.noteSection}>
              <button
                className={styles.noteToggleBtn}
                onClick={() => setShowNote(!showNote)}
              >
                <StickyNote size={11} />
                {showNote ? 'Hide note' : note ? 'Edit note' : 'Add note'}
              </button>
              {showNote && (
                <textarea
                  className={styles.noteInput}
                  placeholder="Personal notes..."
                  value={note}
                  onChange={(e) => onNote(e.target.value)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ───────────────── FOCUS MODE — single card ───────────────── */

function FocusCard({
  item,
  status,
  note,
  phaseLabel,
  index,
  total,
  onStatus,
  onNote,
  onSkip,
}: {
  item: ChecklistItem;
  status: ItemStatus;
  note: string;
  phaseLabel: string;
  index: number;
  total: number;
  onStatus: (s: ItemStatus) => void;
  onNote: (n: string) => void;
  onSkip: () => void;
}) {
  const [showNote, setShowNote] = useState(!!note);

  return (
    <motion.div
      key={item.id}
      className={styles.focusCard}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <div className={styles.focusMeta}>
        <span className={styles.focusPhase}>{phaseLabel}</span>
        <span className={styles.focusDot}>·</span>
        <span className={styles.focusCounter}>
          Question {index + 1} of {total}
        </span>
        <SeverityPill severity={item.severity} />
      </div>

      <div className={styles.focusHeader}>
        <span className={styles.focusId}>{item.id}</span>
        <h2 className={styles.focusTitle}>{item.title}</h2>
      </div>

      <p className={styles.focusDesc}>{item.description}</p>

      {item.fields && item.fields.length > 0 && (
        <div className={styles.focusFields}>
          <div className={styles.focusFieldsTitle}>What to verify:</div>
          <ul>
            {item.fields.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.focusActions}>
        <button
          className={`${styles.bigBtn} ${styles.bigBtnYes} ${status === 'yes' ? styles.bigBtnYesActive : ''}`}
          onClick={() => onStatus('yes')}
        >
          <Check size={18} strokeWidth={2.5} /> Yes
          <kbd className={styles.kbd}>Y</kbd>
        </button>
        <button
          className={`${styles.bigBtn} ${styles.bigBtnNo} ${status === 'no' ? styles.bigBtnNoActive : ''}`}
          onClick={() => onStatus('no')}
        >
          <X size={18} strokeWidth={2.5} /> No
          <kbd className={styles.kbd}>N</kbd>
        </button>
        {item.naCondition && (
          <button
            className={`${styles.bigBtn} ${styles.bigBtnNa} ${status === 'na' ? styles.bigBtnNaActive : ''}`}
            onClick={() => onStatus('na')}
            title={item.naCondition}
          >
            <Minus size={18} strokeWidth={2.5} /> N/A
            <kbd className={styles.kbd}>A</kbd>
          </button>
        )}
      </div>

      <AnimatePresence>
        {status === 'no' && (
          <motion.div
            className={styles.focusFix}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className={styles.fixTitle}>
              <Wrench size={14} /> How to Fix — Next Steps
            </div>
            <ol className={styles.fixSteps}>
              {item.fixSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <div className={styles.fixActions}>
              <button
                type="button"
                className={styles.fixActionPrimary}
                onClick={() => onStatus('fixed')}
              >
                <Check size={14} strokeWidth={2.5} /> Mark as Fixed
              </button>
              <button
                type="button"
                className={styles.fixActionSecondary}
                onClick={onSkip}
              >
                Skip &amp; Continue <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
        {status === 'fixed' && (
          <motion.div
            className={styles.focusFixedConfirm}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
          >
            <Check size={14} strokeWidth={2.5} /> Marked as fixed — counted toward your readiness score.
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.focusNote}>
        <button
          className={styles.noteToggleBtn}
          onClick={() => setShowNote(!showNote)}
        >
          <StickyNote size={12} />
          {showNote ? 'Hide note' : note ? 'Edit note' : 'Add a note'}
        </button>
        {showNote && (
          <textarea
            className={styles.noteInput}
            placeholder="Personal notes for this item..."
            value={note}
            onChange={(e) => onNote(e.target.value)}
          />
        )}
      </div>
    </motion.div>
  );
}

/* ───────────────── COMPLETION CARD ───────────────── */

function CompletionCard({
  ready,
  action,
  total,
  nextHref,
  nextLabel,
  onContinue,
}: {
  ready: number;
  action: number;
  total: number;
  nextHref: string;
  nextLabel: string;
  onContinue?: () => void;
}) {
  const allReady = action === 0;
  return (
    <motion.div
      key="done"
      className={styles.doneCard}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`${styles.doneIcon} ${allReady ? styles.doneIconSuccess : styles.doneIconAction}`}>
        {allReady ? <Sparkles size={32} /> : <Wrench size={32} />}
      </div>
      <h2 className={styles.doneTitle}>
        {allReady ? 'All clear!' : 'Checks complete'}
      </h2>
      <p className={styles.doneSubtitle}>
        {allReady
          ? `All ${total} items answered with no blockers — you're ready to proceed.`
          : `${ready} of ${total} ready · ${action} need attention before transfer.`}
      </p>
      <Link to={nextHref} className={styles.doneCta} onClick={onContinue}>
        <FileText size={18} /> {nextLabel} <ArrowRight size={18} />
      </Link>
    </motion.div>
  );
}

/* ───────────────── PAGE ───────────────── */

export default function CheckPage() {
  const {
    activeSession,
    phases,
    progress,
    isVisible,
    getStatus,
    getNote,
    updateItemStatus,
    updateNote,
  } = useChecklist();

  const location = useLocation();
  const setCurrentStep = useChecklistStore((s) => s.setCurrentStep);
  const inWizard = location.pathname.startsWith('/wizard');
  const nextHref = inWizard ? '/wizard/forms' : '/results';
  const nextLabel = inWizard ? 'Continue to Forms' : 'View Your Report';

  const [mode, setMode] = useState<Mode>('focus');
  const [currentIdx, setCurrentIdx] = useState(0);

  // Build a flat list of all visible items + a phase short-label per item
  const { flatItems, phaseLabelByIdx, visiblePhases } = useMemo(() => {
    const flat: ChecklistItem[] = [];
    const labels: string[] = [];
    const visible = phases
      .map((p) => ({ ...p, items: p.items.filter(isVisible) }))
      .filter((p) => p.items.length > 0);

    visible.forEach((p, pi) => {
      const shortLabel = `Phase ${pi + 1}`;
      p.items.forEach((it) => {
        flat.push(it);
        labels.push(shortLabel);
      });
    });
    return { flatItems: flat, phaseLabelByIdx: labels, visiblePhases: visible };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases, activeSession?.items]);

  // Initialise focus on the first pending item when the session loads
  useEffect(() => {
    if (!flatItems.length) return;
    const firstPending = flatItems.findIndex((it) => getStatus(it.id) === 'pending');
    setCurrentIdx(firstPending === -1 ? flatItems.length - 1 : firstPending);
    // run only on session change, not every status change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, flatItems.length]);

  const currentItem = flatItems[currentIdx];
  const allAnswered = progress.pendingCount === 0 && flatItems.length > 0;

  const findNextPending = (from: number): number => {
    for (let i = from + 1; i < flatItems.length; i++) {
      if (getStatus(flatItems[i].id) === 'pending') return i;
    }
    for (let i = 0; i <= from; i++) {
      if (getStatus(flatItems[i].id) === 'pending') return i;
    }
    return -1;
  };

  const advanceToNextPending = () => {
    const next = findNextPending(currentIdx);
    if (next !== -1 && next !== currentIdx) setCurrentIdx(next);
  };

  const handleFocusStatus = (s: ItemStatus) => {
    if (!currentItem) return;
    const wasPending = getStatus(currentItem.id) === 'pending';
    updateItemStatus(currentItem.id, s);
    // Auto-advance on Yes / N/A from pending, or when transitioning to 'fixed'.
    // Stay on 'no' so the user can read the fix and choose Mark Fixed / Skip.
    if ((wasPending && (s === 'yes' || s === 'na')) || s === 'fixed') {
      window.setTimeout(advanceToNextPending, 280);
    }
  };

  const goPrev = () => setCurrentIdx((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIdx((i) => Math.min(flatItems.length - 1, i + 1));

  // Keyboard shortcuts in focus mode
  useEffect(() => {
    if (mode !== 'focus' || !currentItem) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'y' || e.key === 'Y') handleFocusStatus('yes');
      else if (e.key === 'n' || e.key === 'N') handleFocusStatus('no');
      else if ((e.key === 'a' || e.key === 'A') && currentItem.naCondition) handleFocusStatus('na');
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentItem, currentIdx, flatItems.length]);

  if (!activeSession) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <h2>No Active Check</h2>
          <p>Start a new RC readiness check to get your personalised checklist.</p>
          <Link to="/start">
            Start Check <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  const roleLabel = activeSession.role === 'buyer' ? 'Buyer' : 'Seller';

  return (
    <div className={styles.page}>
      {/* Top bar — role, reg, percentage, mode toggle */}
      <div className={styles.topBar}>
        <div className={styles.inner}>
          <div className={styles.topRow}>
            <div className={styles.topInfo}>
              <h1 className={styles.topTitle}>{roleLabel} Checklist</h1>
              {activeSession.vehicleRegNo && (
                <span className={styles.topReg}>{activeSession.vehicleRegNo}</span>
              )}
            </div>
            <div className={styles.topRight}>
              <div className={styles.topPctWrap}>
                <span className={styles.topPct}>{progress.percentage}%</span>
                <span className={styles.topCount}>
                  {progress.answered}/{progress.total}
                </span>
              </div>
              <div className={styles.modeToggle} role="tablist">
                <button
                  className={`${styles.modeBtn} ${mode === 'focus' ? styles.modeBtnActive : ''}`}
                  onClick={() => setMode('focus')}
                  aria-pressed={mode === 'focus'}
                >
                  <Target size={13} /> Focus
                </button>
                <button
                  className={`${styles.modeBtn} ${mode === 'review' ? styles.modeBtnActive : ''}`}
                  onClick={() => setMode('review')}
                  aria-pressed={mode === 'review'}
                >
                  <List size={13} /> Review
                </button>
              </div>
            </div>
          </div>

          {/* Dot strip — at-a-glance jump nav */}
          <div className={styles.stripWrap}>
            {visiblePhases.map((phase, pi) => {
              const startIdx = visiblePhases
                .slice(0, pi)
                .reduce((s, p) => s + p.items.length, 0);
              return (
                <div key={`${phase.partLabel}::${phase.phase}`} className={styles.stripGroup}>
                  <span className={styles.stripGroupLabel} title={phase.phase}>
                    P{pi + 1}
                  </span>
                  <div className={styles.stripDots}>
                    {phase.items.map((it, ii) => {
                      const idx = startIdx + ii;
                      const st = getStatus(it.id);
                      const active = idx === currentIdx;
                      return (
                        <button
                          key={it.id}
                          className={`${styles.stripDot} ${styles[`stripDot_${st}`]} ${
                            active ? styles.stripDotActive : ''
                          } ${it.severity === 'critical' && st === 'pending' ? styles.stripDotCritical : ''}`}
                          onClick={() => {
                            setCurrentIdx(idx);
                            if (mode !== 'focus') setMode('focus');
                          }}
                          title={`${it.id}: ${it.title}`}
                          aria-label={`${it.id}: ${it.title}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={styles.inner}>
        {mode === 'focus' ? (
          <div className={styles.focusStage}>
            <AnimatePresence mode="wait">
              {allAnswered ? (
                <CompletionCard
                  key="done"
                  ready={progress.yesCount + progress.naCount + progress.fixedCount}
                  action={progress.noCount}
                  total={flatItems.length}
                  nextHref={nextHref}
                  nextLabel={nextLabel}
                  onContinue={() => {
                    if (inWizard) setCurrentStep(4);
                  }}
                />
              ) : currentItem ? (
                <FocusCard
                  key={currentItem.id}
                  item={currentItem}
                  status={getStatus(currentItem.id)}
                  note={getNote(currentItem.id)}
                  phaseLabel={phaseLabelByIdx[currentIdx] ?? ''}
                  index={currentIdx}
                  total={flatItems.length}
                  onStatus={handleFocusStatus}
                  onNote={(n) => updateNote(currentItem.id, n)}
                  onSkip={advanceToNextPending}
                />
              ) : null}
            </AnimatePresence>

            {/* Focus-mode bottom nav */}
            {!allAnswered && currentItem && (
              <div className={styles.focusNav}>
                <button
                  className={styles.navBtn}
                  onClick={goPrev}
                  disabled={currentIdx === 0}
                  aria-label="Previous"
                >
                  <ArrowLeft size={16} /> Prev
                </button>
                <div className={styles.navMiddle}>
                  {progress.noCount > 0 && (
                    <span className={styles.navAction}>
                      <span className={styles.navActionDot} /> {progress.noCount} need fixing
                    </span>
                  )}
                  <Link
                    to={nextHref}
                    className={`${styles.navReport} ${
                      progress.percentage > 50 ? styles.navReportReady : ''
                    }`}
                    onClick={() => {
                      if (inWizard) setCurrentStep(4);
                    }}
                  >
                    <FileText size={14} /> {inWizard ? 'Continue' : 'View Report'}
                  </Link>
                </div>
                <button
                  className={styles.navBtn}
                  onClick={goNext}
                  disabled={currentIdx === flatItems.length - 1}
                  aria-label="Next"
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          // ───────── REVIEW MODE ─────────
          <div className={styles.reviewWrap}>
            <div className={styles.reviewSummary}>
              <div className={styles.reviewSummaryStat}>
                <span className={styles.reviewSummaryNum}>
                  {progress.yesCount + progress.naCount + progress.fixedCount}
                </span>
                <span className={styles.reviewSummaryLbl}>Ready</span>
              </div>
              <div className={styles.reviewSummaryStat}>
                <span className={`${styles.reviewSummaryNum} ${styles.reviewSummaryNumAction}`}>
                  {progress.noCount}
                </span>
                <span className={styles.reviewSummaryLbl}>Action</span>
              </div>
              <div className={styles.reviewSummaryStat}>
                <span className={`${styles.reviewSummaryNum} ${styles.reviewSummaryNumPending}`}>
                  {progress.pendingCount}
                </span>
                <span className={styles.reviewSummaryLbl}>Pending</span>
              </div>
              <Link
                to={nextHref}
                className={styles.reviewReportBtn}
                onClick={() => {
                  if (inWizard) setCurrentStep(4);
                }}
              >
                <FileText size={14} /> {inWizard ? 'Continue' : 'View Report'} <ArrowRight size={14} />
              </Link>
            </div>

            {visiblePhases.map((phase, pi) => {
              const startIdx = visiblePhases
                .slice(0, pi)
                .reduce((s, p) => s + p.items.length, 0);
              const phaseAnswered = phase.items.filter(
                (i) => getStatus(i.id) !== 'pending'
              ).length;
              return (
                <div key={`${phase.partLabel}::${phase.phase}`} className={styles.phase}>
                  <div className={styles.phaseHeader}>
                    <div className={styles.phaseTitleWrap}>
                      <span className={styles.phaseTitle}>{phase.phase}</span>
                      <span className={styles.phasePartLabel}>{phase.partLabel}</span>
                    </div>
                    <span
                      className={`${styles.phaseBadge} ${
                        phaseAnswered === phase.items.length ? styles.phaseBadgeDone : ''
                      }`}
                    >
                      {phaseAnswered}/{phase.items.length}
                    </span>
                  </div>
                  <div className={styles.phaseItems}>
                    {phase.items.map((item, ii) => (
                      <ChecklistRow
                        key={item.id}
                        item={item}
                        status={getStatus(item.id)}
                        note={getNote(item.id)}
                        onStatus={(s) => updateItemStatus(item.id, s)}
                        onNote={(n) => updateNote(item.id, n)}
                        onJump={() => {
                          setCurrentIdx(startIdx + ii);
                          setMode('focus');
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
