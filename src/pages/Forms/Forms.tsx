import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, ShoppingCart, Tag, Banknote, Gavel, Scale,
  Car, User, Users, Building2, FileText, Eye, Check,
  Sparkles, MessageCircle, Calendar,
} from 'lucide-react';
import {
  Bubble, Field, RegNoField, NumberField, Combobox, DateField, ToggleRow, PreviewModal,
} from '../../components/FormShared';
import { isValidRegNo, isValidMobile, isValidAge } from '../../components/FormShared/utils';
import {
  emptyAnswers,
  recommendForms,
  FORM_META,
  type WizardAnswers,
  type Intent,
  type FormId,
} from '../../data/formGenerator';
import {
  VEHICLE_CLASSES,
  POPULAR_MAKES,
  POPULAR_BANKS,
  INDIAN_STATES,
  MAHARASHTRA_RTOS,
} from '../../data/formOptions';
import styles from './Forms.module.css';

type StepId = 'intent' | 'situation' | 'vehicle' | 'you' | 'other' | 'bank' | 'rto' | 'output';

const INTENT_OPTIONS: Array<{
  id: Intent;
  title: string;
  desc: string;
  Icon: typeof ShoppingCart;
}> = [
  {
    id: 'buyer',
    title: "I'm buying a car",
    desc: 'Transfer the RC into my name as the new owner.',
    Icon: ShoppingCart,
  },
  {
    id: 'seller',
    title: "I'm selling my car",
    desc: 'Notify the RTO and remove my legal liability.',
    Icon: Tag,
  },
  {
    id: 'loan-closure',
    title: 'I just paid off my car loan',
    desc: 'Remove the bank lien (HP termination) from my RC.',
    Icon: Banknote,
  },
  {
    id: 'auction',
    title: 'I bought a car in a public auction',
    desc: 'Transfer ownership via auction process.',
    Icon: Gavel,
  },
  {
    id: 'financier-default',
    title: "I'm a financier — borrower defaulted",
    desc: 'Issue a fresh RC in the financier’s name.',
    Icon: Scale,
  },
];

export default function FormsPage() {
  const [answers, setAnswers] = useState<WizardAnswers>(() => emptyAnswers());
  const [step, setStep] = useState<StepId>('intent');
  const [previewFormId, setPreviewFormId] = useState<FormId | null>(null);

  const set = <K extends keyof WizardAnswers>(k: K, v: WizardAnswers[K]) =>
    setAnswers((a) => ({ ...a, [k]: v }));

  // Build the active step list dynamically based on intent
  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = ['intent'];
    if (!answers.intent) return list;

    list.push('situation');
    list.push('vehicle');
    list.push('you');

    const needsOther =
      answers.intent === 'buyer' ||
      answers.intent === 'seller' ||
      answers.intent === 'auction' ||
      answers.intent === 'financier-default';
    if (needsOther) list.push('other');

    const needsBank = answers.hasLoan || answers.intent === 'loan-closure';
    if (needsBank) list.push('bank');

    list.push('rto');
    list.push('output');
    return list;
  }, [answers.intent, answers.hasLoan]);

  const currentIdx = Math.max(0, steps.indexOf(step));
  const totalSteps = steps.length;
  const progressPct = Math.round(((currentIdx + 1) / totalSteps) * 100);

  const goNext = () => {
    const nxt = steps[currentIdx + 1];
    if (nxt) setStep(nxt);
  };
  const goBack = () => {
    const prv = steps[currentIdx - 1];
    if (prv) setStep(prv);
  };

  const recommendations = useMemo(() => recommendForms(answers), [answers]);

  const otherPartyLabel =
    answers.intent === 'buyer'
      ? 'Seller details'
      : answers.intent === 'seller'
      ? 'Buyer details'
      : answers.intent === 'auction'
      ? 'Previous owner / auction authority'
      : answers.intent === 'financier-default'
      ? 'Defaulting borrower details'
      : 'Other party';

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Hero */}
        <header className={styles.hero}>
          <div className={styles.heroIcon}>
            <FileText size={20} />
          </div>
          <h1 className={styles.heroTitle}>Form Generator</h1>
          <p className={styles.heroSubtitle}>
            Answer a few easy questions — we’ll figure out which RTO forms you need and
            pre-fill them for you. Print or save as PDF when you’re ready.
          </p>
        </header>

        {/* Progress strip */}
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <motion.div
              className={styles.progressFill}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <div className={styles.progressLabel}>
            Step {currentIdx + 1} of {totalSteps}
          </div>
        </div>

        {/* Step content */}
        <div className={styles.stage}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
            >
              {step === 'intent' && (
                <Bubble icon={<MessageCircle size={16} />} label="Hi! Let’s start here.">
                  <h2 className={styles.q}>What do you need to do?</h2>
                  <div className={styles.intentGrid}>
                    {INTENT_OPTIONS.map((opt) => {
                      const active = answers.intent === opt.id;
                      const Icon = opt.Icon;
                      return (
                        <button
                          key={opt.id}
                          className={`${styles.intentCard} ${active ? styles.intentCardActive : ''}`}
                          onClick={() => {
                            set('intent', opt.id);
                            // auto-advance after short pulse
                            setTimeout(() => setStep('situation'), 200);
                          }}
                        >
                          <div className={styles.intentIcon}>
                            <Icon size={20} />
                          </div>
                          <div className={styles.intentBody}>
                            <div className={styles.intentTitle}>{opt.title}</div>
                            <div className={styles.intentDesc}>{opt.desc}</div>
                          </div>
                          {active && <Check size={16} className={styles.intentCheck} />}
                        </button>
                      );
                    })}
                  </div>
                </Bubble>
              )}

              {step === 'situation' && (
                <Bubble icon={<Sparkles size={16} />} label="Tell me a bit more.">
                  <h2 className={styles.q}>A few quick yes/no questions</h2>

                  {answers.intent !== 'auction' && answers.intent !== 'financier-default' && (
                    <ToggleRow
                      label="Does the car have an active or recently-closed loan?"
                      hint="If yes, hypothecation paperwork (Form 35) will be needed."
                      value={answers.hasLoan}
                      onChange={(v) => set('hasLoan', v)}
                    />
                  )}

                  {answers.intent === 'buyer' && (
                    <ToggleRow
                      label="Is the car registered outside Maharashtra?"
                      hint="Out-of-state cars need an NOC (Form 28) from the original RTO."
                      value={answers.isOutOfState}
                      onChange={(v) => set('isOutOfState', v)}
                    />
                  )}

                  {answers.intent === 'seller' && (
                    <ToggleRow
                      label="Is the buyer taking the car to another state?"
                      hint="If yes, you’ll provide a No-Objection Certificate (Form 28)."
                      value={answers.takingOutOfState}
                      onChange={(v) => set('takingOutOfState', v)}
                    />
                  )}
                </Bubble>
              )}

              {step === 'vehicle' && (
                <Bubble icon={<Car size={16} />} label="Tell me about the car.">
                  <h2 className={styles.q}>Vehicle details</h2>
                  <div className={styles.fieldGrid}>
                    <RegNoField
                      label="Registration number"
                      value={answers.regNo}
                      onChange={(v) => set('regNo', v)}
                    />
                    <Combobox
                      label="Class of vehicle"
                      value={answers.vehicleClass}
                      onChange={(v) => set('vehicleClass', v)}
                      options={[...VEHICLE_CLASSES]}
                      placeholder="Search class..."
                    />
                    <Combobox
                      label="Make"
                      value={answers.make}
                      onChange={(v) => set('make', v)}
                      options={[...POPULAR_MAKES]}
                      placeholder="Search make..."
                    />
                    <Field
                      label="Model"
                      placeholder="Swift VXi"
                      value={answers.model}
                      onChange={(v) => set('model', v)}
                    />
                    <Field
                      label="Chassis number"
                      placeholder="MA3EWDE1S00123456"
                      value={answers.chassisNo}
                      onChange={(v) => set('chassisNo', v.toUpperCase())}
                      full
                    />
                    <Field
                      label="Engine number"
                      placeholder="K10B1234567"
                      value={answers.engineNo}
                      onChange={(v) => set('engineNo', v.toUpperCase())}
                      full
                    />
                  </div>
                </Bubble>
              )}

              {step === 'you' && (
                <Bubble icon={<User size={16} />} label="Now your side.">
                  <h2 className={styles.q}>{youLabel(answers.intent)}</h2>
                  <div className={styles.fieldGrid}>
                    <Field
                      label="Full name (as on Aadhaar/PAN)"
                      placeholder="Rajesh Kumar"
                      value={answers.ownerName}
                      onChange={(v) => set('ownerName', v)}
                      full
                    />
                    <Field
                      label="Father / husband name (S/W/D of)"
                      placeholder="Suresh Kumar"
                      value={answers.ownerParent}
                      onChange={(v) => set('ownerParent', v)}
                    />
                    <NumberField
                      label="Mobile"
                      placeholder="9876543210"
                      value={answers.ownerMobile}
                      onChange={(v) => set('ownerMobile', v)}
                      maxLength={10}
                      pattern="^[6-9]\d{9}$"
                      kind="tel"
                    />
                    <Field
                      label="Address"
                      placeholder="Flat 5, Anand Apts, Pune 411001"
                      value={answers.ownerAddress}
                      onChange={(v) => set('ownerAddress', v)}
                      full
                    />
                  </div>
                </Bubble>
              )}

              {step === 'other' && (
                <Bubble icon={<Users size={16} />} label="The other party.">
                  <h2 className={styles.q}>{otherPartyLabel}</h2>
                  <div className={styles.fieldGrid}>
                    <Field
                      label="Full name"
                      value={answers.otherPartyName}
                      onChange={(v) => set('otherPartyName', v)}
                      full
                    />
                    <Field
                      label="Father / husband name"
                      value={answers.otherPartyParent}
                      onChange={(v) => set('otherPartyParent', v)}
                    />
                    <NumberField
                      label="Mobile"
                      placeholder="9876543210"
                      value={answers.otherPartyMobile}
                      onChange={(v) => set('otherPartyMobile', v)}
                      maxLength={10}
                      pattern="^[6-9]\d{9}$"
                      kind="tel"
                    />
                    <Field
                      label="Address"
                      value={answers.otherPartyAddress}
                      onChange={(v) => set('otherPartyAddress', v)}
                      full
                    />
                    {(answers.intent === 'buyer' || answers.intent === 'seller') && (
                      <NumberField
                        label="Buyer’s age (Form 30 requires it)"
                        placeholder="32"
                        value={answers.otherPartyAge}
                        onChange={(v) => set('otherPartyAge', v)}
                        min={18}
                        max={120}
                        kind="age"
                      />
                    )}
                  </div>
                </Bubble>
              )}

              {step === 'bank' && (
                <Bubble icon={<Building2 size={16} />} label="Bank details.">
                  <h2 className={styles.q}>Financier (bank / NBFC) details</h2>
                  <div className={styles.fieldGrid}>
                    <Combobox
                      label="Bank / financier name"
                      value={answers.bankName}
                      onChange={(v) => set('bankName', v)}
                      options={[...POPULAR_BANKS]}
                      placeholder="Search bank..."
                      full
                    />
                    <Field
                      label="Branch address"
                      placeholder="Andheri East Branch, Mumbai 400069"
                      value={answers.bankAddress}
                      onChange={(v) => set('bankAddress', v)}
                      full
                    />
                  </div>
                </Bubble>
              )}

              {step === 'rto' && (
                <Bubble icon={<Calendar size={16} />} label="Last bit.">
                  <h2 className={styles.q}>RTO &amp; dates</h2>
                  <div className={styles.fieldGrid}>
                    <Combobox
                      label="Original RTO (where car is registered)"
                      value={answers.ownerRTO}
                      onChange={(v) => set('ownerRTO', v)}
                      options={MAHARASHTRA_RTOS.map((r) => r.display)}
                      placeholder="Search RTO..."
                      full
                    />
                    {(answers.intent === 'buyer' ||
                      answers.intent === 'seller' ||
                      answers.intent === 'auction') && (
                      <Combobox
                        label="Buyer’s RTO jurisdiction"
                        value={answers.buyerRTO}
                        onChange={(v) => set('buyerRTO', v)}
                        options={MAHARASHTRA_RTOS.map((r) => r.display)}
                        placeholder="Search RTO..."
                        full
                      />
                    )}
                    {((answers.intent === 'buyer' && answers.isOutOfState) ||
                      (answers.intent === 'seller' && answers.takingOutOfState)) && (
                      <Combobox
                        label="Buyer’s state"
                        value={answers.buyerState}
                        onChange={(v) => set('buyerState', v)}
                        options={[...INDIAN_STATES]}
                        placeholder="Search state..."
                      />
                    )}
                    {answers.intent !== 'loan-closure' && answers.intent !== 'financier-default' && (
                      <DateField
                        label="Date of sale"
                        value={answers.saleDate}
                        onChange={(v) => set('saleDate', v)}
                      />
                    )}
                    <DateField
                      label="Today’s date (application date)"
                      value={answers.applicationDate}
                      onChange={(v) => set('applicationDate', v)}
                    />
                  </div>
                </Bubble>
              )}

              {step === 'output' && (
                <div className={styles.outputWrap}>
                  <div className={styles.outputHero}>
                    <div className={styles.outputHeroIcon}>
                      <Sparkles size={22} />
                    </div>
                    <h2 className={styles.outputTitle}>
                      {recommendations.length === 1
                        ? "You'll need 1 form"
                        : `You'll need ${recommendations.length} forms`}
                    </h2>
                    <p className={styles.outputSubtitle}>
                      Click any form to open it pre-filled in a new tab. Use the “Print / Save as
                      PDF” button inside the form to download.
                    </p>
                  </div>

                  <div className={styles.formCards}>
                    {recommendations.map((rec) => {
                      const meta = FORM_META[rec.id];
                      return (
                        <div key={rec.id} className={styles.formCard}>
                          <div className={styles.formCardHeader}>
                            <div className={styles.formCardBadge}>{meta.title}</div>
                            <div className={styles.formCardSubtitle}>{meta.subtitle}</div>
                          </div>
                          <p className={styles.formCardWhy}>{rec.why}</p>
                          <div className={styles.formCardMeta}>
                            <span>
                              <strong>Who files:</strong> {rec.whoFiles}
                            </span>
                            <span>
                              <strong>Copies:</strong> {rec.copies}
                            </span>
                          </div>
                          <div className={styles.formCardActions}>
                            <button
                              type="button"
                              className={styles.cardBtn}
                              onClick={() => setPreviewFormId(rec.id)}
                            >
                              <Eye size={14} /> Preview &amp; Print
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.outputFooter}>
                    <p>
                      Tip: After opening, every field is still editable. Tab through dotted lines to
                      tweak before printing.
                    </p>
                    <button
                      className={styles.restartBtn}
                      onClick={() => {
                        setAnswers(emptyAnswers());
                        setStep('intent');
                      }}
                    >
                      Start over with new answers
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step nav */}
        {step !== 'output' && (
          <div className={styles.navRow}>
            <button
              className={styles.navBack}
              onClick={goBack}
              disabled={currentIdx === 0}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              className={styles.navNext}
              onClick={goNext}
              disabled={!canAdvance(step, answers)}
            >
              {steps[currentIdx + 1] === 'output' ? (
                <>
                  Generate forms <Sparkles size={16} />
                </>
              ) : (
                <>
                  Continue <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {previewFormId && (
          <PreviewModal
            formId={previewFormId}
            answers={answers}
            onClose={() => setPreviewFormId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────── page-local helpers ───────────── */

function youLabel(intent: Intent | null): string {
  switch (intent) {
    case 'buyer':
      return 'Your details (the buyer)';
    case 'seller':
      return 'Your details (the seller / current owner)';
    case 'loan-closure':
      return 'Your details (the registered owner)';
    case 'auction':
      return 'Your details (the auction winner)';
    case 'financier-default':
      return 'Your details (the financier)';
    default:
      return 'Your details';
  }
}

function canAdvance(step: StepId, a: WizardAnswers): boolean {
  switch (step) {
    case 'intent':
      return !!a.intent;
    case 'situation':
      return true;
    case 'vehicle':
      return (
        isValidRegNo(a.regNo) &&
        !!a.chassisNo &&
        !!a.engineNo &&
        !!a.vehicleClass &&
        !!a.make
      );
    case 'you':
      return !!(a.ownerName && a.ownerAddress) && (!a.ownerMobile || isValidMobile(a.ownerMobile));
    case 'other': {
      const okBase = !!(a.otherPartyName && a.otherPartyAddress);
      const okMobile = !a.otherPartyMobile || isValidMobile(a.otherPartyMobile);
      const okAge =
        a.intent !== 'buyer' && a.intent !== 'seller' ? true : !a.otherPartyAge || isValidAge(a.otherPartyAge);
      return okBase && okMobile && okAge;
    }
    case 'bank':
      return !!a.bankName;
    case 'rto':
      return !!a.ownerRTO;
    default:
      return true;
  }
}

