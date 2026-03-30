// Shared utilities for the FocusFlight app

export type TransportMode = 'flight' | 'train' | 'bus' | 'railfocus';
export type FocusType = 'Deep Work' | 'Study' | 'Creative' | 'Meeting' | 'Reading';

export const PLANE_ICONS = [
  { id: '✈️',  label: 'Airliner',   desc: 'Classic jet' },
  { id: '🛩️',  label: 'Propeller',  desc: 'Light aircraft' },
  { id: '🚀',  label: 'Rocket',     desc: 'To the moon' },
  { id: '🛸',  label: 'UFO',        desc: 'Unidentified' },
  { id: '🚁',  label: 'Chopper',    desc: 'Helicopter' },
  { id: '🦅',  label: 'Eagle',      desc: 'Soaring free' },
  { id: '☄️',  label: 'Comet',      desc: 'Blazing trail' },
  { id: '🛰️',  label: 'Satellite',  desc: 'Orbital view' },
  { id: '🐉',  label: 'Dragon',     desc: 'Mythic flight' },
  { id: '🎈',  label: 'Balloon',    desc: 'Gentle drift' },
  { id: '🦋',  label: 'Butterfly',  desc: 'Flutter by' },
  { id: '🌟',  label: 'Star',       desc: 'Shooting star' },
] as const;

export type PlaneIconId = typeof PLANE_ICONS[number]['id'];

export interface SessionConfig {
  id: string;
  mode: TransportMode;
  from: string;
  to: string;
  fromCode: string;
  toCode: string;
  durationMinutes: number;
  focusType: FocusType;
  label: string;
  date: string;
  distance: number;
  completed: boolean;
}

// Haversine distance calculator
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

const KNOWN_CITIES: Record<string, [number, number]> = {
  mumbai: [19.0760, 72.8777],
  london: [51.5074, -0.1278],
  delhi: [28.6139, 77.2090],
  tokyo: [35.6762, 139.6503],
  chennai: [13.0827, 80.2707],
  newyork: [40.7128, -74.0060],
  bangalore: [12.9716, 77.5946],
  sydney: [-33.8688, 151.2093],
  kolkata: [22.5726, 88.3639],
  paris: [48.8566, 2.3522],
  sf: [37.7749, -122.4194],
  dubai: [25.2048, 55.2708],
  singapore: [1.3521, 103.8198]
};

export function getDistanceForCities(city1: string, city2: string): number {
  const c1 = KNOWN_CITIES[city1.toLowerCase().replace(/\s/g, '')];
  const c2 = KNOWN_CITIES[city2.toLowerCase().replace(/\s/g, '')];
  
  if (c1 && c2) {
    return calculateDistance(c1[0], c1[1], c2[0], c2[1]);
  }
  // Fallback to random plausible distance based on string hash if not known
  const hash = (city1 + city2).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return 500 + (hash % 8000); 
}

export function generateIata(city: string): string {
  if (!city || city.length < 3) return "UNK";
  const cleaned = city.toUpperCase().replace(/[^A-Z]/g, '');
  const consonants = cleaned.replace(/[AEIOU]/g, '');
  
  if (consonants.length >= 3) {
    return consonants.substring(0, 3);
  }
  return cleaned.substring(0, 3);
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function generateSeat(): string {
  const rows = Math.floor(Math.random() * 40) + 1;
  const seats = ['A', 'B', 'C', 'D', 'E', 'F', 'J', 'K'];
  const seat = seats[Math.floor(Math.random() * seats.length)];
  return `${rows}${seat}`;
}

export function generateGate(): string {
  const terminals = ['A', 'B', 'C', 'D', 'T1', 'T2'];
  const t = terminals[Math.floor(Math.random() * terminals.length)];
  const n = Math.floor(Math.random() * 50) + 1;
  return `${t}-${n}`;
}

/* ─── Streak helpers ────────────────────────────────────────────────────── */

function _streakFor(logs: SessionConfig[], modePredicate?: (m: TransportMode) => boolean): number {
  const relevant = logs.filter(l => l.completed && (!modePredicate || modePredicate(l.mode)));
  const dateSet = new Set(relevant.map(l => {
    const d = new Date(l.date);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }));

  let streak = 0;
  const today = new Date();

  // If today has no session, check if yesterday does (streak still running)
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  const startOffset = dateSet.has(todayKey) ? 0 : dateSet.has(yesterdayKey) ? 1 : -1;
  if (startOffset === -1) return 0;

  for (let d = startOffset; d < 365; d++) {
    const check = new Date(today);
    check.setDate(today.getDate() - d);
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (dateSet.has(key)) { streak++; } else { break; }
  }
  return streak;
}

export function computeStreak(logs: SessionConfig[]): number {
  return _streakFor(logs);
}

export function computeRailStreak(logs: SessionConfig[]): number {
  return _streakFor(logs, m => m === 'railfocus');
}

/* ─── Aggregate stats ───────────────────────────────────────────────────── */

export interface AppStats {
  streak: number;
  totalSessions: number;
  flightCount: number;
  railCount: number;
  transitCount: number;
  totalDistKm: number;
  totalHours: number;
}

export function computeStats(logs: SessionConfig[]): AppStats {
  const completed = logs.filter(l => l.completed);
  const flightSessions = completed.filter(l => l.mode === 'flight');
  const railSessions = completed.filter(l => l.mode === 'railfocus');
  const transitSessions = completed.filter(l => l.mode === 'train' || l.mode === 'bus');

  // Flight distances come from calculateDistance (miles) — convert to km
  const flightDistKm = Math.round(flightSessions.reduce((a, l) => a + (l.distance || 0), 0) * 1.609);
  // Rail and transit distances are stored in km
  const railDistKm = Math.round(railSessions.reduce((a, l) => a + (l.distance || 0), 0));
  const transitDistKm = Math.round(transitSessions.reduce((a, l) => a + (l.distance || 0), 0));

  return {
    streak: computeStreak(logs),
    totalSessions: completed.length,
    flightCount: flightSessions.length,
    railCount: railSessions.length,
    transitCount: transitSessions.length,
    totalDistKm: flightDistKm + railDistKm + transitDistKm,
    totalHours: Math.round(completed.reduce((a, l) => a + l.durationMinutes, 0) / 60 * 10) / 10,
  };
}

/* ─── Achievements ──────────────────────────────────────────────────────── */

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  description: string;
  check: (logs: SessionConfig[]) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  /* ── Flight ── */
  {
    id: 'first_flight',
    icon: '✈️',
    name: 'First Flight',
    description: 'Complete your first FocusFlight session',
    check: logs => logs.some(l => l.mode === 'flight' && l.completed),
  },
  {
    id: 'globe_trotter',
    icon: '🌏',
    name: 'Globe Trotter',
    description: 'Complete 5 sessions of any kind',
    check: logs => logs.filter(l => l.completed).length >= 5,
  },
  {
    id: 'on_fire',
    icon: '🔥',
    name: 'On Fire',
    description: 'Maintain a 3-day focus streak',
    check: logs => computeStreak(logs) >= 3,
  },
  {
    id: 'deep_dive',
    icon: '🧠',
    name: 'Deep Dive',
    description: 'Complete a session of 2 hours or more',
    check: logs => logs.some(l => l.completed && l.durationMinutes >= 120),
  },
  {
    id: 'centurion',
    icon: '💯',
    name: 'Centurion',
    description: 'Accumulate 10 total hours of focus time',
    check: logs => logs.filter(l => l.completed).reduce((a, l) => a + l.durationMinutes, 0) >= 600,
  },
  /* ── RailFocus ── */
  {
    id: 'first_departure',
    icon: '🚂',
    name: 'First Departure',
    description: 'Complete your first RailFocus session',
    check: logs => logs.some(l => l.mode === 'railfocus' && l.completed),
  },
  {
    id: 'on_track',
    icon: '🛤️',
    name: 'On Track',
    description: '3-day streak using only RailFocus',
    check: logs => computeRailStreak(logs) >= 3,
  },
  {
    id: 'trans_siberian',
    icon: '🌍',
    name: 'Trans-Siberian',
    description: 'Complete a single RailFocus session over 90 minutes',
    check: logs => logs.some(l => l.mode === 'railfocus' && l.completed && l.durationMinutes >= 90),
  },
  {
    id: 'bullet_train',
    icon: '🚄',
    name: 'Bullet Train',
    description: 'Complete a RailFocus session in under 25 minutes',
    check: logs => logs.some(l => l.mode === 'railfocus' && l.completed && l.durationMinutes < 25),
  },
];
