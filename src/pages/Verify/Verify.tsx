import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Upload, Trash2, Loader, Check, X, Minus } from 'lucide-react';
import {
  DOC_DESCRIPTORS,
  DOC_ORDER,
  type DocId,
  type ExtractedSet,
} from '../../services/ai/documents';
import {
  extractFromImage,
  DocumentMismatchError,
  AiCallError,
  AiConfigError,
  AiParseError,
  LowQualityImageError,
} from '../../services/ai/client';
import {
  runChecks,
  summarise,
  type CheckResult,
} from '../../services/ai/crossCheck';
import {
  clearSlotStorage,
  emptySlot as initSlot,
  loadSlots,
  saveSlot,
  type DocSlot,
  type DocSlotError,
} from './slotStorage';
import { useChecklistStore } from '../../store/checklistStore';
import { factsFromExtraction } from '../../data/factsMapping';
import styles from './Verify.module.css';

type DocStatus = 'idle' | 'uploaded' | 'extracting' | 'extracted' | 'error';

/** Meta fields used by the validator — hidden from the user-facing field list. */
const INTERNAL_FIELDS = new Set([
  'documentTypeDetected',
  'matchesExpectedDocument',
  'matchReason',
]);

function statusBadgeClass(status: DocStatus): string {
  switch (status) {
    case 'uploaded':
      return styles.statusUploaded;
    case 'extracting':
      return styles.statusLoading;
    case 'extracted':
      return styles.statusDone;
    case 'error':
      return styles.statusError;
    default:
      return styles.statusIdle;
  }
}

function statusLabel(status: DocStatus): string {
  switch (status) {
    case 'uploaded':
      return 'Ready';
    case 'extracting':
      return 'Extracting…';
    case 'extracted':
      return 'Done';
    case 'error':
      return 'Error';
    default:
      return 'Empty';
  }
}

function formatFieldValue(v: unknown): { text: string; missing: boolean } {
  if (v === null || v === undefined || v === '') return { text: '—', missing: true };
  if (Array.isArray(v)) return { text: `${v.length} item(s)`, missing: v.length === 0 };
  if (typeof v === 'object') return { text: JSON.stringify(v), missing: false };
  return { text: String(v), missing: false };
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

function checkBorderClass(c: CheckResult): string {
  if (c.status === 'skipped') return styles.checkSkipped;
  if (c.status === 'pass') {
    if (c.severity === 'red') return styles.checkPassRed;
    if (c.severity === 'yellow') return styles.checkPassYellow;
    return styles.checkPassInfo;
  }
  return c.severity === 'red' ? styles.checkFailRed : styles.checkFailYellow;
}

function CheckIcon({ c }: { c: CheckResult }) {
  if (c.status === 'pass') {
    return (
      <div className={`${styles.checkIcon} ${styles.iconPass}`}>
        <Check size={14} strokeWidth={3} />
      </div>
    );
  }
  if (c.status === 'skipped') {
    return (
      <div className={`${styles.checkIcon} ${styles.iconSkipped}`}>
        <Minus size={14} strokeWidth={3} />
      </div>
    );
  }
  const cls = c.severity === 'red' ? styles.iconFailRed : styles.iconFailYellow;
  return (
    <div className={`${styles.checkIcon} ${cls}`}>
      <X size={14} strokeWidth={3} />
    </div>
  );
}

type ErrorKind = DocSlotError['kind'];

export default function Verify() {
  // Lazy init from sessionStorage so a refresh restores prior slot state
  // (uploaded files, extracted fields, errors) without a flicker.
  const [slots, setSlots] = useState<Record<DocId, DocSlot>>(() => loadSlots());
  const [running, setRunning] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);

  // Wizard integration: when an active deal session exists, every successful
  // extraction also writes facts + flags into the deal store so the smart
  // checklist + form prefill light up. On standalone /verify with no session,
  // these calls become no-ops (the selectors return null).
  const activeSession = useChecklistStore((s) => s.activeSession);
  const setExtractedDocs = useChecklistStore((s) => s.setExtractedDocs);
  const setFacts = useChecklistStore((s) => s.setFacts);
  const writeToDeal = !!activeSession;

  // Caches base64 of files we've already serialised, so re-saving on every
  // status change doesn't re-read the same file's bytes.
  const fileBase64Cache = useRef<Map<File, string>>(new Map());
  // Tracks each slot's last-saved snapshot so the persistence effect only
  // writes slots that actually changed.
  const lastSavedRef = useRef<Map<DocId, string>>(new Map());

  // Persist on every slots change. Per-slot writes so quota issues with
  // one slot don't take down the rest.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const id of DOC_ORDER) {
        const slot = slots[id];
        const snapshot = JSON.stringify({
          fileName: slot.file?.name ?? null,
          fileSize: slot.file?.size ?? null,
          status: slot.status,
          extracted: slot.extracted,
          error: slot.error,
          fromCache: slot.fromCache,
        });
        if (lastSavedRef.current.get(id) === snapshot) continue;
        if (cancelled) return;
        await saveSlot(id, slot, fileBase64Cache.current);
        lastSavedRef.current.set(id, snapshot);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slots]);

  // On unmount: revoke all the blob URLs we created.
  useEffect(() => {
    return () => {
      for (const id of DOC_ORDER) {
        const url = slots[id].previewUrl;
        if (url) URL.revokeObjectURL(url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSlot = (id: DocId, patch: Partial<DocSlot>) =>
    setSlots(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const handleFile = (id: DocId, file: File) => {
    const slot = slots[id];
    if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
    if (slot.file) fileBase64Cache.current.delete(slot.file);
    updateSlot(id, {
      status: 'uploaded',
      file,
      previewUrl: URL.createObjectURL(file),
      extracted: null,
      error: null,
      fromCache: false,
    });
  };

  const clearSlot = (id: DocId) => {
    const slot = slots[id];
    if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
    if (slot.file) fileBase64Cache.current.delete(slot.file);
    clearSlotStorage(id);
    lastSavedRef.current.delete(id);
    setSlots(prev => ({ ...prev, [id]: initSlot() }));
  };

  const uploadedDocIds = useMemo(
    () => DOC_ORDER.filter(id => slots[id].file !== null),
    [slots],
  );

  const runAll = async () => {
    if (uploadedDocIds.length === 0) return;
    setRunning(true);
    setGlobalError(null);
    setChecks([]);

    const next = { ...slots };
    const collected: ExtractedSet = {};

    for (const id of uploadedDocIds) {
      next[id] = { ...next[id], status: 'extracting', error: null };
      setSlots({ ...next });
      try {
        const file = next[id].file!;
        const outcome = await extractFromImage(id, file);
        next[id] = {
          ...next[id],
          status: 'extracted',
          extracted: outcome.data,
          fromCache: outcome.fromCache,
          error: null,
        };
        (collected as Record<string, unknown>)[id] = outcome.data;
        setSlots({ ...next });
        const flags = runChecks(collected);
        setChecks(flags);
        if (writeToDeal) {
          setExtractedDocs(collected, flags);
          const { facts } = factsFromExtraction(collected);
          setFacts(facts, 'extracted');
        }
      } catch (err) {
        let kind: ErrorKind = 'generic';
        let msg = 'Extraction failed.';
        if (err instanceof DocumentMismatchError) {
          kind = 'mismatch';
          msg = err.message;
        } else if (err instanceof LowQualityImageError) {
          kind = 'lowQuality';
          msg = err.message;
        } else if (err instanceof AiConfigError) {
          kind = 'config';
          msg = err.message;
        } else if (err instanceof AiCallError) {
          msg = err.message;
        } else if (err instanceof AiParseError) {
          msg = err.message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        next[id] = { ...next[id], status: 'error', error: { kind, message: msg } };
        setSlots({ ...next });
        if (kind === 'config') {
          setGlobalError(msg);
          setRunning(false);
          return;
        }
      }
    }

    const finalFlags = runChecks(collected);
    setChecks(finalFlags);
    if (writeToDeal) {
      setExtractedDocs(collected, finalFlags);
      const { facts } = factsFromExtraction(collected);
      setFacts(facts, 'extracted');
    }
    setRunning(false);
  };

  const summary = useMemo(() => summarise(checks), [checks]);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Document Verification</h1>
        <p className={styles.subtitle}>
          Upload a clear photo of each document. The AI extracts the fields,
          and the cross-checks from the verification guide run automatically.
        </p>

        <div className={styles.warning}>
          <AlertTriangle size={18} color="#F9A825" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div className={styles.warningTitle}>Read first</div>
            <div>
              This is a screening tool, not a substitute for physical inspection.
              Authenticity checks (raised ink, holograms, tampered chassis plates)
              still need to be done in person.
            </div>
          </div>
        </div>

        {globalError && <div className={styles.errMsg}>{globalError}</div>}

        <div className={styles.runBar}>
          <div className={styles.runBarInfo}>
            {uploadedDocIds.length === 0
              ? 'Upload at least one document below to begin.'
              : `${uploadedDocIds.length} document${uploadedDocIds.length === 1 ? '' : 's'} ready.`}
          </div>
          <button
            className={styles.runBtn}
            disabled={uploadedDocIds.length === 0 || running}
            onClick={runAll}
          >
            {running ? 'Running…' : 'Extract & Verify'}
          </button>
        </div>

        <div className={styles.grid}>
          {DOC_ORDER.map(id => {
            const desc = DOC_DESCRIPTORS[id];
            const slot = slots[id];
            return (
              <div key={id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <div className={styles.cardTitle}>{desc.label}</div>
                    <div className={styles.cardHelper}>{desc.helper}</div>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${statusBadgeClass(slot.status)}`}
                  >
                    {slot.status === 'extracting' && (
                      <Loader size={10} style={{ marginRight: 4, display: 'inline' }} />
                    )}
                    {slot.status === 'extracted' && slot.fromCache
                      ? 'Cached'
                      : statusLabel(slot.status)}
                  </span>
                </div>

                {slot.previewUrl ? (
                  <img src={slot.previewUrl} alt={desc.label} className={styles.preview} />
                ) : (
                  <label className={styles.dropZone}>
                    <Upload size={18} />
                    <div>Click to upload image</div>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(id, f);
                      }}
                    />
                  </label>
                )}

                <div className={styles.cardActions}>
                  {slot.file ? (
                    <>
                      <label className={styles.btn}>
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleFile(id, f);
                          }}
                        />
                      </label>
                      <button
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={() => clearSlot(id)}
                        disabled={running}
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </>
                  ) : null}
                </div>

                {slot.error && (
                  <div
                    className={`${styles.slotError} ${
                      slot.error.kind === 'mismatch'
                        ? styles.slotErrorMismatch
                        : slot.error.kind === 'lowQuality'
                        ? styles.slotErrorLowQuality
                        : styles.slotErrorGeneric
                    }`}
                  >
                    <div className={styles.slotErrorTitle}>
                      {slot.error.kind === 'mismatch' && 'Wrong document for this slot'}
                      {slot.error.kind === 'lowQuality' && 'Image quality too low'}
                      {slot.error.kind !== 'mismatch' && slot.error.kind !== 'lowQuality' && 'Extraction error'}
                    </div>
                    <div className={styles.slotErrorBody}>{slot.error.message}</div>
                  </div>
                )}

                {!!slot.extracted && typeof slot.extracted === 'object' && (
                  <div className={styles.fields}>
                    {Object.entries(slot.extracted as Record<string, unknown>)
                      .filter(([k]) => !INTERNAL_FIELDS.has(k))
                      .map(([k, v]) => {
                        const { text, missing } = formatFieldValue(v);
                        return (
                          <div key={k} className={styles.fieldRow}>
                            <span className={styles.fieldKey}>{formatFieldLabel(k)}</span>
                            <span
                              className={`${styles.fieldVal} ${missing ? styles.fieldValMissing : ''}`}
                            >
                              {text}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {checks.length > 0 && (
          <>
            <h2 className={styles.checksHeader}>Cross-checks</h2>
            <div className={styles.summary}>
              <div className={styles.summaryCard}>
                <span className={`${styles.summaryNum} ${styles.numRed}`}>{summary.redFails}</span>
                <span className={styles.summaryLbl}>Red flags</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={`${styles.summaryNum} ${styles.numYellow}`}>{summary.yellowFails}</span>
                <span className={styles.summaryLbl}>Yellow flags</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={`${styles.summaryNum} ${styles.numGreen}`}>{summary.passed}</span>
                <span className={styles.summaryLbl}>Passed</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={`${styles.summaryNum} ${styles.numMuted}`}>{summary.skipped}</span>
                <span className={styles.summaryLbl}>Skipped</span>
              </div>
            </div>

            <div className={styles.checks}>
              {checks
                .slice()
                .sort((a, b) => severityRank(a) - severityRank(b))
                .map(c => (
                  <div key={c.id} className={`${styles.check} ${checkBorderClass(c)}`}>
                    <CheckIcon c={c} />
                    <div className={styles.checkBody}>
                      <div>
                        <span className={styles.checkTitle}>{c.title}</span>
                        <span className={styles.checkOrigin}>· {c.origin}</span>
                      </div>
                      <div className={styles.checkMsg}>{c.message}</div>
                      <div className={styles.checkInvolved}>
                        {c.involved.map(d => (
                          <span key={d} className={styles.tag}>
                            {DOC_DESCRIPTORS[d as DocId]?.label ?? d}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function severityRank(c: CheckResult): number {
  if (c.status === 'fail' && c.severity === 'red') return 0;
  if (c.status === 'fail' && c.severity === 'yellow') return 1;
  if (c.status === 'skipped') return 2;
  if (c.status === 'pass' && c.severity === 'red') return 3;
  if (c.status === 'pass' && c.severity === 'yellow') return 4;
  return 5;
}
