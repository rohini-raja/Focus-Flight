import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { BookOpen, Map, Plane, Train, Bus, Trophy, Clock, Target } from 'lucide-react';
import { StarField } from '@/components/StarField';
import { BoardingPassCard } from '@/components/BoardingPassCard';
import { useLogbook } from '@/hooks/use-storage';
import { SessionConfig } from '@/utils/flight-utils';

export default function Logbook() {
  const { logs } = useLogbook();
  const [filter, setFilter] = useState<string>('All');

  const stats = {
    flights: logs.length,
    hours: Math.round(logs.reduce((acc, log) => acc + (log.durationMinutes || 0), 0) / 60 * 10) / 10,
    miles: logs.reduce((acc, log) => acc + (log.distance || 0), 0),
    completed: logs.filter(l => l.completed).length
  };

  const filters = ['All', 'Deep Work', 'Study', 'Creative'];
  
  const filteredLogs = filter === 'All' 
    ? logs 
    : logs.filter(l => l.focusType === filter);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pt-8 pb-24 px-4 flex flex-col items-center">
      <StarField />

      <main className="w-full max-w-5xl space-y-10 relative z-10">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" /> Pilot's Logbook
            </h1>
            <p className="text-muted-foreground">Your flight history and focus analytics.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Plane} label="Total Sessions" value={stats.flights.toString()} />
          <StatCard icon={Clock} label="Hours Focused" value={`${stats.hours}h`} color="text-secondary" />
          <StatCard icon={Map} label="Miles Flown" value={stats.miles.toLocaleString()} color="text-green-400" />
          <StatCard icon={Target} label="Completion Rate" value={stats.flights ? `${Math.round((stats.completed/stats.flights)*100)}%` : '0%'} color="text-purple-400" />
        </div>

        {/* Abstract Route Map (Stylized) */}
        <div className="w-full h-48 md:h-64 glass rounded-3xl overflow-hidden relative border border-white/5 flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
          {/* Faux map glowing lines based on logs */}
          <svg className="w-full h-full absolute inset-0 opacity-40">
            {logs.slice(0, 10).map((log, i) => {
              const x1 = 10 + (Math.random() * 80);
              const y1 = 20 + (Math.random() * 60);
              const x2 = 10 + (Math.random() * 80);
              const y2 = 20 + (Math.random() * 60);
              return (
                <path 
                  key={i}
                  d={`M ${x1}% ${y1}% Q 50% 10% ${x2}% ${y2}%`}
                  fill="none" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth="1" 
                  strokeDasharray="4 4"
                />
              )
            })}
          </svg>
          <div className="z-10 text-center space-y-2">
            <Trophy className="w-10 h-10 text-secondary mx-auto mb-2" />
            <p className="text-white font-bold font-display text-xl">Global Focus Network</p>
            <p className="text-sm text-muted-foreground">{logs.length > 0 ? "Your routes span the globe." : "Start a session to chart your first route."}</p>
          </div>
        </div>

        {/* Logs List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Flight History</h2>
            <div className="flex gap-2">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors border ${
                    filter === f 
                      ? 'bg-primary text-background border-primary font-bold' 
                      : 'bg-transparent text-muted-foreground border-white/10 hover:border-white/30'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 border-dashed">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-white font-medium">No flights found</p>
              <p className="text-muted-foreground text-sm">Your logbook for this category is empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
              {filteredLogs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <BoardingPassCard session={log} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = "text-primary" }: any) {
  return (
    <div className="glass p-5 rounded-2xl border border-white/5 text-center sm:text-left flex flex-col sm:flex-row items-center gap-4 hover:bg-white/5 transition-colors">
      <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-white">{value}</p>
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      </div>
    </div>
  )
}
