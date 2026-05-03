import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Check, Calendar, Printer, X, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildFormUrl, FORM_META, type FormId, type WizardAnswers } from '../../data/formGenerator';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { diagnoseRegNo, formatRegNo, REG_NO_PATTERN, stripRegNo } from './utils';
import styles from './FormShared.module.css';

// ─────────────────────────── Bubble ───────────────────────────

export function Bubble({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.bubble}>
      <div className={styles.bubbleHeader}>
        <span className={styles.bubbleIcon}>{icon}</span>
        <span className={styles.bubbleLabel}>{label}</span>
      </div>
      <div className={styles.bubbleBody}>{children}</div>
    </div>
  );
}

// ─────────────────────────── Field ───────────────────────────

export function Field({
  label,
  placeholder,
  value,
  onChange,
  full,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <label className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="text"
        className={styles.fieldInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

// ─────────────────────────── RegNoField ───────────────────────────

export function RegNoField({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  const stripped = stripRegNo(value);
  const valid = REG_NO_PATTERN.test(stripped);
  const error = valid ? null : diagnoseRegNo(value);

  return (
    <label className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <span className={styles.fieldLabel}>Registration number</span>
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className={`${styles.fieldInput} ${styles.fieldInputUpper} ${error ? styles.fieldInputError : ''}`}
        placeholder="MH 01 AB 1234"
        value={value}
        onChange={(e) => onChange(formatRegNo(e.target.value))}
        aria-label={label}
      />
      {error ? (
        <span className={styles.fieldError} role="alert" aria-live="polite">{error}</span>
      ) : value && valid ? (
        <span className={styles.fieldHelpOk} aria-live="polite">Looks good.</span>
      ) : (
        <span className={styles.fieldHelp}>Format: 2 letters · 2 digits · 1–3 series letters · 4 digits</span>
      )}
    </label>
  );
}

// ─────────────────────────── NumberField ───────────────────────────

export function NumberField({
  label,
  placeholder,
  value,
  onChange,
  full,
  maxLength,
  pattern,
  min,
  max,
  kind = 'number',
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  kind?: 'tel' | 'age' | 'number';
}) {
  let error: string | null = null;
  if (value) {
    if (kind === 'tel') {
      if (!/^\d+$/.test(value)) error = 'Digits only';
      else if (value.length !== 10) error = `Need 10 digits (you have ${value.length})`;
      else if (!/^[6-9]/.test(value)) error = 'Indian mobile starts with 6, 7, 8 or 9';
    } else if (kind === 'age') {
      if (!/^\d+$/.test(value)) error = 'Digits only';
      else {
        const n = parseInt(value, 10);
        if (min != null && n < min) error = `Must be at least ${min}`;
        if (max != null && n > max) error = `Must be at most ${max}`;
      }
    } else if (!/^\d+$/.test(value)) {
      error = 'Digits only';
    }
  }
  const inputMode = kind === 'tel' ? 'tel' : 'numeric';
  return (
    <label className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        className={`${styles.fieldInput} ${error ? styles.fieldInputError : ''}`}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        pattern={pattern}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '');
          onChange(maxLength ? next.slice(0, maxLength) : next);
        }}
      />
      {error && <span className={styles.fieldError} role="alert" aria-live="polite">{error}</span>}
    </label>
  );
}

// ─────────────────────────── Combobox ───────────────────────────

export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder = 'Search…',
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = open && search ? search : value;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        if (search && search !== value) onChange(search);
        setSearch('');
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, search, value, onChange]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    const starts: string[] = [];
    const contains: string[] = [];
    options.forEach((o) => {
      const lo = o.toLowerCase();
      if (lo.startsWith(q)) starts.push(o);
      else if (lo.includes(q)) contains.push(o);
    });
    return [...starts, ...contains];
  }, [options, search]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const items = listRef.current.querySelectorAll('li');
    items[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const select = (opt: string) => {
    onChange(opt);
    setSearch('');
    setOpen(false);
  };

  const openList = () => {
    setOpen(true);
    setSearch('');
    const idx = options.findIndex((o) => o === value);
    setActiveIdx(idx >= 0 ? idx : 0);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const closeAndCommit = () => {
    if (search && search !== value) onChange(search);
    setSearch('');
    setOpen(false);
  };

  return (
    <div className={`${styles.field} ${full ? styles.fieldFull : ''}`} ref={wrapRef}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.comboWrap}>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`combo-list-${label}`}
          aria-autocomplete="list"
          autoComplete="off"
          className={styles.fieldInput}
          placeholder={placeholder}
          value={displayValue}
          onFocus={openList}
          onClick={() => { if (!open) openList(); }}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); setActiveIdx(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!open) { openList(); return; }
              setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered[activeIdx]) select(filtered[activeIdx]);
              else if (search) { onChange(search); setSearch(''); setOpen(false); }
            } else if (e.key === 'Escape') {
              setSearch('');
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          className={`${styles.comboToggle} ${open ? styles.comboToggleOpen : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (open) closeAndCommit();
            else { inputRef.current?.focus(); openList(); }
          }}
          aria-label={open ? 'Close options' : 'Open options'}
          tabIndex={-1}
        >
          <ChevronDown size={14} />
        </button>

        {open && (
          <div className={styles.comboPanel}>
            <ul
              ref={listRef}
              id={`combo-list-${label}`}
              role="listbox"
              className={styles.comboList}
            >
              {filtered.length === 0 ? (
                <li className={styles.comboEmpty}>
                  {search ? `No matches — press Enter to use "${search}"` : 'No options'}
                </li>
              ) : (
                filtered.map((opt, i) => (
                  <li
                    key={opt}
                    role="option"
                    aria-selected={opt === value}
                    className={`${styles.comboOption} ${i === activeIdx ? styles.comboOptionActive : ''} ${opt === value ? styles.comboOptionSelected : ''}`}
                    onMouseDown={(e) => { e.preventDefault(); select(opt); }}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    <span className={styles.comboOptionText}>{opt}</span>
                    {opt === value && <Check size={14} />}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Calendar (custom popup) ───────────────────────────

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

function parseDmy(dmy: string): Date | null {
  if (!dmy) return null;
  const [d, m, y] = dmy.split('/');
  if (!d || !m || !y) return null;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

function formatDmy(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear());
  return `${d}/${m}/${y}`;
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarPopup({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);
  const selected = useMemo(() => parseDmy(value), [value]);
  const [view, setView] = useState<Date>(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Build a 6-week grid (42 cells) starting from Monday
  const cells = useMemo(() => {
    const firstDay = new Date(view.getFullYear(), view.getMonth(), 1);
    // 0=Sun ... 6=Sat. We want Monday-first: shift so Mo=0.
    const offset = (firstDay.getDay() + 6) % 7;
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - offset);
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [view]);

  const goPrev = () => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1));
  const goNext = () => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1));

  const pick = (d: Date) => {
    onSelect(formatDmy(d));
    onClose();
  };

  return (
    <motion.div
      className={styles.calPopup}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12 }}
      role="dialog"
      aria-label="Choose a date"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.calHead}>
        <button type="button" className={styles.calNav} onClick={goPrev} aria-label="Previous month">
          <ChevronLeft size={16} />
        </button>
        <div className={styles.calTitle}>
          {MONTHS_FULL[view.getMonth()]} {view.getFullYear()}
        </div>
        <button type="button" className={styles.calNav} onClick={goNext} aria-label="Next month">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className={styles.calWeek}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={styles.calWeekDay}>{w}</span>
        ))}
      </div>
      <div className={styles.calGrid}>
        {cells.map((d) => {
          const inMonth = d.getMonth() === view.getMonth();
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, selected);
          return (
            <button
              key={d.toISOString()}
              type="button"
              className={[
                styles.calCell,
                !inMonth ? styles.calCellOutside : '',
                isToday ? styles.calCellToday : '',
                isSelected ? styles.calCellSelected : '',
              ].filter(Boolean).join(' ')}
              onClick={() => pick(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <div className={styles.calFoot}>
        <button
          type="button"
          className={styles.calFootBtn}
          onClick={() => pick(today)}
        >
          Today
        </button>
        <button
          type="button"
          className={styles.calFootBtn}
          onClick={() => { onSelect(''); onClose(); }}
        >
          Clear
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────── DateField ───────────────────────────

export function DateField({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <label className={`${styles.field} ${full ? styles.fieldFull : ''}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.dateFieldWrap} ref={wrapRef}>
        <button
          type="button"
          className={`${styles.dateField} ${open ? styles.dateFieldOpen : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={value ? styles.dateValue : styles.datePlaceholder}>
            {value || 'dd / mm / yyyy'}
          </span>
          <Calendar size={16} className={styles.dateIcon} />
        </button>
        {open && (
          <CalendarPopup
            value={value}
            onSelect={onChange}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </label>
  );
}

// ─────────────────────────── ToggleRow ───────────────────────────

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleText}>
        <div className={styles.toggleLabel}>{label}</div>
        {hint && <div className={styles.toggleHint}>{hint}</div>}
      </div>
      <div className={styles.toggleBtns}>
        <button
          className={`${styles.toggleBtn} ${!value ? styles.toggleBtnActive : ''}`}
          onClick={() => onChange(false)}
        >
          No
        </button>
        <button
          className={`${styles.toggleBtn} ${value ? styles.toggleBtnActive : ''}`}
          onClick={() => onChange(true)}
        >
          Yes
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────── FormFillModal ───────────────────────────

export function FormFillModal({
  formId,
  title,
  hint,
  children,
  onClose,
  onPreview,
  canPreview = true,
}: {
  formId: FormId;
  title?: string;
  hint?: string;
  children: React.ReactNode;
  onClose: () => void;
  onPreview: () => void;
  canPreview?: boolean;
}) {
  const meta = FORM_META[formId];
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <motion.div
      className={styles.modalBackdrop}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        ref={dialogRef}
        className={`${styles.modal} ${styles.fillModal}`}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.22 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles.modalHeader}>
          <div className={styles.modalTitleWrap}>
            <span className={styles.modalBadge}>{meta.title}</span>
            <span id={titleId} className={styles.modalSubtitle}>{title ?? meta.subtitle}</span>
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className={styles.fillBody}>
          {hint && <p className={styles.fillHint}>{hint}</p>}
          {children}
        </div>
        <footer className={styles.fillFooter}>
          <button
            type="button"
            className={styles.modalBtnPrimary}
            onClick={onPreview}
            disabled={!canPreview}
          >
            <Eye size={14} /> Preview &amp; Print
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────── PreviewModal ───────────────────────────

export function PreviewModal({
  formId,
  answers,
  onClose,
}: {
  formId: FormId;
  answers: WizardAnswers;
  onClose: () => void;
}) {
  const meta = FORM_META[formId];
  const url = buildFormUrl(formId, answers);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useBodyScrollLock(true);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const handlePrint = () => { iframeRef.current?.contentWindow?.print(); };

  return (
    <motion.div
      className={styles.modalBackdrop}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        ref={dialogRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.22 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={styles.modalHeader}>
          <div className={styles.modalTitleWrap}>
            <span className={styles.modalBadge}>{meta.title}</span>
            <span id={titleId} className={styles.modalSubtitle}>{meta.subtitle}</span>
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalBtnPrimary}
              onClick={handlePrint}
              title="Use the browser dialog to print or save as PDF"
            >
              <Printer size={14} /> Print
            </button>
            <button
              type="button"
              className={styles.modalClose}
              onClick={onClose}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className={styles.modalBody}>
          <iframe
            ref={iframeRef}
            className={styles.modalIframe}
            src={url}
            title={`${meta.title} preview`}
          />
        </div>
        <footer className={styles.modalFooter}>
          Fields are editable in the preview. Use Print → "Save as PDF" in the browser dialog to get a PDF.
        </footer>
      </motion.div>
    </motion.div>
  );
}
