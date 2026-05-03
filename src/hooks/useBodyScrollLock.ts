import { useEffect } from 'react';

// Module-scoped reference count so multiple modals can coexist
// without one's cleanup releasing the lock the other still needs.
let lockCount = 0;
let originalOverflow = '';

export function useBodyScrollLock(active: boolean = true) {
  useEffect(() => {
    if (!active) return;
    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [active]);
}
