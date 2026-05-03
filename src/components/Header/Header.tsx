import { Link, NavLink } from 'react-router-dom';
import { Wand2, HelpCircle } from 'lucide-react';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      {/* Top strip — Maharashtra context */}
      <div className={styles.strip}>
        <div className={styles.stripInner}>
          <span className={styles.locale}>
            <span className={styles.localeFlag} aria-hidden="true">
              <span /><span /><span />
            </span>
            Maharashtra RTO
          </span>
          <span className={styles.stripDot} aria-hidden="true" />
          <span className={styles.stripNote}>
            Based on the Motor Vehicles Act 1988 &amp; Maharashtra MV Rules 1989
          </span>
        </div>
      </div>

      {/* Main row — logo, nav, CTA */}
      <div className={styles.main}>
        <div className={styles.mainInner}>
          <Link to="/" className={styles.logo} aria-label="RC Ready home">
            <img
              src="/logo-mark.svg"
              alt=""
              aria-hidden="true"
              className={styles.logoMark}
            />
            <span className={styles.logoText}>
              RC<em>Ready</em>
            </span>
          </Link>

          <nav className={styles.nav}>
            <NavLink
              to="/wizard/setup"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Transfer wizard
            </NavLink>
            <NavLink
              to="/start"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Readiness audit
            </NavLink>
            <NavLink
              to="/forms"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Form studio
            </NavLink>
            <NavLink
              to="/verify"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Document scanner
            </NavLink>
            <NavLink
              to="/documents"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Legal library
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              Saved sessions
            </NavLink>
          </nav>

          <div className={styles.actions}>
            <Link to="/help" className={styles.ghostBtn}>
              <HelpCircle size={16} />
              Help
            </Link>
            <Link to="/wizard/setup" className={styles.startBtn}>
              <Wand2 size={16} />
              Start wizard
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
