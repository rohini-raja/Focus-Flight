import { useState, useEffect } from 'react';
import { SessionConfig } from '@/utils/flight-utils';

export function useLogbook() {
  const [logs, setLogs] = useState<SessionConfig[]>([]);

  useEffect(() => {
    const loadLogs = () => {
      const saved = localStorage.getItem('focusflight_logbook');
      if (saved) {
        try {
          setLogs(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse logbook", e);
        }
      }
    };
    loadLogs();
  }, []);

  const addLog = (session: SessionConfig) => {
    const newLogs = [session, ...logs];
    setLogs(newLogs);
    localStorage.setItem('focusflight_logbook', JSON.stringify(newLogs));
  };

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('focusflight_logbook');
  };

  return { logs, addLog, clearLogs };
}

export interface Settings {
  defaultDuration: number;
  defaultFocusType: string;
  preferredMode: 'flight' | 'train' | 'bus';
  defaultSound: string;
}

const DEFAULT_SETTINGS: Settings = {
  defaultDuration: 60,
  defaultFocusType: 'Deep Work',
  preferredMode: 'flight',
  defaultSound: 'silence'
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem('focusflight_settings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('focusflight_settings', JSON.stringify(updated));
  };

  return { settings, updateSettings };
}
