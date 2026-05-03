import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Tag, ArrowRight } from 'lucide-react';
import type { UserRole, ScenarioFlags } from '../../types/checklist';
import { useChecklistStore } from '../../store/checklistStore';
import { formatRegNo, isValidRegNo, stripRegNo } from '../../components/FormShared/utils';
import styles from './WizardSetup.module.css';

export default function WizardSetup() {
  const navigate = useNavigate();
  const activeSession = useChecklistStore((s) => s.activeSession);
  const startSession = useChecklistStore((s) => s.startSession);
  const setScenarioFlags = useChecklistStore((s) => s.setScenarioFlags);
  const setVehicleRegNo = useChecklistStore((s) => s.setVehicleRegNo);
  const setCurrentStep = useChecklistStore((s) => s.setCurrentStep);

  // Lazy-initialise from the active session — re-running on session change
  // is not needed because the store itself is the source of truth on submit.
  const [role, setRole] = useState<UserRole | null>(() => activeSession?.role ?? null);
  const [regNo, setRegNo] = useState(() => activeSession?.vehicleRegNo ?? '');
  const [flags, setFlags] = useState<ScenarioFlags>(() =>
    activeSession?.scenarioFlags ?? {
      hasLoan: false,
      isOutOfState: false,
      isSameRTO: true,
    },
  );

  const regStripped = stripRegNo(regNo);
  const regTouched = regStripped.length > 0;
  const regValid = isValidRegNo(regNo);
  const regError = regTouched && !regValid;

  const handleContinue = () => {
    if (!role) return;
    if (regError) return;
    const cleaned = regTouched ? formatRegNo(regNo) : '';
    if (activeSession) {
      // resume / update
      setScenarioFlags(flags);
      setVehicleRegNo(cleaned);
      setCurrentStep(2);
    } else {
      const id = startSession(role, cleaned, flags);
      // currentStep is set to 1 in startSession; bump to 2 now that user finished setup.
      setCurrentStep(2);
      void id; // avoid unused-warning if startSession's return is ever needed
    }
    navigate('/wizard/verify');
  };

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Step 1 — Setup</h1>
      <p className={styles.subtitle}>
        Tell us your role and the vehicle's situation. We'll personalise every
        downstream step from your answer here.
      </p>

      <div className={styles.card}>
        <div className={styles.label}>I am the…</div>
        <div className={styles.roles}>
          <button
            type="button"
            className={`${styles.role} ${role === 'buyer' ? styles.roleActive : ''}`}
            onClick={() => setRole('buyer')}
            aria-pressed={role === 'buyer'}
          >
            <div className={styles.roleIcon}>
              <ShoppingCart size={18} />
            </div>
            <div className={styles.roleBody}>
              <div className={styles.roleTitle}>Buyer</div>
              <p className={styles.roleDesc}>
                I'm buying a second-hand vehicle and need the RC transferred to my name.
              </p>
            </div>
          </button>
          <button
            type="button"
            className={`${styles.role} ${role === 'seller' ? styles.roleActive : ''}`}
            onClick={() => setRole('seller')}
            aria-pressed={role === 'seller'}
          >
            <div className={styles.roleIcon}>
              <Tag size={18} />
            </div>
            <div className={styles.roleBody}>
              <div className={styles.roleTitle}>Seller</div>
              <p className={styles.roleDesc}>
                I'm selling my vehicle and want to clear my legal liability.
              </p>
            </div>
          </button>
        </div>

        <div className={styles.label}>Vehicle registration number (optional)</div>
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className={`${styles.input} ${regError ? styles.inputError : ''}`}
          placeholder="MH 12 AB 1234"
          value={regNo}
          onChange={(e) => setRegNo(formatRegNo(e.target.value))}
          maxLength={13}
          aria-invalid={regError}
        />
        {regError ? (
          <span className={styles.inputErrorMsg}>
            Use the AA NN AA NNNN format — e.g. MH 12 AB 1234.
          </span>
        ) : regTouched && regValid ? (
          <span className={styles.inputHelpOk}>Looks good.</span>
        ) : (
          <span className={styles.inputHelp}>
            Optional — leave blank or use 2 letters · 2 digits · 2 letters · 4 digits.
          </span>
        )}

        <div className={styles.label}>Vehicle situation</div>
        <div className={styles.flags}>
          <div className={styles.flag}>
            <div className={styles.flagText}>
              Does the vehicle have an active or recently-closed loan?
              <span className={styles.flagHint}>
                Bank hypothecation / EMI on the vehicle.
              </span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={flags.hasLoan}
                onChange={(e) => setFlags({ ...flags, hasLoan: e.target.checked })}
              />
              <span className={styles.slider} />
            </label>
          </div>

          {role === 'buyer' && (
            <div className={styles.flag}>
              <div className={styles.flagText}>
                Is the vehicle from outside Maharashtra?
                <span className={styles.flagHint}>Non-MH plate (different-state RC).</span>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={flags.isOutOfState}
                  onChange={(e) => setFlags({ ...flags, isOutOfState: e.target.checked })}
                />
                <span className={styles.slider} />
              </label>
            </div>
          )}

          <div className={styles.flag}>
            <div className={styles.flagText}>
              Same RTO as the vehicle's current registration?
              <span className={styles.flagHint}>
                Both you and the vehicle are in the same RTO jurisdiction.
              </span>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={flags.isSameRTO}
                onChange={(e) => setFlags({ ...flags, isSameRTO: e.target.checked })}
              />
              <span className={styles.slider} />
            </label>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.continueBtn}
            onClick={handleContinue}
            disabled={!role || regError}
          >
            Continue to Verify <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
