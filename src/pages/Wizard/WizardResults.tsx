/**
 * Step 5 — Readiness Report.
 *
 * Three blocks:
 *   1. Score gauge — severity-weighted progress minus AI penalty.
 *   2. Top 3 next actions — highest-priority unaddressed items, with
 *      fix-steps inline + "Mark fixed" CTA + "Open form" CTA when
 *      relatedForm is set.
 *   3. Submission package — per-document checklist + applicable fees +
 *      timeline + the forms toggled "Filed".
 *
 * Doc-mandated stop banner appears above the gauge if `hasStopCondition`
 * is true (any critical 'no' or AI red flag failing).
 */

import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Clock, FileText, IndianRupee,
  Printer, RotateCcw, Sparkles, Target, Wrench,
} from 'lucide-react';
import { useChecklist } from '../../hooks/useChecklist';
import { useChecklistStore } from '../../store/checklistStore';
import {
  FORM_META, recommendForms, type FormId,
} from '../../data/formGenerator';
import {
  feesReference, timelinesReference,
} from '../../data/reference';
import styles from './WizardResults.module.css';

type SeverityKey = 'critical' | 'important' | 'advisory' | 'branching';

const severityRank = (s: SeverityKey): number => {
  if (s === 'critical') return 0;
  if (s === 'important') return 1;
  if (s === 'advisory') return 2;
  return 3;
};

export default function WizardResults() {
  const { activeSession, visibleItems, progress, getStatus, getAutoReason, updateItemStatus } = useChecklist();
  const markCompleted = useChecklistStore((s) => s.markCompleted);
  const navigate = useNavigate();

  // Mark the deal completed once they reach this page (idempotent — only on first arrival).
  useEffect(() => {
    if (activeSession && !activeSession.completedAt) {
      markCompleted();
    }
  }, [activeSession, markCompleted]);

  const score = progress.readinessScore;
  const hasStop = progress.hasStopCondition;

  const scoreColor =
    hasStop ? '#dc2626' : score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#dc2626';

  const verdict =
    hasStop ? 'STOP — red flags detected'
    : score >= 90 ? 'Ready to file'
    : score >= 70 ? 'Almost ready'
    : score >= 50 ? 'Partially ready'
    : 'Significant work remaining';

  const verdictDesc = hasStop
    ? 'Per the verification guide, stop the deal until every red item below is resolved. The numeric score is overridden by these blockers.'
    : score >= 90
    ? 'All applicable critical items cleared and AI cross-checks are clean. Take your filed forms and supporting documents to the RTO.'
    : score >= 70
    ? "You're close — clear the few items below before filing."
    : score >= 50
    ? 'Several items still need attention. Address them before submitting to the RTO to avoid rejection.'
    : 'Many items are unresolved. Work through the top actions below before proceeding.';

  // ── Top 3 actions ──
  // Priority: status='no' first (highest severity wins), then 'pending' critical/important.
  const topActions = useMemo(() => {
    const byPriority = (a: typeof visibleItems[number], b: typeof visibleItems[number]) => {
      const aStatus = getStatus(a.id);
      const bStatus = getStatus(b.id);
      const aPri = aStatus === 'no' ? 0 : aStatus === 'pending' ? 1 : 2;
      const bPri = bStatus === 'no' ? 0 : bStatus === 'pending' ? 1 : 2;
      if (aPri !== bPri) return aPri - bPri;
      return severityRank(a.severity) - severityRank(b.severity);
    };
    return [...visibleItems]
      .filter((i) => {
        const s = getStatus(i.id);
        return s === 'no' || s === 'pending';
      })
      .sort(byPriority)
      .slice(0, 3);
  }, [visibleItems, getStatus]);

  // ── Submission package ──
  const role = activeSession?.role ?? 'buyer';
  const hasLoan = activeSession?.scenarioFlags.hasLoan ?? false;
  const isOutOfState = activeSession?.scenarioFlags.isOutOfState ?? false;
  const formsFiled = activeSession?.formsFiled ?? {};
  const formAnswers = activeSession?.formAnswers;
  const recommendedForms = useMemo(() => {
    if (!formAnswers) return [];
    return recommendForms(formAnswers);
  }, [formAnswers]);

  const docsForRtoSubmission = useMemo(() => {
    const docs: { name: string; needed: boolean }[] = [];
    if (role === 'buyer') {
      docs.push({ name: 'Original RC book / smart card', needed: true });
      docs.push({ name: 'Form 29 (2 copies, signed by both)', needed: true });
      docs.push({ name: 'Form 30 (filed by buyer)', needed: true });
      docs.push({ name: 'Valid insurance policy', needed: true });
      docs.push({ name: 'Valid PUC certificate', needed: true });
      docs.push({ name: 'PAN card copy / Form 60', needed: true });
      docs.push({ name: 'Address proof (Aadhaar / Passport)', needed: true });
      docs.push({ name: 'Passport-size photo with thumb impression', needed: true });
      docs.push({ name: 'Notarised sale agreement', needed: true });
      docs.push({ name: 'Bank NOC + Form 35', needed: hasLoan });
      docs.push({ name: 'Form 28 + NCRB Clearance', needed: isOutOfState });
    } else {
      docs.push({ name: 'Original RC handed to buyer', needed: true });
      docs.push({ name: 'Form 29 (2 copies, signed)', needed: true });
      docs.push({ name: 'Form 30 (filled, given to buyer)', needed: true });
      docs.push({ name: 'Insurance + PUC handed over', needed: true });
      docs.push({ name: 'Notarised sale agreement', needed: true });
      docs.push({ name: 'Road tax clearance receipt', needed: true });
      docs.push({ name: 'Bank NOC + Form 35', needed: hasLoan });
    }
    return docs.filter((d) => d.needed);
  }, [role, hasLoan, isOutOfState]);

  const applicableFees = useMemo(() => {
    return feesReference.filter((f) => {
      const lower = f.item.toLowerCase();
      if (lower.includes('hp termination') && !hasLoan) return false;
      if (lower.includes('out-of-state') && !isOutOfState) return false;
      if (lower.includes('out of state') && !isOutOfState) return false;
      return true;
    });
  }, [hasLoan, isOutOfState]);

  if (!activeSession) {
    return (
      <div className={styles.wrap}>
        <div className={styles.empty}>
          No active deal. <Link to="/wizard/setup">Begin Setup</Link>.
        </div>
      </div>
    );
  }

  const radius = 78;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Step 5 — Readiness Report</h1>
      <p className={styles.subtitle}>
        {role === 'buyer' ? 'Buyer flow' : 'Seller flow'}
        {activeSession.vehicleRegNo && ` · ${activeSession.vehicleRegNo}`}
        {' · '}generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>

      {hasStop && (
        <motion.div
          className={styles.stopBanner}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.stopIcon}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className={styles.stopTitle}>STOP — do not proceed yet</h2>
            <p className={styles.stopBody}>
              {progress.criticalNoCount > 0 && (
                <>
                  <strong>{progress.criticalNoCount}</strong> critical checklist item{progress.criticalNoCount === 1 ? '' : 's'} answered "No". {' '}
                </>
              )}
              {progress.redFlagCount > 0 && (
                <>
                  <strong>{progress.redFlagCount}</strong> AI red flag{progress.redFlagCount === 1 ? '' : 's'} unresolved.
                </>
              )}
              {' '}Per the doc verification guide, these are stop-the-deal conditions.
              Resolve them all before filing or handing over money.
            </p>
          </div>
        </motion.div>
      )}

      {/* Score gauge */}
      <motion.div
        className={styles.scoreCard}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.gauge}>
          <svg viewBox="0 0 180 180" className={styles.gaugeSvg}>
            <circle cx="90" cy="90" r={radius} className={styles.gaugeTrack} />
            <circle
              cx="90"
              cy="90"
              r={radius}
              className={styles.gaugeFill}
              stroke={scoreColor}
              strokeDasharray={circ}
              strokeDashoffset={offset}
            />
          </svg>
          <div className={styles.gaugeNumber}>
            <span className={styles.gaugeBig} style={{ color: scoreColor }}>{score}</span>
            <span className={styles.gaugeUnit}>/ 100</span>
          </div>
        </div>

        <div>
          <h2 className={styles.verdict}>{verdict}</h2>
          <p className={styles.verdictDesc}>{verdictDesc}</p>
          <div className={styles.minis}>
            <div className={styles.mini}>
              <span className={styles.miniDot} style={{ background: '#10b981' }} />
              <span className={styles.miniLbl}>Ready</span>
              <span className={styles.miniVal}>{progress.yesCount + progress.naCount + progress.fixedCount}</span>
            </div>
            <div className={styles.mini}>
              <span className={styles.miniDot} style={{ background: '#dc2626' }} />
              <span className={styles.miniLbl}>Action</span>
              <span className={styles.miniVal}>{progress.noCount}</span>
            </div>
            <div className={styles.mini}>
              <span className={styles.miniDot} style={{ background: '#9ca3af' }} />
              <span className={styles.miniLbl}>Pending</span>
              <span className={styles.miniVal}>{progress.pendingCount}</span>
            </div>
            {activeSession.aiOptIn === 'photos' && (
              <>
                <div className={styles.mini}>
                  <span className={styles.miniDot} style={{ background: '#dc2626' }} />
                  <span className={styles.miniLbl}>Red flags</span>
                  <span className={styles.miniVal}>{progress.redFlagCount}</span>
                </div>
                <div className={styles.mini}>
                  <span className={styles.miniDot} style={{ background: '#f59e0b' }} />
                  <span className={styles.miniLbl}>Yellow flags</span>
                  <span className={styles.miniVal}>{progress.yellowFlagCount}</span>
                </div>
              </>
            )}
          </div>
          <p className={styles.scoreNote}>
            Score = severity-weighted checklist progress (critical 3×, important 2×, advisory 1×){activeSession.aiOptIn === 'photos' ? ', minus 5 per red AI flag and 2 per yellow' : ''}.
          </p>
        </div>
      </motion.div>

      {/* Top 3 actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon} style={{ background: '#fef2f2', color: '#dc2626' }}>
            <Target size={15} />
          </span>
          Your next steps
        </h2>

        {topActions.length === 0 ? (
          <div className={styles.empty}>
            <CheckCircle2 size={18} />
            All applicable items addressed. You can move to filing.
          </div>
        ) : (
          <div className={styles.actions}>
            {topActions.map((item) => {
              const status = getStatus(item.id);
              const reason = getAutoReason(item.id);
              return (
                <div key={item.id} className={styles.actionItem}>
                  <div className={styles.actionHead}>
                    <span className={styles.actionId}>{item.id}</span>
                    <span className={styles.actionTitle}>{item.title}</span>
                    <span
                      className={`${styles.actionSev} ${
                        item.severity === 'critical' ? styles.sevCritical
                        : item.severity === 'important' ? styles.sevImportant
                        : styles.sevAdvisory
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>
                  <p className={styles.actionDesc}>{item.description}</p>
                  {reason && (
                    <div className={styles.actionWhy}>
                      <strong>Why this matters now:</strong> {reason}
                    </div>
                  )}
                  <div className={styles.actionFix}>
                    <p className={styles.actionFixTitle}>
                      <Wrench size={11} /> Fix steps
                    </p>
                    <ol className={styles.actionFixSteps}>
                      {item.fixSteps.slice(0, 4).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </div>
                  <div className={styles.actionCtas}>
                    {status !== 'fixed' && status !== 'yes' && (
                      <button
                        type="button"
                        className={`${styles.cta} ${styles.ctaPrimary}`}
                        onClick={() => updateItemStatus(item.id, 'fixed')}
                      >
                        Mark fixed
                      </button>
                    )}
                    {item.relatedForm && (
                      <button
                        type="button"
                        className={`${styles.cta} ${styles.ctaSecondary}`}
                        onClick={() => navigate('/wizard/forms')}
                      >
                        Open {FORM_META[item.relatedForm as FormId].title}
                      </button>
                    )}
                    <Link to="/wizard/check" className={`${styles.cta} ${styles.ctaSecondary}`}>
                      Open in checklist
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submission package */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon} style={{ background: '#ecfdf5', color: '#047857' }}>
            <FileText size={15} />
          </span>
          Submission package
        </h2>
        <div className={styles.pkg}>
          <div className={styles.pkgCol}>
            <h3>Forms ready</h3>
            <ul className={styles.pkgList}>
              {recommendedForms.length === 0 ? (
                <li className={styles.pkgPending}>No forms applicable.</li>
              ) : (
                recommendedForms.map((rec) => {
                  const meta = FORM_META[rec.id];
                  const filed = formsFiled[rec.id] === true;
                  return (
                    <li key={rec.id}>
                      {filed ? (
                        <CheckCircle2 size={14} className={styles.pkgCheck} />
                      ) : (
                        <span className={styles.pkgPending}>○</span>
                      )}
                      {meta.title} — {filed ? 'filed' : 'pending'}
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div className={styles.pkgCol}>
            <h3>Documents to bring</h3>
            <ul className={styles.pkgList}>
              {docsForRtoSubmission.map((d, i) => (
                <li key={i}>
                  <CheckCircle2 size={14} className={styles.pkgCheck} />
                  {d.name}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.pkgCol}>
            <h3>Estimated fees</h3>
            <div>
              {applicableFees.slice(0, 8).map((f, i) => (
                <div key={i} className={styles.feeRow}>
                  <span>{f.item}</span>
                  <strong>{f.amount}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.pkgCol}>
            <h3>
              <Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Timeline
            </h3>
            <ul className={styles.timelineList}>
              {timelinesReference.slice(0, 5).map((t, i) => (
                <li key={i} className={styles.timelineItem}>
                  <div className={styles.timelineActivity}>{t.activity}</div>
                  <div className={styles.timelineValue}>{t.timeline}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon} style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            <IndianRupee size={15} />
          </span>
          Cost estimate
        </h2>
        <div className={styles.pkg}>
          <div className={styles.pkgCol}>
            {applicableFees.map((f, i) => (
              <div key={i} className={styles.feeRow}>
                <span>{f.item}</span>
                <strong>{f.amount}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.bottomActions}>
        <Link to="/wizard/check" className={`${styles.bottomBtn} ${styles.bottomSecondary}`}>
          Back to Checklist
        </Link>
        <button className={`${styles.bottomBtn} ${styles.bottomSecondary}`} onClick={() => window.print()}>
          <Printer size={14} /> Print Report
        </button>
        <Link to="/history" className={`${styles.bottomBtn} ${styles.bottomSecondary}`}>
          <Sparkles size={14} /> View All Deals
        </Link>
        <Link to="/wizard/setup" className={`${styles.bottomBtn} ${styles.bottomPrimary}`}>
          <RotateCcw size={14} /> Edit Setup
        </Link>
      </div>
    </div>
  );
}
