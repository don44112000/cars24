/**
 * Step 4 — Forms.
 *
 * Shows ONLY the forms applicable to the user's role + scenario flags
 * (via recommendForms()). Each form is prefilled with anything we already
 * know — facts from extraction or manual entry, plus user-typed party
 * details persisted in dealStore.formAnswers.
 *
 * The user toggles "Filed" once they've printed and submitted the form
 * to the RTO. The toggle contributes to the final submission package.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Eye, FileText, Sparkles, Check as CheckIcon } from 'lucide-react';
import {
  Combobox, DateField, Field, FormFillModal, NumberField, PreviewModal, RegNoField, ToggleRow,
} from '../../components/FormShared';
import {
  emptyAnswers,
  FORM_META,
  recommendForms,
  type FormId,
  type WizardAnswers,
} from '../../data/formGenerator';
import {
  INDIAN_STATES, MAHARASHTRA_RTOS, POPULAR_BANKS, POPULAR_MAKES, VEHICLE_CLASSES,
} from '../../data/formOptions';
import { prefillFormAnswers } from '../../data/factsMapping';
import { useChecklistStore } from '../../store/checklistStore';
import { emptyDealFacts } from '../../types/checklist';
import styles from './WizardForms.module.css';

type FieldKey = keyof WizardAnswers;

const FORM_FIELDS: Record<FormId, FieldKey[]> = {
  form28: ['regNo', 'chassisNo', 'engineNo', 'vehicleClass', 'ownerName', 'ownerParent', 'ownerAddress', 'ownerMobile', 'ownerRTO', 'otherPartyName', 'buyerRTO', 'buyerState', 'hasLoan', 'bankName', 'bankAddress', 'applicationDate'],
  form29: ['regNo', 'chassisNo', 'engineNo', 'make', 'model', 'ownerName', 'ownerAddress', 'ownerRTO', 'otherPartyName', 'otherPartyParent', 'otherPartyAddress', 'saleDate', 'applicationDate', 'hasLoan', 'bankName'],
  form30: ['regNo', 'otherPartyName', 'otherPartyParent', 'otherPartyAddress', 'ownerName', 'ownerParent', 'ownerAddress', 'ownerMobile', 'buyerRTO', 'saleDate', 'applicationDate', 'hasLoan', 'bankName', 'bankAddress'],
  form32: ['regNo', 'chassisNo', 'engineNo', 'make', 'model', 'vehicleClass', 'ownerName', 'ownerParent', 'ownerMobile', 'buyerRTO', 'applicationDate'],
  form35: ['regNo', 'ownerMobile', 'ownerRTO', 'bankName', 'bankAddress', 'applicationDate'],
  form36: ['regNo', 'make', 'model', 'ownerName', 'ownerAddress', 'ownerMobile', 'ownerRTO', 'otherPartyName', 'otherPartyAddress', 'applicationDate'],
};

const LABELS: Record<string, string> = {
  regNo: 'Registration Number',
  chassisNo: 'Chassis Number',
  engineNo: 'Engine Number',
  vehicleClass: 'Vehicle Class',
  make: 'Make',
  model: 'Model',
  ownerName: 'Your Name',
  ownerParent: "Father / Husband Name",
  ownerAddress: 'Your Address',
  ownerMobile: 'Your Mobile',
  ownerRTO: 'RTO (where RC is registered)',
  buyerRTO: "Buyer's RTO",
  buyerState: "Buyer's State",
  otherPartyName: "Other Party's Name",
  otherPartyParent: "Other Party's Father / Husband",
  otherPartyAddress: "Other Party's Address",
  otherPartyMobile: "Other Party's Mobile",
  otherPartyAge: "Other Party's Age",
  bankName: 'Bank / Financier Name',
  bankAddress: 'Bank Address',
  saleDate: 'Date of Sale',
  applicationDate: 'Application Date',
  hasLoan: 'Has active or recently-closed loan?',
};

export default function WizardForms() {
  const navigate = useNavigate();
  const activeSession = useChecklistStore((s) => s.activeSession);
  const setFormAnswers = useChecklistStore((s) => s.setFormAnswers);
  const setFormFiled = useChecklistStore((s) => s.setFormFiled);
  const setCurrentStep = useChecklistStore((s) => s.setCurrentStep);

  const [selected, setSelected] = useState<FormId | null>(null);
  const [previewing, setPreviewing] = useState<FormId | null>(null);

  // Compute the canonical form-answers we'll work with: store value, prefilled
  // by the latest facts, intent set from the role.
  const role = activeSession?.role ?? 'buyer';
  const flags = activeSession?.scenarioFlags ?? { hasLoan: false, isOutOfState: false, isSameRTO: true };
  const facts = activeSession?.facts ?? emptyDealFacts();

  const baseAnswers = useMemo<WizardAnswers>(() => {
    const stored = activeSession?.formAnswers ?? emptyAnswers();
    const seeded: WizardAnswers = {
      ...stored,
      intent: role,
      hasLoan: flags.hasLoan,
      isOutOfState: role === 'buyer' && flags.isOutOfState,
      takingOutOfState: role === 'seller' && flags.isOutOfState,
    };
    return prefillFormAnswers(seeded, facts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, activeSession?.formAnswers, facts.regNo, facts.chassisNo, facts.engineNo, facts.ownerName, facts.hypothecationBank, role, flags.hasLoan, flags.isOutOfState]);

  // Persist the seeded answers back to the store once on mount so future
  // steps see the prefilled values.
  useEffect(() => {
    if (!activeSession) return;
    setFormAnswers(baseAnswers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  const recommendations = useMemo(() => recommendForms(baseAnswers), [baseAnswers]);

  const setField = (k: FieldKey, v: string | boolean) => {
    setFormAnswers({ [k]: v } as Partial<WizardAnswers>);
  };

  const renderField = (k: FieldKey) => {
    const label = LABELS[k] ?? k;
    const v = baseAnswers[k];

    if (k === 'hasLoan') {
      return (
        <ToggleRow
          key={k}
          label={label}
          value={!!v}
          onChange={(b) => setField('hasLoan', b)}
        />
      );
    }
    if (k === 'regNo') {
      return (
        <RegNoField key={k} label={label} value={String(v)} onChange={(val) => setField('regNo', val)} full />
      );
    }
    if (k === 'vehicleClass') {
      return (
        <Combobox key={k} label={label} value={String(v)} onChange={(val) => setField('vehicleClass', val)} options={[...VEHICLE_CLASSES]} placeholder="Search class…" />
      );
    }
    if (k === 'make') {
      return (
        <Combobox key={k} label={label} value={String(v)} onChange={(val) => setField('make', val)} options={[...POPULAR_MAKES]} placeholder="Search make…" />
      );
    }
    if (k === 'bankName') {
      return (
        <Combobox key={k} label={label} value={String(v)} onChange={(val) => setField('bankName', val)} options={[...POPULAR_BANKS]} placeholder="Search bank…" full />
      );
    }
    if (k === 'buyerState') {
      return (
        <Combobox key={k} label={label} value={String(v)} onChange={(val) => setField('buyerState', val)} options={[...INDIAN_STATES]} placeholder="Search state…" />
      );
    }
    if (k === 'ownerRTO' || k === 'buyerRTO') {
      return (
        <Combobox key={k} label={label} value={String(v)} onChange={(val) => setField(k, val)} options={MAHARASHTRA_RTOS.map((r) => r.display)} placeholder="Search RTO…" full />
      );
    }
    if (k === 'saleDate' || k === 'applicationDate') {
      return (
        <DateField key={k} label={label} value={String(v)} onChange={(val) => setField(k, val)} />
      );
    }
    if (k === 'ownerMobile' || k === 'otherPartyMobile') {
      return (
        <NumberField key={k} label={label} value={String(v)} onChange={(val) => setField(k, val)} maxLength={10} kind="tel" />
      );
    }
    if (k === 'otherPartyAge') {
      return (
        <NumberField key={k} label={label} value={String(v)} onChange={(val) => setField(k, val)} kind="age" min={18} max={120} />
      );
    }

    const isFull = k === 'ownerAddress' || k === 'otherPartyAddress' || k === 'bankAddress' || k === 'chassisNo' || k === 'engineNo';
    return (
      <Field key={k} label={label} value={String(v)} onChange={(val) => setField(k, val)} full={isFull} />
    );
  };

  const continueToResults = () => {
    setCurrentStep(5);
    navigate('/wizard/results');
  };

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Step 4 — Pre-filled RTO Forms</h1>
      <p className={styles.subtitle}>
        Only the forms relevant to your situation are shown. Anything you've
        already provided (in Verify or earlier) is pre-filled. Edit, preview,
        print — toggle "Filed" once you've handed it in.
      </p>

      {(facts.regNo || facts.ownerName) && (
        <div className={styles.factsSummary}>
          <Sparkles size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className={styles.factsSummaryHeader}>Facts loaded — auto-prefilled into all forms below.</p>
            <p className={styles.factsSummaryBody}>
              {[
                facts.regNo && `Reg ${facts.regNo}`,
                facts.chassisNo && `Chassis present`,
                facts.engineNo && `Engine present`,
                facts.ownerName && `Owner ${facts.ownerName}`,
                facts.hypothecationBank
                  ? `Bank ${facts.hypothecationBank}`
                  : 'No bank',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
      )}

      {recommendations.length === 0 ? (
        <div className={styles.empty}>
          No forms required for this scenario. You can still browse all forms
          on the standalone <Link to="/forms">Form Generator</Link> page.
        </div>
      ) : (
        <div className={styles.cards}>
          {recommendations.map((rec) => {
            const meta = FORM_META[rec.id];
            const filed = activeSession?.formsFiled?.[rec.id] === true;
            return (
              <div key={rec.id} className={`${styles.card} ${filed ? styles.cardFiled : ''}`}>
                <div className={styles.cardHead}>
                  <span className={styles.cardBadge}>{meta.title}</span>
                  <label className={styles.filedToggle}>
                    <input
                      type="checkbox"
                      checked={filed}
                      onChange={(e) => setFormFiled(rec.id, e.target.checked)}
                    />
                    {filed ? (
                      <>
                        <CheckIcon size={13} /> Filed
                      </>
                    ) : (
                      'Mark filed'
                    )}
                  </label>
                </div>
                <div className={styles.cardSubtitle}>{meta.subtitle}</div>
                <p className={styles.cardWhy}>{rec.why}</p>
                <div className={styles.cardMeta}>
                  <span><strong>Files:</strong> {rec.whoFiles}</span>
                  <span><strong>Copies:</strong> {rec.copies}</span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.cardBtn}
                    type="button"
                    onClick={() => setSelected(rec.id)}
                  >
                    <FileText size={13} /> Edit fields
                  </button>
                  <button
                    className={`${styles.cardBtn} ${styles.cardBtnPrimary}`}
                    type="button"
                    onClick={() => setPreviewing(rec.id)}
                  >
                    <Eye size={13} /> Preview & Print
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.actions}>
        <Link to="/wizard/check" className={styles.backBtn}>
          <ArrowLeft size={14} /> Back to Checklist
        </Link>
        <button className={styles.continueBtn} onClick={continueToResults}>
          See Readiness Score <ArrowRight size={16} />
        </button>
      </div>

      <AnimatePresence>
        {selected && !previewing && (
          <FormFillModal
            key={`fill-${selected}`}
            formId={selected}
            title="Edit form fields"
            hint="Anything you change here updates this form everywhere — including in your saved deal record."
            onClose={() => setSelected(null)}
            onPreview={() => setPreviewing(selected)}
          >
            <div className={styles.fillBody}>
              <div className={styles.fieldGrid}>
                {FORM_FIELDS[selected].map((k) => renderField(k))}
              </div>
            </div>
          </FormFillModal>
        )}
        {previewing && (
          <PreviewModal
            formId={previewing}
            answers={baseAnswers}
            onClose={() => setPreviewing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
