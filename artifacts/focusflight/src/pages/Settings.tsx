import React, { useState } from 'react';
import { Settings as SettingsIcon, Trash2, Check, Plane } from 'lucide-react';
import { StarField } from '@/components/StarField';
import { useSettings, useLogbook } from '@/hooks/use-storage';
import { FocusType, PLANE_ICONS, computeStats, ACHIEVEMENTS } from '@/utils/flight-utils';

const GREEN = '#30D158';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { clearLogs, logs } = useLogbook();

  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const focusTypes: FocusType[] = ['Deep Work', 'Study', 'Creative', 'Meeting', 'Reading'];
  const stats = computeStats(logs);
  const earned = ACHIEVEMENTS.filter(a => a.check(logs));
  const earnedIds = new Set(earned.map(a => a.id));

  const handleClear = () => {
    clearLogs();
    setConfirmClear(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pt-12 pb-nav-safe md:pb-24 px-4 flex flex-col items-center">
      <StarField />

      <main className="w-full max-w-2xl space-y-8 relative z-10">

        <div className="flex items-center gap-3 border-b border-white/10 pb-6">
          <div className="p-3 rounded-xl bg-white/10 text-white">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Settings</h1>
            <p className="text-muted-foreground">Configure your journey preferences.</p>
          </div>
        </div>

        {/* ── Journey Stats ── */}
        <div className="glass p-6 md:p-8 rounded-2xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📊 Journey Stats
          </h2>

          {stats.totalSessions === 0 ? (
            <p className="text-muted-foreground text-sm">Complete your first session to see your stats here.</p>
          ) : (
            <>
              {/* Streak */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: 14,
                background: stats.streak > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                border: stats.streak > 0 ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                    Current Streak
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: stats.streak > 0 ? '#f59e0b' : 'white' }}>
                    {stats.streak > 0 ? `🔥 ${stats.streak} day${stats.streak !== 1 ? 's' : ''}` : '—'}
                  </div>
                </div>
                <div style={{ fontSize: 40 }}>{stats.streak >= 7 ? '🌟' : stats.streak >= 3 ? '⚡' : '🔥'}</div>
              </div>

              {/* Mode breakdown */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'By Air', value: stats.flightCount, icon: '✈️', color: '#60a5fa' },
                  { label: 'By Rail', value: stats.railCount, icon: '🚂', color: GREEN },
                  { label: 'Ground', value: stats.transitCount, icon: '🚆', color: '#a78bfa' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Distance + hours */}
              <div className="grid grid-cols-2 gap-3">
                <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>Total Distance</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: GREEN }}>{stats.totalDistKm.toLocaleString()} km</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>air + rail combined</div>
                </div>
                <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>Hours Focused</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>{stats.totalHours}h</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>{stats.totalSessions} sessions total</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Achievements ── */}
        <div className="glass p-6 md:p-8 rounded-2xl space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              🏅 Achievements
            </h2>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              {earned.length} / {ACHIEVEMENTS.length}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: GREEN, width: `${Math.round((earned.length / ACHIEVEMENTS.length) * 100)}%`, transition: 'width 0.6s ease' }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map(achievement => {
              const isEarned = earnedIds.has(achievement.id);
              const isRail = ['first_departure', 'on_track', 'trans_siberian', 'bullet_train'].includes(achievement.id);
              return (
                <div
                  key={achievement.id}
                  style={{
                    padding: '16px 14px',
                    borderRadius: 14,
                    border: isEarned
                      ? `1px solid ${isRail ? 'rgba(48,209,88,0.4)' : 'rgba(96,165,250,0.4)'}`
                      : '1px solid rgba(255,255,255,0.07)',
                    background: isEarned
                      ? (isRail ? 'rgba(48,209,88,0.08)' : 'rgba(96,165,250,0.08)')
                      : 'rgba(255,255,255,0.03)',
                    opacity: isEarned ? 1 : 0.5,
                    textAlign: 'center',
                    position: 'relative',
                    transition: 'all 0.2s',
                  }}
                >
                  {isEarned && (
                    <div style={{
                      position: 'absolute',
                      top: 8, right: 8,
                      width: 8, height: 8,
                      borderRadius: '50%',
                      background: isRail ? GREEN : '#60a5fa',
                      boxShadow: `0 0 6px ${isRail ? GREEN : '#60a5fa'}`,
                    }} />
                  )}
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{achievement.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isEarned ? 'white' : 'rgba(255,255,255,0.5)', marginBottom: 4, lineHeight: 1.3 }}>
                    {achievement.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                    {achievement.description}
                  </div>
                  {!isEarned && (
                    <div style={{ fontSize: 16, marginTop: 8, opacity: 0.4 }}>🔒</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Preferences ── */}
        <div className="glass p-6 md:p-8 rounded-2xl space-y-8">

          {/* Default Duration */}
          <div className="space-y-4">
            <div>
              <label className="text-white font-bold text-lg">Default Session Duration</label>
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

          {/* Default Focus Class */}
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
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 6, padding: '14px 8px', borderRadius: 14,
                      border: active ? `1.5px solid rgba(48,209,88,0.7)` : '1.5px solid rgba(255,255,255,0.08)',
                      background: active ? 'rgba(48,209,88,0.12)' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
                    }}
                  >
                    {active && (
                      <span style={{ position: 'absolute', top: 6, right: 8, width: 8, height: 8, borderRadius: '50%', background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
                    )}
                    <span style={{ fontSize: 26 }}>{icon.id}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: active ? GREEN : 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
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
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 10, padding: '14px 20px', borderRadius: 14,
                      border: active ? `1.5px solid rgba(48,209,88,0.6)` : '1.5px solid rgba(255,255,255,0.08)',
                      background: active ? (theme === 'night' ? 'rgba(30,10,60,0.7)' : 'rgba(48,209,88,0.1)') : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer', transition: 'all 0.18s',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{theme === 'day' ? '☀️' : '🌙'}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: active ? (theme === 'night' ? '#a78bfa' : GREEN) : 'rgba(255,255,255,0.5)' }}>
                      {theme === 'day' ? 'Day Mode' : 'Night Mode'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-white/10" />

          {/* Danger Zone */}
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
                  <button onClick={() => setConfirmClear(false)} className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20">Cancel</button>
                  <button onClick={handleClear} className="px-3 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 flex items-center gap-1">
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
