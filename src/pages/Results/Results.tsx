import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, RotateCcw, Printer, IndianRupee,
  Clock, FileText, AlertTriangle, CheckCircle2,
  Sparkles, Wand2, Wrench,
} from 'lucide-react';
import { useChecklist } from '../../hooks/useChecklist';
import { useChecklistStore } from '../../store/checklistStore';
import styles from './Results.module.css';

// ── Fee Estimate Logic ──

interface FeeLineItem {
  label: string;
  amount: string;
  minAmount: number;
  maxAmount: number;
  tag: 'required' | 'conditional' | 'optional';
}

function getEstimatedFees(
  role: 'buyer' | 'seller',
  flags: { hasLoan: boolean; isOutOfState: boolean; isSameRTO: boolean }
): { items: FeeLineItem[]; totalMin: number; totalMax: number } {
  const items: FeeLineItem[] = [];

  if (role === 'buyer') {
    items.push({
      label: 'RC Transfer Fee (Car)',
      amount: '₹300',
      minAmount: 300,
      maxAmount: 300,
      tag: 'required',
    });
    items.push({
      label: 'Smart Card Fee (RC reissuance)',
      amount: '₹200 – ₹300',
      minAmount: 200,
      maxAmount: 300,
      tag: 'required',
    });
    items.push({
      label: 'Application & Processing Fee',
      amount: '₹100 – ₹200',
      minAmount: 100,
      maxAmount: 200,
      tag: 'required',
    });
    items.push({
      label: 'PUC Certificate',
      amount: '₹60 – ₹100',
      minAmount: 60,
      maxAmount: 100,
      tag: 'required',
    });
    items.push({
      label: 'Notarised Sale Agreement',
      amount: '₹50 – ₹200',
      minAmount: 50,
      maxAmount: 200,
      tag: 'required',
    });

    if (!flags.isSameRTO) {
      items.push({
        label: 'NOC Application Fee (Form 28)',
        amount: '₹100',
        minAmount: 100,
        maxAmount: 100,
        tag: 'conditional',
      });
    }

    if (flags.hasLoan) {
      items.push({
        label: 'HP Termination Fee',
        amount: '₹100 – ₹500',
        minAmount: 100,
        maxAmount: 500,
        tag: 'conditional',
      });
    }

    if (flags.isOutOfState) {
      items.push({
        label: 'Road Tax (Maharashtra re-registration)',
        amount: '2% – 12% of value',
        minAmount: 5000,
        maxAmount: 50000,
        tag: 'required',
      });
      items.push({
        label: 'NCRB Clearance Certificate',
        amount: '₹100 – ₹500',
        minAmount: 100,
        maxAmount: 500,
        tag: 'required',
      });
    }
  } else {
    // Seller
    items.push({
      label: 'Road Tax Clearance',
      amount: 'Varies',
      minAmount: 0,
      maxAmount: 0,
      tag: 'required',
    });
    items.push({
      label: 'PUC Certificate Renewal',
      amount: '₹60 – ₹100',
      minAmount: 60,
      maxAmount: 100,
      tag: 'required',
    });
    items.push({
      label: 'Notarised Sale Agreement',
      amount: '₹50 – ₹200',
      minAmount: 50,
      maxAmount: 200,
      tag: 'required',
    });
    items.push({
      label: 'RPAD Postal Submission',
      amount: '₹50 – ₹80',
      minAmount: 50,
      maxAmount: 80,
      tag: 'optional',
    });

    if (flags.hasLoan) {
      items.push({
        label: 'HP Termination Fee',
        amount: '₹100 – ₹500',
        minAmount: 100,
        maxAmount: 500,
        tag: 'conditional',
      });
      items.push({
        label: 'Loan Foreclosure Penalty (up to 2%)',
        amount: 'Varies by bank',
        minAmount: 0,
        maxAmount: 0,
        tag: 'conditional',
      });
    }
  }

  const totalMin = items.reduce((sum, i) => sum + i.minAmount, 0);
  const totalMax = items.reduce((sum, i) => sum + i.maxAmount, 0);

  return { items, totalMin, totalMax };
}

// ── Timeline items based on scenario ──

function getTimelineItems(
  role: 'buyer' | 'seller',
  flags: { hasLoan: boolean; isOutOfState: boolean; isSameRTO: boolean }
) {
  const items: { label: string; value: string; color: string }[] = [];

  if (role === 'buyer') {
    items.push({ label: 'Apply for RC transfer', value: 'Within 30 days of purchase', color: 'var(--color-critical)' });
    if (flags.hasLoan) {
      items.push({ label: 'HP termination processing', value: '7 – 30 working days', color: 'var(--color-cta)' });
    }
    if (flags.isOutOfState) {
      items.push({ label: 'NOC from original state', value: '1 – 4 weeks', color: 'var(--color-cta)' });
      items.push({ label: 'Maharashtra re-registration', value: '30 – 60+ days', color: 'var(--color-advisory)' });
    } else {
      items.push({
        label: 'RC transfer processing',
        value: flags.isSameRTO ? '7 – 10 working days (online)' : 'Up to 30 days',
        color: 'var(--color-advisory)',
      });
    }
    items.push({ label: 'New RC smart card delivery', value: 'A few weeks after approval', color: 'var(--color-success)' });
  } else {
    items.push({ label: 'Submit Form 29 + 30 to RTO', value: 'Within 14 days of sale', color: 'var(--color-critical)' });
    if (flags.hasLoan) {
      items.push({ label: 'HP termination processing', value: '7 – 30 working days', color: 'var(--color-cta)' });
    }
    items.push({ label: 'Obtain RTO acknowledgement', value: 'At time of submission', color: 'var(--color-advisory)' });
    items.push({ label: 'Liability ends', value: 'Upon RTO acknowledgement', color: 'var(--color-success)' });
  }

  return items;
}

// ── Documents needed ──

function getDocumentsNeeded(
  role: 'buyer' | 'seller',
  flags: { hasLoan: boolean; isOutOfState: boolean }
) {
  const docs: { name: string; needed: boolean }[] = [];

  if (role === 'buyer') {
    docs.push({ name: 'Original RC book (physical)', needed: true });
    docs.push({ name: 'Form 29 (2 copies, both signed)', needed: true });
    docs.push({ name: 'Form 30 (buyer\'s application)', needed: true });
    docs.push({ name: 'Valid insurance policy', needed: true });
    docs.push({ name: 'Valid PUC certificate', needed: true });
    docs.push({ name: 'PAN card copy / Form 60', needed: true });
    docs.push({ name: 'Address proof (Aadhaar / Passport)', needed: true });
    docs.push({ name: 'Passport-size photo (certified)', needed: true });
    docs.push({ name: 'Notarised sale agreement', needed: true });
    docs.push({ name: 'Bank NOC + Form 35', needed: flags.hasLoan });
    docs.push({ name: 'Form 28 (NOC application)', needed: flags.isOutOfState });
    docs.push({ name: 'NCRB Clearance Certificate', needed: flags.isOutOfState });
  } else {
    docs.push({ name: 'Original RC book (physical)', needed: true });
    docs.push({ name: 'Form 29 (2 copies, both signed)', needed: true });
    docs.push({ name: 'Form 30 (filled for buyer)', needed: true });
    docs.push({ name: 'Valid insurance policy', needed: true });
    docs.push({ name: 'Valid PUC certificate', needed: true });
    docs.push({ name: 'Notarised sale agreement', needed: true });
    docs.push({ name: 'Road tax clearance receipt', needed: true });
    docs.push({ name: 'Bank NOC + Form 35', needed: flags.hasLoan });
  }

  return docs;
}

// ══════════════════════════════════
// COMPONENT
// ══════════════════════════════════

export default function Results() {
  const { activeSession, visibleItems, progress } = useChecklist();
  const clearActiveSession = useChecklistStore((s) => s.clearActiveSession);

  const actionItems = useMemo(() => {
    if (!activeSession) return [];
    return visibleItems.filter((item) => activeSession.items[item.id] === 'no');
  }, [visibleItems, activeSession]);

  if (!activeSession) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <h2>No Active Session</h2>
          <p>Start a check to see your results here.</p>
          <Link to="/start" className={styles.btnCta}>
            Start Check
          </Link>
        </div>
      </div>
    );
  }

  const { role, vehicleRegNo, scenarioFlags } = activeSession;
  const score = progress.readinessScore;
  const circumference = 2 * Math.PI * 66;
  const dashOffset = circumference - (score / 100) * circumference;

  const fees = getEstimatedFees(role, scenarioFlags);
  const timeline = getTimelineItems(role, scenarioFlags);
  const documents = getDocumentsNeeded(role, scenarioFlags);

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'var(--color-success)';
    if (s >= 50) return 'var(--color-important)';
    return 'var(--color-critical)';
  };

  const getVerdict = (s: number) => {
    if (s === 100) return '🎉 Fully Ready for RC Transfer';
    if (s >= 80) return '✅ Almost Ready — Minor Items Left';
    if (s >= 50) return '⚠️ Partially Ready — Action Required';
    if (s > 0) return '🔴 Not Ready — Multiple Issues Found';
    return '📋 Checklist Not Started';
  };

  const getMessage = (s: number) => {
    if (s === 100) return 'All applicable checkpoints have been cleared. You can proceed with the RC transfer process at your local RTO.';
    if (s >= 80) return 'You\'re close! Review the action items below to resolve the remaining issues before visiting the RTO.';
    if (s >= 50) return 'Several items still need attention. Complete the action items before proceeding to avoid delays or rejection at the RTO.';
    if (s > 0) return 'Multiple critical items are unresolved. Address all action items listed below before attempting the RC transfer.';
    return 'Complete the checklist to see your readiness score and estimated costs.';
  };

  const roleLabel = role === 'buyer' ? 'Buyer' : 'Seller';

  const formatFeeRange = (min: number, max: number) => {
    if (min === 0 && max === 0) return 'Varies';
    if (min === max) return `₹${min.toLocaleString('en-IN')}`;
    return `₹${min.toLocaleString('en-IN')} – ₹${max.toLocaleString('en-IN')}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>RC Transfer Readiness Report</h1>
          <div className={styles.pageMeta}>
            {roleLabel} · {vehicleRegNo || 'No registration entered'} · Generated{' '}
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* ── Score Hero Card ── */}
        <motion.div
          className={styles.scoreCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.scoreCardInner}>
            {/* Ring */}
            <div className={styles.scoreRing}>
              <svg viewBox="0 0 148 148">
                <circle className={styles.scoreTrack} cx="74" cy="74" r="66" />
                <circle
                  className={styles.scoreFill}
                  cx="74"
                  cy="74"
                  r="66"
                  stroke={getScoreColor(score)}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className={styles.scoreCenter}>
                <div className={styles.scoreNumber} style={{ color: getScoreColor(score) }}>
                  {score}
                </div>
                <div className={styles.scoreUnit}>/ 100</div>
              </div>
            </div>

            {/* Info */}
            <div className={styles.scoreInfo}>
              <div className={styles.scoreVerdict}>{getVerdict(score)}</div>
              <div className={styles.scoreMessage}>{getMessage(score)}</div>

              <div className={styles.miniStats}>
                <div className={styles.miniStat}>
                  <div className={styles.miniStatDot} style={{ background: 'var(--color-success)' }} />
                  <span className={styles.miniStatLabel}>Ready</span>
                  <span className={styles.miniStatValue}>{progress.yesCount}</span>
                </div>
                <div className={styles.miniStat}>
                  <div className={styles.miniStatDot} style={{ background: 'var(--color-critical)' }} />
                  <span className={styles.miniStatLabel}>Action</span>
                  <span className={styles.miniStatValue}>{progress.noCount}</span>
                </div>
                <div className={styles.miniStat}>
                  <div className={styles.miniStatDot} style={{ background: 'var(--color-text-muted)' }} />
                  <span className={styles.miniStatLabel}>Skipped</span>
                  <span className={styles.miniStatValue}>{progress.naCount}</span>
                </div>
                <div className={styles.miniStat}>
                  <div className={styles.miniStatDot} style={{ background: 'var(--color-primary)' }} />
                  <span className={styles.miniStatLabel}>Pending</span>
                  <span className={styles.miniStatValue}>{progress.pendingCount}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Estimated Government Fees ── */}
        <motion.div
          className={styles.feeSection}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon} style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              <IndianRupee size={16} />
            </span>
            Estimated Government & Processing Fees
          </h2>

          <div className={styles.feeCard}>
            <div className={styles.feeHeader}>
              <div className={styles.feeHeaderLabel}>Estimated Total Cost</div>
              <div className={styles.feeHeaderTotal}>
                {formatFeeRange(fees.totalMin, fees.totalMax)}
              </div>
            </div>

            <div className={styles.feeList}>
              {fees.items.map((fee, i) => (
                <div key={i} className={styles.feeRow}>
                  <span className={styles.feeRowLabel}>
                    {fee.label}
                    <span className={`${styles.feeRowTag} ${
                      fee.tag === 'required' ? styles.tagRequired :
                      fee.tag === 'conditional' ? styles.tagConditional :
                      styles.tagOptional
                    }`}>
                      {fee.tag}
                    </span>
                  </span>
                  <span className={styles.feeRowAmount}>{fee.amount}</span>
                </div>
              ))}
            </div>

            <div className={styles.feeDisclaimer}>
              * Fees are approximate and based on Maharashtra RTO rates as per Central MV Rules 1989.
              Road tax for interstate vehicles varies by vehicle value and age. Verify exact amounts at your local RTO.
            </div>
          </div>
        </motion.div>

        {/* ── Action Items ── */}
        <motion.div
          className={styles.actionSection}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon} style={{ background: 'var(--color-critical-bg)', color: 'var(--color-critical)' }}>
              <AlertTriangle size={16} />
            </span>
            {actionItems.length > 0
              ? `Action Items Required (${actionItems.length})`
              : 'Action Items'}
          </h2>

          {actionItems.length === 0 ? (
            <div className={styles.noActions}>
              <CheckCircle2 size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
              No action items — all applicable checks passed or skipped!
            </div>
          ) : (
            <div className={styles.actionList}>
              {actionItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  className={styles.actionItem}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                >
                  <div className={styles.actionItemHeader}>
                    <span className={styles.actionItemId}>{item.id}</span>
                    <div className={styles.actionItemTitle}>{item.title}</div>
                    <span
                      className={styles.actionItemSeverity}
                      style={{
                        background: item.severity === 'critical' ? 'var(--color-critical-bg)' : 'var(--color-important-bg)',
                        color: item.severity === 'critical' ? 'var(--color-critical)' : '#E65100',
                      }}
                    >
                      {item.severity}
                    </span>
                  </div>

                  {item.description && (
                    <p className={styles.actionItemDesc}>{item.description}</p>
                  )}

                  {item.fields && item.fields.length > 0 && (
                    <div className={styles.actionItemFields}>
                      <div className={styles.actionItemFieldsLabel}>What to verify</div>
                      <ul>
                        {item.fields.map((f, fi) => (
                          <li key={fi}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className={styles.actionItemFixBlock}>
                    <div className={styles.actionItemFixTitle}>
                      <Wrench size={12} /> Next steps to resolve
                    </div>
                    <ol className={styles.actionItemFixSteps}>
                      {item.fixSteps.map((step, si) => (
                        <li key={si}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Expected Timeline ── */}
        <motion.div
          className={styles.timelineSection}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon} style={{ background: '#E3F2FD', color: 'var(--color-advisory)' }}>
              <Clock size={16} />
            </span>
            Expected Timeline
          </h2>

          <div className={styles.timelineCard}>
            {timeline.map((t, i) => (
              <div key={i} className={styles.timelineRow}>
                <div className={styles.timelineDot} style={{ background: t.color }} />
                <span className={styles.timelineLabel}>{t.label}</span>
                <span className={styles.timelineValue}>{t.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Documents Required ── */}
        <motion.div
          className={styles.docsSection}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon} style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <FileText size={16} />
            </span>
            Documents Required
          </h2>

          <div className={styles.docsCard}>
            <div className={styles.docsGrid}>
              {documents.map((doc, i) => (
                <div key={i} className={styles.docItem}>
                  {doc.needed ? (
                    <span className={styles.docCheck}>✔</span>
                  ) : (
                    <span className={styles.docMissing}>—</span>
                  )}
                  <span style={{ opacity: doc.needed ? 1 : 0.5 }}>{doc.name}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Smart Forms Nudge ── */}
        <motion.div
          className={styles.formsNudge}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <div className={styles.formsNudgeLeft}>
            <div className={styles.formsNudgeBadge}>
              <Sparkles size={14} /> AI-Assisted
            </div>
            <h2 className={styles.formsNudgeTitle}>Skip the paperwork — generate your RTO forms now</h2>
            <p className={styles.formsNudgeDesc}>
              Based on your situation, you'll need {(() => {
                const forms: string[] = [];
                if (role === 'buyer') {
                  forms.push('Form 29', 'Form 30');
                  if (!scenarioFlags.isSameRTO || scenarioFlags.isOutOfState) forms.push('Form 28');
                } else {
                  forms.push('Form 29', 'Form 30');
                }
                if (scenarioFlags.hasLoan) forms.push('Form 35');
                return forms.join(', ');
              })()}. Answer a few questions and get pre-filled, print-ready forms in seconds.
            </p>
            <ul className={styles.formsNudgeFeatures}>
              <li><Wand2 size={14} /> Auto-fills owner, vehicle &amp; bank details</li>
              <li><Printer size={14} /> Live preview, edit &amp; print or save as PDF</li>
            </ul>
            <Link to="/forms" className={styles.formsNudgeCta}>
              Generate My Forms <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>

        {/* ── Bottom Actions ── */}
        <div className={styles.bottomActions}>
          <Link to="/check" className={styles.btnPrimary}>
            <ArrowLeft size={16} /> Back to Checklist
          </Link>
          <button
            className={styles.btnSecondary}
            onClick={() => window.print()}
          >
            <Printer size={16} /> Print Report
          </button>
          <Link
            to="/start"
            className={styles.btnSecondary}
            onClick={() => clearActiveSession()}
          >
            <RotateCcw size={16} /> Start Over
          </Link>
        </div>
      </div>
    </div>
  );
}
