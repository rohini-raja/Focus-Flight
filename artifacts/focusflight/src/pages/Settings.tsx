import React, { useState } from 'react';
import { Settings as SettingsIcon, Trash2, Check, Plane } from 'lucide-react';
import { StarField } from '@/components/StarField';
import { useSettings, useLogbook } from '@/hooks/use-storage';
import { FocusType, PLANE_ICONS } from '@/utils/flight-utils';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { clearLogs, logs } = useLogbook();

  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const focusTypes: FocusType[] = ['Deep Work', 'Study', 'Creative', 'Meeting', 'Reading'];

  const handleClear = () => {
    clearLogs();
    setConfirmClear(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pt-12 pb-24 px-4 flex flex-col items-center">
      <StarField />

      <main className="w-full max-w-2xl space-y-8 relative z-10">

        <div className="flex items-center gap-3 border-b border-white/10 pb-6">
          <div className="p-3 rounded-xl bg-white/10 text-white">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
            <p className="text-muted-foreground">Configure your flight preferences.</p>
          </div>
        </div>

        <div className="glass p-6 md:p-8 rounded-2xl space-y-8">

          {/* Default Duration */}
          <div className="space-y-4">
            <div>
              <label className="text-white font-bold text-lg">Default Flight Duration</label>
              <p className="text-sm text-muted-foreground">Pre-selected time for new bookings.</p>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="15" max="240" step="15"
                value={settings.defaultDuration}
                onChange={(e) => updateSettings({ defaultDuration: parseInt(e.target.value) })}
                className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="font-mono text-primary font-bold min-w-[60px] text-right">
                {Math.floor(settings.defaultDuration / 60)}h {settings.defaultDuration % 60}m
              </span>
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Default Class */}
          <div className="space-y-4">
            <div>
              <label className="text-white font-bold text-lg">Default Focus Class</label>
              <p className="text-sm text-muted-foreground">Your most common type of work.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {focusTypes.map(type => (
                <button
                  key={type}
                  onClick={() => updateSettings({ defaultFocusType: type })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    settings.defaultFocusType === type
                      ? 'bg-primary text-background'
                      : 'bg-background border border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Plane Icon Picker */}
          <div className="space-y-4">
            <div>
              <label className="text-white font-bold text-lg">Flight Icon</label>
              <p className="text-sm text-muted-foreground">Choose your vessel for every session.</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {PLANE_ICONS.map(icon => {
                const active = settings.planeIcon === icon.id;
                return (
                  <button
                    key={icon.id}
                    onClick={() => updateSettings({ planeIcon: icon.id })}
                    title={icon.desc}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '14px 8px',
                      borderRadius: 14,
                      border: active ? '1.5px solid rgba(79,195,247,0.7)' : '1.5px solid rgba(255,255,255,0.08)',
                      background: active ? 'rgba(79,195,247,0.12)' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    {active && (
                      <span style={{
                        position: 'absolute', top: 6, right: 8,
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#30D158',
                        boxShadow: '0 0 6px #30D158',
                      }} />
                    )}
                    <span style={{ fontSize: 26 }}>{icon.id}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                      color: active ? '#30D158' : 'rgba(255,255,255,0.45)',
                      textAlign: 'center',
                    }}>
                      {icon.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Map Theme */}
          <div className="space-y-4">
            <div>
              <label className="text-white font-bold text-lg">Default Map Mode</label>
              <p className="text-sm text-muted-foreground">Start flights in day or night mode. You can also toggle during a flight.</p>
            </div>
            <div className="flex gap-3">
              {(['day', 'night'] as const).map(theme => {
                const active = settings.mapTheme === theme;
                return (
                  <button
                    key={theme}
                    onClick={() => updateSettings({ mapTheme: theme })}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      padding: '14px 20px',
                      borderRadius: 14,
                      border: active ? '1.5px solid rgba(48,209,88,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                      background: active
                        ? (theme === 'night' ? 'rgba(30,10,60,0.7)' : 'rgba(48,209,88,0.1)')
                        : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{theme === 'day' ? '☀️' : '🌙'}</span>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: active ? (theme === 'night' ? '#a78bfa' : '#30D158') : 'rgba(255,255,255,0.5)',
                    }}>
                      {theme === 'day' ? 'Day Mode' : 'Night Mode'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Data Management */}
          <div className="space-y-4">
            <div>
              <label className="text-white font-bold text-lg text-destructive">Danger Zone</label>
              <p className="text-sm text-muted-foreground">Manage your local storage data.</p>
            </div>
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Clear Logbook</p>
                <p className="text-xs text-muted-foreground">{logs.length} records will be permanently deleted.</p>
              </div>
              {!confirmClear && !cleared ? (
                <button
                  onClick={() => setConfirmClear(true)}
                  disabled={logs.length === 0}
                  className="px-4 py-2 rounded-lg bg-destructive/20 text-destructive font-medium hover:bg-destructive hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Data
                </button>
              ) : confirmClear ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-3 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> Confirm
                  </button>
                </div>
              ) : (
                <div className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" /> Cleared
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="text-center pb-8">
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Plane className="w-4 h-4" /> Rohini's Focus Assistant v2.0
          </p>
          <p className="text-muted-foreground/50 text-xs mt-1">All data is stored locally on your device.</p>
        </div>

      </main>
    </div>
  );
}
