import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, FileCheck, ChevronDown, Clock, Shield, FileText, Scale, Sparkles, Wand2, Printer, Zap } from 'lucide-react';
import styles from './Landing.module.css';

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
    q: 'What does this checker cost?',
    a: 'This tool is completely free. It helps you verify your readiness for the RC transfer process by walking you through every legal requirement, document, and step defined by the Motor Vehicles Act 1988.',
  },
  {
    q: 'Is this tool a substitute for legal advice?',
    a: 'No. This tool is for informational and educational purposes only. While it is based on the Motor Vehicles Act 1988, Central MV Rules 1989, and Maharashtra MV Rules 1989, always consult a legal professional for your specific situation.',
  },
  {
    q: 'Does this work for out-of-state vehicles?',
    a: 'Yes! The tool includes a complete Out-of-State Vehicle checklist (Part 4) covering NOC from the original state, NCRB clearance, Maharashtra re-registration, road tax payment, and more.',
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <motion.div
          className={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className={styles.badge}>
            <Shield size={14} />
            Maharashtra RC Transfer
          </div>
          <h1 className={styles.heroTitle}>
            Is Your RC Transfer <span>Ready?</span>
          </h1>
          <p className={styles.heroSub}>
            A step-by-step readiness checker for buying or selling a second-hand car
            in Maharashtra. Based on the Motor Vehicles Act 1988.
          </p>
          <div className={styles.heroCta}>
            <Link to="/wizard/setup" className={styles.btnPrimary}>
              <Sparkles size={18} /> Run Full Wizard <ArrowRight size={18} />
            </Link>
            <Link to="/start" className={styles.btnSecondary}>
              Just the Checklist
            </Link>
            <Link to="/documents" className={styles.btnSecondary}>
              <FileText size={18} /> View Documents
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Smart Forms ── */}
      <section className={styles.smartSection}>
        <div className="container">
          <motion.div
            className={styles.smartCard}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.smartLeft}>
              <div className={styles.smartBadge}>
                <Sparkles size={14} />
                AI-Assisted
              </div>
              <h2 className={styles.smartTitle}>
                Smart RTO <span>Form Generator</span>
              </h2>
              <p className={styles.smartDesc}>
                Skip the paperwork hassle. Pick a form, answer a few simple questions, and get a
                pre-filled, print-ready RTO form — Forms 28, 29, 30, 32, 35 and 36, all in one place.
              </p>
              <ul className={styles.smartFeatures}>
                <li><Wand2 size={16} /> Auto-fills owner, vehicle &amp; bank details</li>
                <li><Printer size={16} /> Live preview, edit &amp; print or save as PDF</li>
                <li><Zap size={16} /> Generates in seconds — no app downloads</li>
              </ul>
              <div className={styles.smartCta}>
                <Link to="/forms" className={styles.btnPrimary}>
                  Generate a Form <ArrowRight size={18} />
                </Link>
              </div>
            </div>
            <div className={styles.smartRight} aria-hidden="true">
              <div className={styles.smartMock}>
                <div className={styles.smartMockHeader}>
                  <span className={styles.smartMockBadge}>Form 29</span>
                  <span className={styles.smartMockTitle}>Notice of Transfer</span>
                </div>
                <div className={styles.smartMockBody}>
                  <div className={styles.smartMockRow}>
                    <span>Reg. No.</span><strong>MH 12 AB 1234</strong>
                  </div>
                  <div className={styles.smartMockRow}>
                    <span>Seller</span><strong>Anmol Patil</strong>
                  </div>
                  <div className={styles.smartMockRow}>
                    <span>Buyer</span><strong>Rahul Sharma</strong>
                  </div>
                  <div className={styles.smartMockRow}>
                    <span>Sale Date</span><strong>03/05/2026</strong>
                  </div>
                </div>
                <div className={styles.smartMockFooter}>
                  <Sparkles size={12} /> Pre-filled & print-ready
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className={styles.howSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <p className={styles.sectionSub}>Three simple steps to check your readiness</p>
          <div className={styles.stepsGrid}>
            {[
              {
                num: 1,
                title: 'Select Your Role',
                desc: 'Choose Buyer or Seller and tell us about your vehicle — loan status, same or different RTO, in-state or out-of-state.',
              },
              {
                num: 2,
                title: 'Walk Through Checks',
                desc: 'Answer YES, NO, or N/A for each checkpoint. If NO, follow the guided fix steps. Your progress is saved automatically.',
              },
              {
                num: 3,
                title: 'Get Your Score',
                desc: 'See your overall readiness percentage, action items that need attention, and a printable summary of your status.',
              },
            ].map((step) => (
              <motion.div
                key={step.num}
                className={styles.stepCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: step.num * 0.15 }}
              >
                <div className={styles.stepNumber}>{step.num}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className={styles.statsSection}>
        <div className="container">
          <div className={styles.statsGrid}>
            {[
              { value: '56+', label: 'Checkpoints', icon: FileCheck },
              { value: '4', label: 'Checklists', icon: Shield },
              { value: '6', label: 'Legal Forms', icon: Scale },
              { value: '30 min', label: 'Avg. Completion', icon: Clock },
            ].map((stat, i) => (
              <motion.div
                key={i}
                className={styles.statCard}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={styles.faqSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <p className={styles.sectionSub}>Everything you need to know about RC transfers</p>
          <div className={styles.faqList}>
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                className={styles.faqItem}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
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
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
