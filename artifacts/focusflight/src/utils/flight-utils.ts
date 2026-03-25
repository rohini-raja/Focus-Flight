// Shared utilities for the FocusFlight app

export type TransportMode = 'flight' | 'train' | 'bus';
export type FocusType = 'Deep Work' | 'Study' | 'Creative' | 'Meeting' | 'Reading';

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
