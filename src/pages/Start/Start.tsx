import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Tag, ArrowRight } from 'lucide-react';
import type { UserRole, ScenarioFlags } from '../../types/checklist';
import { useChecklistStore } from '../../store/checklistStore';
import styles from './Start.module.css';

export default function Start() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startSession = useChecklistStore((s) => s.startSession);

  const preselectedRole = searchParams.get('role') as UserRole | null;

  const [role, setRole] = useState<UserRole | null>(preselectedRole);
  const [vehicleRegNo, setVehicleRegNo] = useState('');
  const [flags, setFlags] = useState<ScenarioFlags>({
    hasLoan: false,
    isOutOfState: false,
    isSameRTO: true,
  });

  const handleSubmit = () => {
    if (!role) return;
    startSession(role, vehicleRegNo.trim().toUpperCase(), flags);
    navigate('/check');
  };

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className={styles.title}>Start Your Check</h1>
        <p className={styles.subtitle}>Tell us about your situation to get a personalised checklist</p>

        {/* Role Toggle */}
        <div className={styles.roleToggle}>
          <button
            className={`${styles.roleOption} ${role === 'buyer' ? styles.roleOptionActive : ''}`}
            onClick={() => setRole('buyer')}
            type="button"
          >
            <div className={styles.roleOptionIcon} style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              <ShoppingCart size={24} />
            </div>
            <div className={styles.roleOptionLabel}>Buyer</div>
          </button>
          <button
            className={`${styles.roleOption} ${role === 'seller' ? styles.roleOptionActive : ''}`}
            onClick={() => setRole('seller')}
            type="button"
          >
            <div className={styles.roleOptionIcon} style={{ background: 'var(--color-cta-light)', color: 'var(--color-cta)' }}>
              <Tag size={24} />
            </div>
            <div className={styles.roleOptionLabel}>Seller</div>
          </button>
        </div>

        {/* Vehicle Reg Input */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Vehicle Registration Number
            <span className={styles.labelOptional}>(optional)</span>
          </label>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g. MH 01 AB 1234"
            value={vehicleRegNo}
            onChange={(e) => setVehicleRegNo(e.target.value)}
            maxLength={15}
          />
        </div>

        {/* Scenario Toggles */}
        <div className={styles.scenarioSection}>
          <div className={styles.scenarioTitle}>Vehicle Situation</div>

          <div className={styles.toggleRow}>
            <div className={styles.toggleLabel}>
              Does the vehicle have an active loan?
              <span className={styles.toggleHint}>Bank hypothecation / EMI on the vehicle</span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={flags.hasLoan}
                onChange={(e) => setFlags({ ...flags, hasLoan: e.target.checked })}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          {role === 'buyer' && (
            <div className={styles.toggleRow}>
              <div className={styles.toggleLabel}>
                Is the vehicle from outside Maharashtra?
                <span className={styles.toggleHint}>Non-MH registration number plate</span>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={flags.isOutOfState}
                  onChange={(e) => setFlags({ ...flags, isOutOfState: e.target.checked })}
                />
                <span className={styles.toggleSlider} />
              </label>
            </div>
          )}

          <div className={styles.toggleRow}>
            <div className={styles.toggleLabel}>
              Is the vehicle from the same RTO area?
              <span className={styles.toggleHint}>Buyer and vehicle registered in same RTO jurisdiction</span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={flags.isSameRTO}
                onChange={(e) => setFlags({ ...flags, isSameRTO: e.target.checked })}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          className={styles.submit}
          onClick={handleSubmit}
          disabled={!role}
        >
          Start Check <ArrowRight size={18} />
        </button>
      </motion.div>
    </div>
  );
}
