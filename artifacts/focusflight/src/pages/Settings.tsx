import React, { useState } from 'react';
import { Settings as SettingsIcon, Trash2, Check, RefreshCw, Plane } from 'lucide-react';
import { StarField } from '@/components/StarField';
import { useSettings, useLogbook } from '@/hooks/use-storage';
import { FocusType } from '@/utils/flight-utils';

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
             <Plane className="w-4 h-4" /> FocusFlight v1.0.0
           </p>
           <p className="text-muted-foreground/50 text-xs mt-1">All data is stored locally on your device.</p>
        </div>

      </main>
    </div>
  );
}
