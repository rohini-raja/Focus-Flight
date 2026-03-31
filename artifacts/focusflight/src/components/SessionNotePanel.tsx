import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Bottom offset in px — set higher if a progress bar or HUD is below */
  bottomOffset?: number;
}

const GLASS = {
  background: 'rgba(8,10,20,0.88)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18,
} as const;

export function SessionNotePanel({ value, onChange, bottomOffset = 52 }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: bottomOffset, left: '50%', transform: 'translateX(-50%)', zIndex: 9150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="note-body"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            style={{ ...GLASS, padding: '14px 16px', width: 290 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase' }}>
                Session Note
              </span>
              {value.length > 0 && (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{value.length}/500</span>
              )}
            </div>
            <textarea
              value={value}
              onChange={e => onChange(e.target.value.slice(0, 500))}
              placeholder="Capture a thought…"
              autoFocus
              style={{
                width: '100%',
                height: 110,
                resize: 'none',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: 'white',
                fontSize: 13,
                lineHeight: 1.6,
                padding: '10px 12px',
                outline: 'none',
                fontFamily: 'inherit',
                caretColor: '#30D158',
                boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(48,209,88,0.35)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileTap={{ scale: 0.92 }}
        style={{
          ...GLASS,
          border: open
            ? '1px solid rgba(48,209,88,0.35)'
            : '1px solid rgba(255,255,255,0.11)',
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: open ? '#30D158' : 'rgba(255,255,255,0.55)',
          transition: 'color 0.2s, border-color 0.2s',
          background: open ? 'rgba(48,209,88,0.08)' : 'rgba(8,10,20,0.88)',
        }}
      >
        <span style={{ fontSize: 15 }}>{value.length > 0 && !open ? '📝' : '✏️'}</span>
        {open ? 'Close note' : value.length > 0 ? 'Edit note' : 'Add a note'}
      </motion.button>
    </div>
  );
}
