import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Tag, ArrowRight, Trash2 } from 'lucide-react';
import { useChecklistStore } from '../../store/checklistStore';
import { getFilteredItems, calculateProgress, isItemVisible } from '../../hooks/useChecklist';
import styles from './History.module.css';

export default function History() {
  const sessions = useChecklistStore((s) => s.sessions);
  const resumeSession = useChecklistStore((s) => s.resumeSession);
  const deleteSession = useChecklistStore((s) => s.deleteSession);
  const navigate = useNavigate();

  const handleResume = (id: string) => {
    resumeSession(id);
    navigate('/check');
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Session History</h1>
        <p className={styles.subtitle}>Resume a previous check or view past results</p>

        {sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No sessions yet</h3>
            <p>Start your first RC readiness check to see it here.</p>
            <Link to="/start">
              Start Check <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {sessions.map((session, i) => {
              const allItems = getFilteredItems(session.role, session.scenarioFlags);
              const items = allItems.filter((item) => isItemVisible(item, session.items));
              const progress = calculateProgress(items, session.items);
              const isBuyer = session.role === 'buyer';

              return (
                <motion.div
                  key={session.id}
                  className={styles.sessionCard}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div
                    className={styles.sessionIcon}
                    style={{
                      background: isBuyer ? 'var(--color-primary-light)' : 'var(--color-cta-light)',
                      color: isBuyer ? 'var(--color-primary)' : 'var(--color-cta)',
                    }}
                  >
                    {isBuyer ? <ShoppingCart size={24} /> : <Tag size={24} />}
                  </div>
                  <div className={styles.sessionBody}>
                    <div className={styles.sessionRole}>
                      {isBuyer ? 'Buyer' : 'Seller'} Check
                      {session.vehicleRegNo ? ` · ${session.vehicleRegNo}` : ''}
                    </div>
                    <div className={styles.sessionMeta}>
                      {progress.percentage}% complete · {progress.answered}/{progress.total} items ·{' '}
                      {new Date(session.lastUpdatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className={styles.sessionActions}>
                    <button
                      className={styles.resumeBtn}
                      onClick={() => handleResume(session.id)}
                    >
                      Resume
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => deleteSession(session.id)}
                      title="Delete session"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
