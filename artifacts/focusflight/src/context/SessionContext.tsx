import React, { createContext, useContext, useState, useEffect } from 'react';
import { SessionConfig } from '@/utils/flight-utils';

interface SessionContextType {
  activeSession: SessionConfig | null;
  setActiveSession: (session: SessionConfig | null) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSession, setActiveSession] = useState<SessionConfig | null>(() => {
    const saved = localStorage.getItem('focusflight_active_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('focusflight_active_session', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('focusflight_active_session');
    }
  }, [activeSession]);

  const clearSession = () => setActiveSession(null);

  return (
    <SessionContext.Provider value={{ activeSession, setActiveSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
