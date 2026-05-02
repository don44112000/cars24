import { motion } from 'framer-motion';
import { AlertTriangle, Scale, ExternalLink, Globe } from 'lucide-react';
import { topPitfalls, legalReferences } from '../../data/reference';
import styles from './Help.module.css';

export default function Help() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Help & Reference</h1>

        {/* Disclaimer */}
        <motion.div
          className={`${styles.section} ${styles.disclaimer}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3>⚠️ Disclaimer</h3>
          <p>
            This tool is for <strong>informational and educational purposes only</strong>.
            It is not legal advice. While the checklist is based on the Motor Vehicles Act 1988,
            Central MV Rules 1989, and Maharashtra MV Rules 1989, always consult a qualified
            legal professional or your local RTO for your specific situation. Laws, fees, and
            procedures may change — verify with official sources before acting.
          </p>
        </motion.div>

        {/* Top 10 Pitfalls */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <AlertTriangle size={22} color="var(--color-critical)" />
            Top 10 Critical Pitfalls
          </h2>
          <p className={styles.sectionDesc}>
            The most common mistakes that cause RC transfer failures, legal disputes, and financial losses.
          </p>
          <div className={styles.pitfallList}>
            {topPitfalls.map((pitfall, i) => (
              <motion.div
                key={i}
                className={styles.pitfall}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <span className={styles.pitfallNum}>{i + 1}</span>
                <span className={styles.pitfallText}>{pitfall}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Legal References */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Scale size={22} color="var(--color-primary)" />
            Legal References
          </h2>
          <p className={styles.sectionDesc}>
            Key sections and rules from the Motor Vehicles Act and associated rules that govern RC transfers.
          </p>
          <div className={styles.legalGrid}>
            {legalReferences.map((ref, i) => (
              <motion.div
                key={i}
                className={styles.legalCard}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <div className={styles.legalSection}>{ref.section}</div>
                <div className={styles.legalCovers}>{ref.covers}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Useful Links */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Globe size={22} color="var(--color-primary)" />
            Official Resources
          </h2>
          <div className={styles.linkGrid}>
            {[
              {
                title: 'VAHAN Portal',
                url: 'https://vahan.parivahan.gov.in',
                desc: 'Know Your Vehicle, HP Termination, RC status',
              },
              {
                title: 'Parivahan',
                url: 'https://parivahan.gov.in',
                desc: 'Forms download, application tracking',
              },
              {
                title: 'e-Challan',
                url: 'https://parivahan.gov.in/echallan',
                desc: 'Check and pay traffic challans',
              },
              {
                title: 'mParivahan App',
                url: 'https://play.google.com/store/apps/details?id=in.gov.parivahan.vahan',
                desc: 'Digital RC, DL, and vehicle verification',
              },
            ].map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.linkCard}
              >
                <div className={styles.linkIcon}>
                  <ExternalLink size={18} />
                </div>
                <div>
                  <div className={styles.linkTitle}>{link.title}</div>
                  <div className={styles.linkUrl}>{link.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
