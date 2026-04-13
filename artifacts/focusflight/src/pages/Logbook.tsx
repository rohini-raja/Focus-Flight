import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { BookOpen, Plane, Clock, Target, BarChart2, PieChart } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart as RechartsPie, Pie, Legend,
} from 'recharts';
import { StarField } from '@/components/StarField';
import { BoardingPassCard } from '@/components/BoardingPassCard';
import { useLogbook } from '@/hooks/use-storage';
import { SessionConfig } from '@/utils/flight-utils';

// ── colour palette keyed by focus type ───────────────────────────────────────
const FOCUS_COLORS: Record<string, string> = {
  'Deep Work': '#30D158',
  'Study':     '#0A84FF',
  'Creative':  '#FF9F0A',
  'Meeting':   '#BF5AF2',
  'Reading':   '#FF453A',
};
const BAR_COLOR = '#30D158';

// ── weekly bar-chart data (last 8 weeks) ─────────────────────────────────────
function useWeeklyData(logs: SessionConfig[]) {
  return useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = startOfWeek(subWeeks(now, 7 - i), { weekStartsOn: 1 });
      const weekEnd   = endOfWeek(weekStart, { weekStartsOn: 1 });
      const count = logs.filter(l =>
        l.completed && isWithinInterval(new Date(l.date), { start: weekStart, end: weekEnd })
      ).length;
      return { week: format(weekStart, 'MMM d'), count };
    });
  }, [logs]);
}

// ── focus-type donut data ─────────────────────────────────────────────────────
function useFocusTypeData(logs: SessionConfig[]) {
  return useMemo(() => {
    const completed = logs.filter(l => l.completed);
    const counts: Record<string, number> = {};
    completed.forEach(l => { counts[l.focusType] = (counts[l.focusType] ?? 0) + 1; });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: FOCUS_COLORS[name] ?? '#888' }))
      .sort((a, b) => b.value - a.value);
  }, [logs]);
}

// ── custom tooltip for bar chart ──────────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-3 py-2 rounded-xl text-sm border border-white/10">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-white font-bold">{payload[0].value} session{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function Logbook() {
  const { logs } = useLogbook();
  const [filter, setFilter] = useState<string>('All');

  const weeklyData   = useWeeklyData(logs);
  const focusData    = useFocusTypeData(logs);

  const stats = {
    flights:   logs.length,
    hours:     Math.round(logs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0) / 60 * 10) / 10,
    miles:     logs.reduce((acc, l) => acc + (l.distance || 0), 0),
    completed: logs.filter(l => l.completed).length,
  };

  const filters      = ['All', 'Deep Work', 'Study', 'Creative', 'Meeting', 'Reading'];
  const filteredLogs = filter === 'All' ? logs : logs.filter(l => l.focusType === filter);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pt-8 pb-nav-safe md:pb-24 px-4 flex flex-col items-center">
      <StarField />

      <main className="w-full max-w-5xl space-y-10 relative z-10">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" /> Pilot's Logbook
          </h1>
          <p className="text-muted-foreground">Your flight history and focus analytics.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Plane}    label="Total Sessions"  value={stats.flights.toString()} />
          <StatCard icon={Clock}    label="Hours Focused"   value={`${stats.hours}h`}        color="text-secondary" />
          <StatCard icon={BarChart2} label="Miles Flown"    value={stats.miles.toLocaleString()} color="text-green-400" />
          <StatCard icon={Target}   label="Completion Rate" value={stats.flights ? `${Math.round((stats.completed / stats.flights) * 100)}%` : '0%'} color="text-purple-400" />
        </div>

        {/* ── Analytics Charts ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Weekly sessions bar chart */}
          <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              <h2 className="text-white font-bold">Sessions per Week</h2>
            </div>
            {logs.length === 0 ? (
              <EmptyChartPlaceholder />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData} barCategoryGap="30%">
                  <XAxis
                    dataKey="week"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                    width={24}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.count > 0 ? BAR_COLOR : 'rgba(255,255,255,0.08)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Focus-type donut chart */}
          <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-secondary" />
              <h2 className="text-white font-bold">Focus Type Breakdown</h2>
            </div>
            {focusData.length === 0 ? (
              <EmptyChartPlaceholder />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <RechartsPie>
                  <Pie
                    data={focusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {focusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} session${value !== 1 ? 's' : ''}`, name]}
                    contentStyle={{ background: '#161b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#9ca3af' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{v}</span>}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Logs List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-3">
            <h2 className="text-xl font-bold text-white">Flight History</h2>
            <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors border ${
                    filter === f
                      ? 'text-background border-primary font-bold'
                      : 'bg-transparent text-muted-foreground border-white/10 hover:border-white/30'
                  }`}
                  style={filter === f ? { backgroundColor: FOCUS_COLORS[f] ?? 'hsl(var(--primary))' } : {}}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 border-dashed">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-white font-medium">No sessions found</p>
              <p className="text-muted-foreground text-sm">Your logbook for this category is empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredLogs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
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

function EmptyChartPlaceholder() {
  return (
    <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
      Complete a session to see your analytics.
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'text-primary' }: any) {
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
  );
}
