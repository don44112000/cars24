import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.tagline}>
        <img src="/logo-mark.svg" alt="" aria-hidden="true" className={styles.taglineMark} />
        <span>RC&nbsp;ready. Transfer&nbsp;ready.</span>
      </div>

      <div className={styles.footerInner}>
        <div className={styles.brand}>
          <div className={styles.brandRow}>
            <img src="/logo-mark.svg" alt="" aria-hidden="true" className={styles.brandMark} />
            <span className={styles.brandText}>
              RC<em>Ready</em>
            </span>
          </div>
          <p>
            Your Maharashtra RC transfer guide. Every check, form and
            document the RTO will ask for — in one place, fully guided.
          </p>
          <p className={styles.brandLegal}>
            Based on the Motor Vehicles Act 1988, Central MV Rules 1989,
            and Maharashtra MV Rules 1989.
          </p>
        </div>

        <div>
          <h4 className={styles.footerTitle}>Tools</h4>
          <ul className={styles.footerLinks}>
            <li><Link to="/wizard/setup">Transfer wizard</Link></li>
            <li><Link to="/start">Readiness audit</Link></li>
            <li><Link to="/forms">Form studio</Link></li>
            <li><Link to="/verify">Document scanner</Link></li>
          </ul>
        </div>

        <div>
          <h4 className={styles.footerTitle}>Resources</h4>
          <ul className={styles.footerLinks}>
            <li><Link to="/documents">Legal library</Link></li>
            <li><Link to="/history">Saved sessions</Link></li>
            <li><a href="https://vahan.parivahan.gov.in" target="_blank" rel="noopener noreferrer">VAHAN portal</a></li>
            <li><a href="https://parivahan.gov.in" target="_blank" rel="noopener noreferrer">Parivahan</a></li>
            <li><a href="https://parivahan.gov.in/echallan" target="_blank" rel="noopener noreferrer">e-Challan</a></li>
          </ul>
        </div>

        <div>
          <h4 className={styles.footerTitle}>Help</h4>
          <ul className={styles.footerLinks}>
            <li><Link to="/help">Help center</Link></li>
            <li><Link to="/help">MV Act references</Link></li>
            <li><Link to="/help">Disclaimer</Link></li>
          </ul>
        </div>
      </div>

      <div className={styles.copyright}>
        <span>© {new Date().getFullYear()} RC Ready — for informational purposes only. Not legal advice.</span>
        <span className={styles.copyrightTag}>Made for Maharashtra RTOs</span>
      </div>
    </footer>
  );
}
