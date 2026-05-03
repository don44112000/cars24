import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  Wand2,
  CheckCircle2,
  Sparkles,
  Shield,
  Clock,
  Scale,
  FileCheck,
  Printer,
  Zap,
} from 'lucide-react';
import styles from './Landing.module.css';

type Tool = {
  to: string;
  emoji: string;
  label: string;
  active?: boolean;
};

// Only the actionable tools belong on the island — Home, Legal library
// and Saved sessions live in the header nav instead.
const tools: Tool[] = [
  { to: '/wizard/setup', emoji: '🪄', label: 'Transfer wizard', active: true },
  { to: '/start', emoji: '✅', label: 'Readiness audit' },
  { to: '/forms', emoji: '📝', label: 'Form studio' },
  { to: '/verify', emoji: '🔍', label: 'Document scanner' },
];

const features = [
  {
    to: '/start',
    tone: 'green',
    eyebrow: 'Audit',
    title: 'Readiness audit',
    desc: '56+ checkpoints across 4 scenarios. Walk through every legal requirement, document, and rule the RTO will look for.',
    bullets: ['Buyer & seller flows', 'Same-state, different-RTO, out-of-state', 'Auto-saved progress'],
  },
  {
    to: '/forms',
    tone: 'amber',
    eyebrow: 'Studio',
    title: 'Form studio',
    desc: 'Pre-filled, print-ready Forms 28, 29, 30, 32, 35 and 36. Live preview, save as PDF, no app downloads.',
    bullets: ['Forms 28 / 29 / 30 / 32 / 35 / 36', 'Auto-fills owner & vehicle', 'Print or save as PDF'],
  },
  {
    to: '/verify',
    tone: 'purple',
    eyebrow: 'AI',
    title: 'Document scanner',
    desc: 'Upload your RC, insurance, PUC and Aadhaar — get an instant readiness score and flagged issues.',
    bullets: ['Reads RC / insurance / PUC', 'Flags expired & mismatched fields', 'Local scan, private by default'],
  },
] as const;

const stats = [
  { value: '56+', label: 'Checkpoints', icon: FileCheck },
  { value: '4', label: 'Scenarios', icon: Shield },
  { value: '6', label: 'RTO forms', icon: Scale },
  { value: '~30 min', label: 'Avg. time', icon: Clock },
];

const faqs = [
  {
    q: 'What is RC transfer and why do I need it?',
    a: 'RC (Registration Certificate) transfer is the legal process of changing vehicle ownership from the seller to the buyer at the RTO. Without it, the seller remains legally responsible for the vehicle, and the buyer cannot legally own or insure it in their name.',
  },
  {
    q: 'How long does the RC transfer process take?',
    a: 'For same-state (Maharashtra) transfers: 7–30 days depending on online vs offline filing. For interstate transfers: 30–60+ days. The buyer must file within 30 days of purchase, and the seller must notify the RTO within 14 days.',
  },
  {
    q: 'What does RC Ready cost?',
    a: 'Completely free. RC Ready helps you verify your readiness for the RC transfer process — based on the Motor Vehicles Act 1988, Central MV Rules 1989, and Maharashtra MV Rules 1989.',
  },
  {
    q: 'Is this a substitute for legal advice?',
    a: 'No. RC Ready is for informational and educational purposes only. Always consult a legal professional for your specific situation.',
  },
  {
    q: 'Does it work for out-of-state vehicles?',
    a: 'Yes. The wizard includes a complete Out-of-State Vehicle scenario covering NOC from the original state, NCRB clearance, Maharashtra re-registration, road tax payment, and more.',
  },
];

const wizardSteps = [
  { n: 1, label: 'Setup', desc: 'Role, vehicle, RTO' },
  { n: 2, label: 'Scan documents', desc: 'AI reads your papers' },
  { n: 3, label: 'Readiness audit', desc: '56+ checkpoints' },
  { n: 4, label: 'Build forms', desc: 'RTO forms pre-filled' },
  { n: 5, label: 'Get report', desc: 'Score &amp; action plan' },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className={styles.page}>
      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroBlob1} />
          <div className={styles.heroBlob2} />
        </div>

        <div className={styles.heroInner}>
          <motion.div
            className={styles.heroLeft}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.heroEyebrow}>
              <Sparkles size={14} />
              Maharashtra RC transfer, fully guided
            </div>
            <h1 className={styles.heroTitle}>
              RC&nbsp;ready.
              <br />
              Transfer&nbsp;ready.
            </h1>
            <p className={styles.heroSub}>
              RC&nbsp;Ready walks you through every check, form and document the
              RTO will ask for — in about 30 minutes. Built on the Motor
              Vehicles Act 1988 and Maharashtra MV Rules 1989.
            </p>
            <div className={styles.heroCta}>
              <Link to="/wizard/setup" className={styles.heroBtnPrimary}>
                <Wand2 size={18} />
                Start the wizard
                <ArrowRight size={18} />
              </Link>
              <Link to="/start" className={styles.heroBtnGhost}>
                Just the checklist
              </Link>
            </div>
            <div className={styles.heroProof}>
              <span><CheckCircle2 size={14} /> Free, no sign-up</span>
              <span><Shield size={14} /> Local-first, private</span>
              <span><Clock size={14} /> ~30 min average</span>
            </div>
          </motion.div>

          <motion.div
            className={styles.heroRight}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            aria-hidden="true"
          >
            <div className={styles.wizardCard}>
              <div className={styles.wizardCardHead}>
                <span className={styles.wizardCardBadge}>
                  <Wand2 size={12} /> Transfer wizard
                </span>
                <span className={styles.wizardCardMeta}>Step 2 of 5</span>
              </div>
              <div className={styles.wizardSteps}>
                {wizardSteps.map((s) => (
                  <div
                    key={s.n}
                    className={`${styles.wizardStep} ${
                      s.n < 2 ? styles.wizardStepDone : ''
                    } ${s.n === 2 ? styles.wizardStepActive : ''}`}
                  >
                    <div className={styles.wizardStepBullet}>
                      {s.n < 2 ? <CheckCircle2 size={14} /> : s.n}
                    </div>
                    <div className={styles.wizardStepBody}>
                      <div className={styles.wizardStepLabel}>{s.label}</div>
                      <div className={styles.wizardStepDesc}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.wizardCardFoot}>
                <div className={styles.wizardProgress}>
                  <div className={styles.wizardProgressBar} style={{ width: '40%' }} />
                </div>
                <span className={styles.wizardProgressText}>40% ready</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating tool tab strip */}
        <div className={styles.tabStripWrap}>
          <div className={styles.tabStrip}>
            {tools.map((t) => (
              <Link
                key={t.label}
                to={t.to}
                className={`${styles.tab} ${t.active ? styles.tabActive : ''}`}
              >
                <span className={styles.tabIcon} aria-hidden="true">{t.emoji}</span>
                <span className={styles.tabLabel}>{t.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wizard spotlight section ── */}
      <section className={styles.spotlight}>
        <div className="container">
          <div className={styles.spotlightHead}>
            <h2 className={styles.sectionTitle}>
              The wizard, the whole transfer
            </h2>
            <span className={styles.dealBadge}>Free • ~30 min</span>
          </div>
          <p className={styles.sectionSub}>
            Five steps that combine document scanning, readiness audit and form
            building into a single guided flow.
          </p>

          <div className={styles.spotlightCard}>
            <div className={styles.spotlightLeft}>
              <span className={styles.spotlightEyebrow}>
                <Sparkles size={12} /> Headline feature
              </span>
              <h3 className={styles.spotlightTitle}>
                Transfer wizard
              </h3>
              <p className={styles.spotlightDesc}>
                Tell us whether you're buying or selling, scan your existing
                papers, walk through the audit, and walk away with pre-filled
                RTO forms and a personalised readiness report.
              </p>
              <ul className={styles.spotlightList}>
                <li><CheckCircle2 size={14} /> Adapts to buyer or seller, same-state or interstate</li>
                <li><CheckCircle2 size={14} /> Auto-fills RTO Forms 28, 29, 30, 32, 35, 36</li>
                <li><CheckCircle2 size={14} /> Saves progress locally — resume any time</li>
              </ul>
              <div className={styles.spotlightCta}>
                <Link to="/wizard/setup" className={styles.btnPrimary}>
                  <Wand2 size={16} /> Start the wizard <ArrowRight size={16} />
                </Link>
                <Link to="/help" className={styles.btnGhost}>
                  How it works
                </Link>
              </div>
            </div>

            <div className={styles.spotlightRight} aria-hidden="true">
              <div className={styles.timeline}>
                {wizardSteps.map((s) => (
                  <div key={s.n} className={styles.timelineItem}>
                    <div className={styles.timelineDot}>{s.n}</div>
                    <div>
                      <div className={styles.timelineLabel}>{s.label}</div>
                      <div className={styles.timelineDesc}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tools grid ── */}
      <section className={styles.toolsSection}>
        <div className="container">
          <div className={styles.spotlightHead}>
            <h2 className={styles.sectionTitle}>Use them on their own, too</h2>
          </div>
          <p className={styles.sectionSub}>
            Each tool the wizard uses is also available standalone.
          </p>

          <div className={styles.featuresGrid}>
            {features.map((f) => (
              <motion.div
                key={f.title}
                className={`${styles.featureCard} ${styles[`tone_${f.tone}`]}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <span className={styles.featureEyebrow}>{f.eyebrow}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
                <ul className={styles.featureBullets}>
                  {f.bullets.map((b) => (
                    <li key={b}>
                      <CheckCircle2 size={13} /> {b}
                    </li>
                  ))}
                </ul>
                <Link to={f.to} className={styles.featureLink}>
                  Open <ArrowRight size={14} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={styles.statsSection}>
        <div className="container">
          <div className={styles.statsRow}>
            {stats.map((s) => (
              <div key={s.label} className={styles.statBlock}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className={styles.howSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>How it works</h2>
          <p className={styles.sectionSub}>Three quick stages, fully guided</p>

          <div className={styles.howGrid}>
            {[
              {
                num: 1,
                icon: Sparkles,
                title: 'Tell us about your transfer',
                desc: 'Buyer or seller, vehicle details, same RTO or different — we tailor the audit to your scenario.',
              },
              {
                num: 2,
                icon: Zap,
                title: 'Walk through the audit',
                desc: 'Answer YES, NO or N/A. If NO, follow guided fixes. Progress saves automatically.',
              },
              {
                num: 3,
                icon: Printer,
                title: 'Print or save your forms',
                desc: 'Get a readiness score, action items, pre-filled RTO forms, and a printable summary.',
              },
            ].map((step) => (
              <motion.div
                key={step.num}
                className={styles.howCard}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: step.num * 0.1 }}
              >
                <div className={styles.howNumber}>
                  <step.icon size={18} />
                </div>
                <div className={styles.howLabel}>Step {step.num}</div>
                <h3 className={styles.howTitle}>{step.title}</h3>
                <p className={styles.howDesc}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={styles.faqSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Frequently asked questions</h2>
          <p className={styles.sectionSub}>Everything you need to know about RC transfers</p>
          <div className={styles.faqList}>
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className={styles.faqItem}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  className={styles.faqQuestion}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {faq.q}
                  <ChevronDown
                    size={18}
                    className={`${styles.faqChevron} ${openFaq === i ? styles.faqChevronOpen : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <motion.div
                    className={styles.faqAnswer}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ── */}
      <section className={styles.ctaStrip}>
        <div className="container">
          <div className={styles.ctaInner}>
            <div>
              <h3 className={styles.ctaTitle}>Ready when you are.</h3>
              <p className={styles.ctaSub}>
                Start the Transfer wizard — no sign-up, no fees, your data stays
                on your device.
              </p>
            </div>
            <Link to="/wizard/setup" className={styles.btnPrimaryLight}>
              <Wand2 size={18} /> Start the wizard <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
