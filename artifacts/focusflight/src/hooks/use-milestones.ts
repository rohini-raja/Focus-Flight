import { useEffect, useRef, useState, useCallback } from 'react';

export type MilestoneToast = { id: string; icon: string; message: string };

export type MilestoneMode = 'flight' | 'transit' | 'rail';

interface Options {
  progress: number;
  timeLeft: number;
  totalSeconds: number;
  from?: string;
  to?: string;
  mode: MilestoneMode;
  enabled: boolean;
}

const TOAST_DURATION_MS = 4500;

export function useMilestones({ progress, timeLeft, totalSeconds, from, to, mode, enabled }: Options) {
  const [current, setCurrent] = useState<MilestoneToast | null>(null);
  const queue = useRef<MilestoneToast[]>([]);
  const fired = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showing = useRef(false);

  const dismiss = useCallback(() => {
    showing.current = false;
    if (queue.current.length > 0) {
      const next = queue.current.shift()!;
      showing.current = true;
      setCurrent(next);
      timerRef.current = setTimeout(dismiss, TOAST_DURATION_MS);
    } else {
      setCurrent(null);
    }
  }, []);

  const fire = useCallback((id: string, icon: string, message: string) => {
    if (!enabled) return;
    if (fired.current.has(id)) return;
    fired.current.add(id);
    const toast = { id, icon, message };
    if (showing.current) {
      queue.current.push(toast);
    } else {
      showing.current = true;
      setCurrent(toast);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(dismiss, TOAST_DURATION_MS);
    }
  }, [enabled, dismiss]);

  /* Clear on unmount */
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  /* Progress milestones */
  useEffect(() => {
    if (!enabled) return;

    if (progress >= 25) {
      const msgs: Record<MilestoneMode, [string, string]> = {
        flight:  ['☁️', 'Cruising altitude reached — 25% complete.'],
        transit: ['🎯', to ? `A quarter of the way to ${to}!` : 'A quarter of the way! Keep it up.'],
        rail:    ['🚂', 'First quarter covered. Tracks are clear ahead.'],
      };
      fire('p25', msgs[mode][0], msgs[mode][1]);
    }

    if (progress >= 50) {
      const msgs: Record<MilestoneMode, [string, string]> = {
        flight:  ['✈️', to ? `Halfway there — descending towards ${to}.` : 'Halfway there! Stay on course.'],
        transit: ['⚡', to ? `Halfway to ${to}! You're doing great.` : 'Halfway there! Stay focused.'],
        rail:    ['⚡', to ? `Midway point — ${to} is getting closer.` : 'Midway! Keep the momentum.'],
      };
      fire('p50', msgs[mode][0], msgs[mode][1]);
    }

    if (progress >= 75) {
      const msgs: Record<MilestoneMode, [string, string]> = {
        flight:  ['🌅', 'Beginning descent. Final stretch ahead!'],
        transit: ['🔥', to ? `Almost there — ${to} is just ahead!` : 'Three-quarters done! Push through.'],
        rail:    ['🏁', to ? `Final approach to ${to}. Stay focused!` : '75% done — nearly at the platform!'],
      };
      fire('p75', msgs[mode][0], msgs[mode][1]);
    }
  }, [progress, mode, to, enabled, fire]);

  /* Time milestones */
  useEffect(() => {
    if (!enabled || totalSeconds === 0) return;
    const fiveMinLeft = totalSeconds > 360 && timeLeft <= 300 && timeLeft > 250;
    const oneMinLeft  = totalSeconds > 120 && timeLeft <= 60  && timeLeft > 10;
    if (fiveMinLeft) fire('t5min', '⏱', '5 minutes remaining — finish strong!');
    if (oneMinLeft)  fire('t1min', '🏁', "Final minute — you've got this!");
  }, [timeLeft, totalSeconds, enabled, fire]);

  return { milestoneToast: current, dismissMilestone: dismiss };
}
