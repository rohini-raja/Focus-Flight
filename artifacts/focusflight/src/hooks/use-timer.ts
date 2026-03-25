import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(initialMinutes: number, onComplete?: () => void) {
  const initialSeconds = initialMinutes * 60;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const endTimeRef = useRef<number | null>(null);

  // Use a more robust timer approach to handle background tab throttling
  useEffect(() => {
    let intervalId: number;

    if (isActive && timeLeft > 0) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
      }

      intervalId = window.setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTimeRef.current! - now) / 1000));
        
        setTimeLeft(remaining);

        if (remaining <= 0) {
          setIsActive(false);
          setIsFinished(true);
          endTimeRef.current = null;
          if (onComplete) onComplete();
        }
      }, 500); // Check 2x a second to be responsive
    } else if (!isActive) {
      // If paused, clear the end time reference so it recalculates on resume
      endTimeRef.current = null;
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, timeLeft, onComplete]);

  const toggle = useCallback(() => {
    setIsActive(!isActive);
  }, [isActive]);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const resume = useCallback(() => {
    if (timeLeft > 0) setIsActive(true);
  }, [timeLeft]);

  const reset = useCallback(() => {
    setIsActive(false);
    setIsFinished(false);
    setTimeLeft(initialSeconds);
    endTimeRef.current = null;
  }, [initialSeconds]);

  const progress = initialSeconds > 0 ? ((initialSeconds - timeLeft) / initialSeconds) * 100 : 0;

  return { 
    timeLeft, 
    isActive, 
    isFinished, 
    toggle, 
    pause, 
    resume, 
    reset,
    progress,
    totalSeconds: initialSeconds
  };
}
