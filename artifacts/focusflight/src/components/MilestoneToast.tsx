import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MilestoneToast as MilestoneToastType } from '@/hooks/use-milestones';

interface Props {
  toast: MilestoneToastType | null;
  onDismiss: () => void;
}

export function MilestoneToast({ toast, onDismiss }: Props) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!toast) { setProgress(100); return; }
    setProgress(100);
    const start = Date.now();
    const duration = 4500;
    const raf = () => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct > 0) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [toast?.id]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, x: 80, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          onClick={onDismiss}
          style={{
            position: 'fixed',
            bottom: 100,
            right: 24,
            zIndex: 9400,
            cursor: 'pointer',
            maxWidth: 300,
            minWidth: 220,
            userSelect: 'none',
          }}
        >
          <div style={{
            background: 'rgba(8,10,20,0.88)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(48,209,88,0.25)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(48,209,88,0.08)',
          }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{toast.icon}</span>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 600, color: 'white',
                lineHeight: 1.45, letterSpacing: 0.1,
              }}>
                {toast.message}
              </p>
            </div>
            {/* Depleting progress bar */}
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #30D158, #86efac)',
                borderRadius: 2,
                transition: 'width 0.1s linear',
              }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
