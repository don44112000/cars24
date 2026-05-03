/**
 * Step 2 — Verify (optional).
 *
 * Three choices, each writing to dealStore.facts:
 *   - Photos: in-place AI extraction. Reuses the standalone Verify component.
 *   - Manual: short fact-entry form (8 fields).
 *   - Skip: nothing written; checklist runs purely manual.
 *
 * The user can switch between options at any time without losing prior data.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, Pencil, FastForward, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { useChecklistStore } from '../../store/checklistStore';
import { emptyDealFacts, type DealFacts } from '../../types/checklist';
import { hasAnyFacts } from '../../data/factsMapping';
import VerifyEmbed from '../Verify/Verify';
import styles from './WizardVerify.module.css';

type Mode = 'photos' | 'manual' | 'skip';

export default function WizardVerify() {
  const navigate = useNavigate();
  const activeSession = useChecklistStore((s) => s.activeSession);
  const setAiOptIn = useChecklistStore((s) => s.setAiOptIn);
  const setFacts = useChecklistStore((s) => s.setFacts);
  const resetExtractedFacts = useChecklistStore((s) => s.resetExtractedFacts);
  const setCurrentStep = useChecklistStore((s) => s.setCurrentStep);

  const [mode, setMode] = useState<Mode | null>(activeSession?.aiOptIn ?? null);

  // Local manual draft mirrored to store on Continue
  const [manual, setManual] = useState<DealFacts>(
    activeSession?.facts ?? emptyDealFacts(),
  );

  const pickMode = (m: Mode) => {
    setMode(m);
    setAiOptIn(m);
  };

  const handleContinue = () => {
    if (mode === 'manual') {
      setFacts(manual, 'manual');
    }
    if (mode === 'skip') {
      // Clear any extracted facts so the user isn't surprised by stale auto-marks.
      resetExtractedFacts();
    }
    setCurrentStep(3);
    navigate('/wizard/check');
  };

  const factsNow = activeSession?.facts ?? emptyDealFacts();
  const showManualSummary = mode === 'manual' && hasAnyFacts(manual);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Step 2 — Verify (optional)</h1>
      <p className={styles.subtitle}>
        Pick how to provide vehicle facts. Anything you provide here pre-fills
        the checklist and forms — entering things twice is not required.
      </p>

      <div className={styles.choices}>
        <button
          type="button"
          className={`${styles.choice} ${mode === 'photos' ? styles.choiceActive : ''}`}
          onClick={() => pickMode('photos')}
        >
          <div className={styles.choiceIcon}>
            <Camera size={18} />
          </div>
          <div className={styles.choiceBadge}>Recommended</div>
          <h3 className={styles.choiceTitle}>Upload photos (AI extraction)</h3>
          <p className={styles.choiceDesc}>
            Snap clear photos of RC, Aadhaar, insurance, PUC, NOC. The AI reads
            the fields and runs 25+ cross-checks from the doc verification guide.
          </p>
        </button>

        <button
          type="button"
          className={`${styles.choice} ${mode === 'manual' ? styles.choiceActive : ''}`}
          onClick={() => pickMode('manual')}
        >
          <div className={styles.choiceIcon}>
            <Pencil size={18} />
          </div>
          <h3 className={styles.choiceTitle}>Enter facts manually</h3>
          <p className={styles.choiceDesc}>
            Type the 8 key facts (reg no, chassis, owner, bank, fuel, expiry
            dates). Anything you fill is used by the smart checklist; blanks
            stay manual.
          </p>
        </button>

        <button
          type="button"
          className={`${styles.choice} ${mode === 'skip' ? styles.choiceActive : ''}`}
          onClick={() => pickMode('skip')}
        >
          <div className={styles.choiceIcon}>
            <FastForward size={18} />
          </div>
          <h3 className={styles.choiceTitle}>Skip — checklist only</h3>
          <p className={styles.choiceDesc}>
            No upfront facts. Walk through every checklist item yourself. The
            readiness score will be based only on your answers — no AI penalty
            applied.
          </p>
        </button>
      </div>

      {mode === 'photos' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Upload your documents</h3>
          <p className={styles.sectionSub}>
            Each upload is processed by the AI service. After extraction, facts
            flow into the store and the AI cross-checks penalise the readiness
            score for any red flags.
          </p>
          <div className={styles.embedFrame}>
            <VerifyEmbed />
          </div>
          <div className={styles.aiCallout}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              AI is a screening aid. Physical-authenticity checks (raised ink on
              NOC, hologram shimmer, tampered chassis plate, panel-gap mismatch)
              still need to be done in person — they are flagged in the
              checklist regardless of AI verdict.
            </span>
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Enter what you know</h3>
          <p className={styles.sectionSub}>
            All fields are optional. Anything you fill in pre-marks the relevant
            checklist items.
          </p>
          <div className={styles.manualGrid}>
            <ManualField
              label="Registration number"
              placeholder="MH 12 AB 1234"
              value={manual.regNo ?? ''}
              onChange={(v) => setManual({ ...manual, regNo: v.toUpperCase() })}
            />
            <ManualField
              label="Chassis number (VIN)"
              placeholder="MA3EWDE1S00123456"
              value={manual.chassisNo ?? ''}
              onChange={(v) => setManual({ ...manual, chassisNo: v.toUpperCase() })}
            />
            <ManualField
              label="Engine number"
              placeholder="K10B1234567"
              value={manual.engineNo ?? ''}
              onChange={(v) => setManual({ ...manual, engineNo: v.toUpperCase() })}
            />
            <ManualField
              label="Owner name (as on RC)"
              placeholder="Rajesh Kumar"
              value={manual.ownerName ?? ''}
              onChange={(v) => setManual({ ...manual, ownerName: v })}
            />
            <ManualField
              label="Hypothecation bank (blank if none)"
              placeholder="HDFC Bank — leave blank if no loan"
              value={manual.hypothecationBank ?? ''}
              onChange={(v) => setManual({ ...manual, hypothecationBank: v || null })}
            />
            <ManualField
              label="Fuel type"
              placeholder="PETROL / DIESEL / CNG"
              value={manual.fuelType ?? ''}
              onChange={(v) => setManual({ ...manual, fuelType: v.toUpperCase() })}
            />
            <ManualField
              label="Insurance valid upto"
              type="date"
              value={manual.insuranceValidUpto ?? ''}
              onChange={(v) => setManual({ ...manual, insuranceValidUpto: v || null })}
            />
            <ManualField
              label="PUC valid upto"
              type="date"
              value={manual.pucValidUpto ?? ''}
              onChange={(v) => setManual({ ...manual, pucValidUpto: v || null })}
            />
          </div>
          <div className={styles.checkRow}>
            <input
              type="checkbox"
              id="vahan-clear"
              checked={manual.vahanHypothecationCleared === true}
              onChange={(e) =>
                setManual({
                  ...manual,
                  vahanHypothecationCleared: e.target.checked ? true : null,
                })
              }
            />
            <label htmlFor="vahan-clear">
              I have checked the VAHAN portal and confirmed there is no
              hypothecation on this vehicle.{' '}
              <strong>(per docCheckList Field 1.5 key rule)</strong>
            </label>
          </div>
          {showManualSummary && (
            <div className={styles.summary}>
              <strong>Captured:</strong>{' '}
              {[
                manual.regNo && `Reg ${manual.regNo}`,
                manual.chassisNo && `Chassis ✓`,
                manual.ownerName && `Owner ${manual.ownerName}`,
                manual.hypothecationBank
                  ? `Bank ${manual.hypothecationBank}`
                  : 'No bank',
                manual.insuranceValidUpto && `Insurance ${manual.insuranceValidUpto}`,
                manual.pucValidUpto && `PUC ${manual.pucValidUpto}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
        </div>
      )}

      {mode === 'skip' && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>OK — manual checklist mode</h3>
          <p className={styles.sectionSub}>
            We'll walk you through every applicable checklist item and you
            answer each one. Auto-marks won't apply. You can always come back
            to this step later to upload photos or fill in facts.
          </p>
          {hasAnyFacts(factsNow) && (
            <div className={styles.aiCallout}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Heads up: you previously filled some facts. Continuing in skip
                mode will keep them, but they'll only pre-mark items if you
                switch back to a verify mode.
              </span>
            </div>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <Link to="/wizard/setup" className={styles.backBtn}>
          <ArrowLeft size={14} /> Back
        </Link>
        <button
          className={styles.continueBtn}
          onClick={handleContinue}
          disabled={!mode}
        >
          Continue to Checklist <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ManualField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  full,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  full?: boolean;
}) {
  return (
    <label className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type={type}
        className={styles.fieldInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
