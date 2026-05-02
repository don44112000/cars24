import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formsReference, feesReference, timelinesReference, legalReferences } from '../../data/reference';
import {
  emptyAnswers,
  type WizardAnswers, type FormId, type Intent,
} from '../../data/formGenerator';
import {
  VEHICLE_CLASSES, POPULAR_MAKES, POPULAR_BANKS, INDIAN_STATES, MAHARASHTRA_RTOS,
} from '../../data/formOptions';
import {
  Field, Combobox, DateField, ToggleRow, PreviewModal, FormFillModal,
} from '../../components/FormShared';
import styles from './Documents.module.css';

type Tab = 'forms' | 'fees' | 'timelines' | 'legal' | 'checklists';
type FieldKey = keyof WizardAnswers;

interface FieldGroup {
  label: string;
  fields: FieldKey[];
}

const FORM_FIELD_GROUPS: Record<FormId, FieldGroup[]> = {
  form28: [
    { label: 'Vehicle', fields: ['regNo', 'chassisNo', 'engineNo', 'vehicleClass'] },
    { label: 'Owner (You)', fields: ['ownerName', 'ownerParent', 'ownerAddress', 'ownerMobile', 'ownerRTO'] },
    { label: 'Buyer Details', fields: ['otherPartyName', 'buyerRTO', 'buyerState'] },
    { label: 'Loan / Hypothecation', fields: ['hasLoan', 'bankName', 'bankAddress'] },
    { label: 'Date', fields: ['applicationDate'] },
  ],
  form29: [
    { label: 'Vehicle', fields: ['regNo', 'chassisNo', 'engineNo', 'make', 'model'] },
    { label: 'Seller (You)', fields: ['ownerName', 'ownerAddress', 'ownerRTO'] },
    { label: 'Buyer (Transferee)', fields: ['otherPartyName', 'otherPartyParent', 'otherPartyAddress'] },
    { label: 'Dates', fields: ['saleDate', 'applicationDate'] },
    { label: 'Loan / Hypothecation', fields: ['hasLoan', 'bankName'] },
  ],
  form30: [
    { label: 'Vehicle', fields: ['regNo'] },
    { label: 'Seller (Transferor)', fields: ['otherPartyName', 'otherPartyParent', 'otherPartyAddress'] },
    { label: 'Buyer (You)', fields: ['ownerName', 'ownerParent', 'ownerAddress', 'ownerMobile'] },
    { label: 'RTO', fields: ['buyerRTO'] },
    { label: 'Dates', fields: ['saleDate', 'applicationDate'] },
    { label: 'Loan / Hypothecation', fields: ['hasLoan', 'bankName', 'bankAddress'] },
  ],
  form32: [
    { label: 'Vehicle', fields: ['regNo', 'chassisNo', 'engineNo', 'make', 'model', 'vehicleClass'] },
    { label: 'Applicant (You)', fields: ['ownerName', 'ownerParent', 'ownerMobile', 'buyerRTO'] },
    { label: 'Date', fields: ['applicationDate'] },
  ],
  form35: [
    { label: 'Vehicle', fields: ['regNo'] },
    { label: 'Owner', fields: ['ownerMobile', 'ownerRTO'] },
    { label: 'Bank / Financier', fields: ['bankName', 'bankAddress'] },
    { label: 'Date', fields: ['applicationDate'] },
  ],
  form36: [
    { label: 'Vehicle', fields: ['regNo', 'make', 'model'] },
    { label: 'Financier (You)', fields: ['ownerName', 'ownerAddress', 'ownerMobile', 'ownerRTO'] },
    { label: 'Defaulting Owner', fields: ['otherPartyName', 'otherPartyAddress'] },
    { label: 'Date', fields: ['applicationDate'] },
  ],
};

const BASE_LABELS: Partial<Record<FieldKey, string>> = {
  regNo: 'Registration Number',
  chassisNo: 'Chassis Number',
  engineNo: 'Engine Number',
  vehicleClass: 'Vehicle Class',
  make: 'Make (Brand)',
  model: 'Model',
  ownerName: 'Your Name',
  ownerParent: "Father's / Husband's Name",
  ownerAddress: 'Your Address',
  ownerMobile: 'Your Mobile',
  ownerRTO: 'RTO (where RC is registered)',
  buyerRTO: "Buyer's RTO",
  buyerState: "Buyer's State",
  otherPartyName: "Other Party's Name",
  otherPartyParent: "Other Party's Father / Husband",
  otherPartyAddress: "Other Party's Address",
  bankName: 'Bank / Financier Name',
  bankAddress: 'Bank / Financier Address',
  saleDate: 'Date of Sale',
  applicationDate: 'Application Date',
  hasLoan: 'Does the car have an active or recently-closed loan?',
};

const FORM_LABEL_OVERRIDES: Partial<Record<FormId, Record<string, string>>> = {
  form28: {
    ownerName: 'Owner Name (You)',
    otherPartyName: "Buyer's Name",
    buyerRTO: "Buyer's RTO (destination)",
    buyerState: "Buyer's State (destination)",
  },
  form29: {
    ownerName: 'Seller Name (You)',
    ownerAddress: 'Seller Address',
    otherPartyName: "Buyer's Name",
    otherPartyParent: "Buyer's Father / Husband",
    otherPartyAddress: "Buyer's Address",
  },
  form30: {
    ownerName: 'Buyer Name (You)',
    ownerParent: "Your Father's / Husband's Name",
    ownerAddress: 'Your Address',
    ownerMobile: 'Your Mobile',
    otherPartyName: "Seller's Name",
    otherPartyParent: "Seller's Father / Husband",
    otherPartyAddress: "Seller's Address",
    buyerRTO: 'Your RTO (filing RTO)',
  },
  form32: {
    ownerName: 'Applicant Name (You)',
    ownerParent: "Applicant's Father / Husband",
    buyerRTO: 'Your RTO (filing RTO)',
  },
  form35: {
    ownerMobile: 'Owner Mobile',
    ownerRTO: 'Parent / Original RTO',
  },
  form36: {
    ownerName: 'Financier Name (You)',
    ownerAddress: 'Financier Address',
    ownerMobile: 'Financier Mobile',
    ownerRTO: 'RTO (where RC is registered)',
    otherPartyName: "Defaulting Owner's Name",
    otherPartyAddress: "Defaulting Owner's Address",
  },
};

const FORM_INTENT: Record<FormId, Intent> = {
  form28: 'seller',
  form29: 'seller',
  form30: 'buyer',
  form32: 'auction',
  form35: 'loan-closure',
  form36: 'financier-default',
};

const toFormId = (formNumber: string): FormId =>
  formNumber.toLowerCase().replace(' ', '') as FormId;

const getLabel = (fieldKey: string, formId: FormId): string =>
  FORM_LABEL_OVERRIDES[formId]?.[fieldKey] ?? BASE_LABELS[fieldKey as FieldKey] ?? fieldKey;

export default function Documents() {
  const [tab, setTab] = useState<Tab>('forms');
  const [selectedForm, setSelectedForm] = useState<FormId | null>(null);
  const [formAnswers, setFormAnswers] = useState<WizardAnswers>(() => emptyAnswers());
  const [previewFormId, setPreviewFormId] = useState<FormId | null>(null);

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t !== 'forms') { setSelectedForm(null); setPreviewFormId(null); }
  };

  const selectForm = (id: FormId) => {
    if (selectedForm === id) { setSelectedForm(null); return; }
    setSelectedForm(id);
    setFormAnswers({ ...emptyAnswers(), intent: FORM_INTENT[id] });
  };

  const setField = (k: FieldKey, v: string | boolean) =>
    setFormAnswers(a => ({ ...a, [k]: v }));

  const renderStringField = (fieldKey: FieldKey) => {
    const label = getLabel(fieldKey, selectedForm!);

    if (fieldKey === 'vehicleClass') {
      return <Combobox key={fieldKey} label={label} value={formAnswers.vehicleClass} onChange={v => setField('vehicleClass', v)} options={[...VEHICLE_CLASSES]} placeholder="Search class…" />;
    }
    if (fieldKey === 'buyerState') {
      return <Combobox key={fieldKey} label={label} value={formAnswers.buyerState} onChange={v => setField('buyerState', v)} options={[...INDIAN_STATES]} placeholder="Search state…" />;
    }
    if (fieldKey === 'ownerRTO' || fieldKey === 'buyerRTO') {
      return <Combobox key={fieldKey} label={label} value={formAnswers[fieldKey]} onChange={v => setField(fieldKey, v)} options={MAHARASHTRA_RTOS.map(r => r.display)} placeholder="Search RTO…" full />;
    }
    if (fieldKey === 'make') {
      return <Combobox key={fieldKey} label={label} value={formAnswers.make} onChange={v => setField('make', v)} options={[...POPULAR_MAKES]} placeholder="Search make…" />;
    }
    if (fieldKey === 'bankName') {
      return <Combobox key={fieldKey} label={label} value={formAnswers.bankName} onChange={v => setField('bankName', v)} options={[...POPULAR_BANKS]} placeholder="Search bank…" full />;
    }
    if (fieldKey === 'saleDate') {
      return <DateField key={fieldKey} label={label} value={formAnswers.saleDate} onChange={v => setField('saleDate', v)} />;
    }
    if (fieldKey === 'applicationDate') {
      return <DateField key={fieldKey} label={label} value={formAnswers.applicationDate} onChange={v => setField('applicationDate', v)} />;
    }

    const isFull = fieldKey === 'ownerAddress' || fieldKey === 'otherPartyAddress' || fieldKey === 'bankAddress';
    return (
      <Field key={fieldKey} label={label} value={formAnswers[fieldKey] as string} onChange={v => setField(fieldKey, v)} full={isFull} />
    );
  };

  const renderGroup = (group: FieldGroup) => {
    const hasLoanField = group.fields.includes('hasLoan');
    const stringFields = group.fields.filter(fk => fk !== 'hasLoan');
    const visibleStringFields = stringFields.filter(fk => {
      if ((fk === 'bankName' || fk === 'bankAddress') && !formAnswers.hasLoan) return false;
      return true;
    });

    return (
      <div key={group.label} className={styles.fieldGroupWrap}>
        <div className={styles.groupLabel}>{group.label}</div>
        {hasLoanField && (
          <ToggleRow
            label={getLabel('hasLoan', selectedForm!)}
            hint="If yes, bank / financier details will appear."
            value={formAnswers.hasLoan}
            onChange={v => setField('hasLoan', v)}
          />
        )}
        {visibleStringFields.length > 0 && (
          <div className={styles.fieldGrid}>
            {visibleStringFields.map(fk => renderStringField(fk))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Documents Reference</h1>
        <p className={styles.subtitle}>
          Complete reference for all forms, fees, timelines, and legal sections for RC transfer in Maharashtra
        </p>

        {/* Tabs */}
        <div className={styles.tabs}>
          {[
            { id: 'forms' as Tab, label: 'Forms' },
            { id: 'fees' as Tab, label: 'Fees' },
            { id: 'timelines' as Tab, label: 'Timelines' },
            { id: 'legal' as Tab, label: 'Legal Sections' },
            { id: 'checklists' as Tab, label: 'Document Checklists' },
          ].map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => switchTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Forms */}
        {tab === 'forms' && (
          <motion.div key="forms" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Form</th>
                    <th>Full Name</th>
                    <th>Who Uses It</th>
                    <th>Copies</th>
                    <th>Filed At</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formsReference.map((f) => {
                    const fid = toFormId(f.formNumber);
                    const isSelected = selectedForm === fid;
                    return (
                      <tr
                        key={f.formNumber}
                        className={`${styles.tableRow} ${isSelected ? styles.tableRowSelected : ''}`}
                        onClick={() => selectForm(fid)}
                      >
                        <td><strong>{f.formNumber}</strong></td>
                        <td>{f.fullName}</td>
                        <td>{f.whoUsesIt}</td>
                        <td>{f.copies}</td>
                        <td>{f.filedAt}</td>
                        <td>
                          <span className={`${styles.generateBtn} ${isSelected ? styles.generateBtnActive : ''}`}>
                            {isSelected ? 'Close ✕' : 'Fill & Generate →'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </motion.div>
        )}

        {/* Fees */}
        {tab === 'fees' && (
          <motion.div key="fees" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Amount (Maharashtra)</th>
                </tr>
              </thead>
              <tbody>
                {feesReference.map((f, i) => (
                  <tr key={i}>
                    <td>{f.item}</td>
                    <td><strong>{f.amount}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Timelines */}
        {tab === 'timelines' && (
          <motion.div key="timelines" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {timelinesReference.map((t, i) => (
                  <tr key={i}>
                    <td>{t.activity}</td>
                    <td><strong>{t.timeline}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Legal */}
        {tab === 'legal' && (
          <motion.div key="legal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Section / Rule</th>
                  <th>What It Covers</th>
                </tr>
              </thead>
              <tbody>
                {legalReferences.map((l, i) => (
                  <tr key={i}>
                    <td><strong>{l.section}</strong></td>
                    <td>{l.covers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Document Checklists */}
        {tab === 'checklists' && (
          <motion.div key="checklists" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className={styles.checklistGrid}>
              <div className={styles.checklistCard}>
                <h3>Documents Seller Provides to Buyer</h3>
                <ul>
                  <li>Original RC book / smart card (physical; DigiLocker NOT accepted)</li>
                  <li>Valid insurance policy (original or attested copy)</li>
                  <li>Valid PUC certificate</li>
                  <li>Form 29 — buyer's copy (signed by both)</li>
                  <li>Notarised sale agreement (buyer's copy)</li>
                  <li>Bank NOC (original hard copy) + Form 35 — if vehicle had a loan</li>
                  <li>Owner's manual</li>
                  <li>Service history book</li>
                  <li>All warranty documents</li>
                  <li>Original purchase invoice</li>
                </ul>
              </div>
              <div className={styles.checklistCard}>
                <h3>Documents Buyer Submits to RTO</h3>
                <ul>
                  <li>Form 29 (2 copies, both signed)</li>
                  <li>Form 30 (1 copy, signed by buyer)</li>
                  <li>Original RC book / smart card</li>
                  <li>Valid insurance policy document</li>
                  <li>Valid PUC certificate</li>
                  <li>PAN card copy OR Form 60 / Form 61</li>
                  <li>Address proof (Aadhaar / Voter ID / Passport / Utility Bill)</li>
                  <li>Passport-size photo with thumb impression (certified)</li>
                  <li>Self-addressed envelope with ₹30 stamps (offline only)</li>
                  <li>Form 28 + NOC — if from different RTO / state</li>
                  <li>NCRB Clearance — out-of-state vehicles only</li>
                  <li>Bank NOC + Form 35 — if vehicle had a loan</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {selectedForm && !previewFormId && (
          <FormFillModal
            key={`fill-${selectedForm}`}
            formId={selectedForm}
            title="Fill to Generate"
            hint="Fill in the fields to generate a pre-filled, printable form. All fields are editable in the preview before printing."
            onClose={() => setSelectedForm(null)}
            onPreview={() => setPreviewFormId(selectedForm)}
          >
            {FORM_FIELD_GROUPS[selectedForm].map(group => renderGroup(group))}
          </FormFillModal>
        )}
        {previewFormId && (
          <PreviewModal
            formId={previewFormId}
            answers={formAnswers}
            onClose={() => setPreviewFormId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
