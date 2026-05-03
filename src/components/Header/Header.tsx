import { Link, NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <Shield size={20} />
          </div>
          <div className={styles.logoText}>
            RC<span>Ready</span>
          </div>
        </Link>

        <nav className={styles.nav}>
          <NavLink
            to="/forms"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            Forms
          </NavLink>
          <NavLink
            to="/documents"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            Documents
          </NavLink>
          <NavLink
            to="/verify"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            Verify
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            History
          </NavLink>
          <NavLink
            to="/help"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            Help
          </NavLink>
          <Link to="/wizard/setup" className={styles.startBtn}>
            Run Wizard
          </Link>
        </nav>
      </div>
    </header>
  );
}
