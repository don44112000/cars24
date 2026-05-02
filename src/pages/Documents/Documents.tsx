import { useState } from 'react';
import { motion } from 'framer-motion';
import { formsReference, feesReference, timelinesReference, legalReferences } from '../../data/reference';
import styles from './Documents.module.css';

type Tab = 'forms' | 'fees' | 'timelines' | 'legal' | 'checklists';

export default function Documents() {
  const [tab, setTab] = useState<Tab>('forms');

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
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Forms */}
        {tab === 'forms' && (
          <motion.div
            key="forms"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.tableWrap}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Form</th>
                  <th>Full Name</th>
                  <th>Who Uses It</th>
                  <th>Copies</th>
                  <th>Filed At</th>
                </tr>
              </thead>
              <tbody>
                {formsReference.map((f) => (
                  <tr key={f.formNumber}>
                    <td><strong>{f.formNumber}</strong></td>
                    <td>{f.fullName}</td>
                    <td>{f.whoUsesIt}</td>
                    <td>{f.copies}</td>
                    <td>{f.filedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Fees */}
        {tab === 'fees' && (
          <motion.div
            key="fees"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.tableWrap}
          >
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
          <motion.div
            key="timelines"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.tableWrap}
          >
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
          <motion.div
            key="legal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.tableWrap}
          >
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
          <motion.div
            key="checklists"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
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
    </div>
  );
}
