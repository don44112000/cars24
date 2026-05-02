import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.brand}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
            <Shield size={20} />
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              RC<span style={{ color: 'var(--color-primary)' }}>Ready</span>
            </span>
          </div>
          <p>
            Your complete guide to RC transfer readiness in Maharashtra. Based on
            the Motor Vehicles Act 1988, Central MV Rules 1989, and Maharashtra MV Rules 1989.
          </p>
        </div>

        <div>
          <h4 className={styles.footerTitle}>Quick Links</h4>
          <ul className={styles.footerLinks}>
            <li><Link to="/start">Start Check</Link></li>
            <li><Link to="/documents">Documents</Link></li>
            <li><Link to="/history">History</Link></li>
            <li><Link to="/help">Help</Link></li>
          </ul>
        </div>

        <div>
          <h4 className={styles.footerTitle}>Resources</h4>
          <ul className={styles.footerLinks}>
            <li><a href="https://vahan.parivahan.gov.in" target="_blank" rel="noopener noreferrer">VAHAN Portal</a></li>
            <li><a href="https://parivahan.gov.in" target="_blank" rel="noopener noreferrer">Parivahan</a></li>
            <li><a href="https://parivahan.gov.in/echallan" target="_blank" rel="noopener noreferrer">e-Challan</a></li>
          </ul>
        </div>

        <div>
          <h4 className={styles.footerTitle}>Legal</h4>
          <ul className={styles.footerLinks}>
            <li><Link to="/help">MV Act References</Link></li>
            <li><Link to="/help">Disclaimer</Link></li>
          </ul>
        </div>
      </div>
      <div className={styles.copyright}>
        © {new Date().getFullYear()} RCReady — For informational purposes only. Not legal advice.
      </div>
    </footer>
  );
}
