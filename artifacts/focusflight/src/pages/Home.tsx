import React from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { StarField } from '@/components/StarField';
import { Plane, Compass, BarChart3, ArrowRight } from 'lucide-react';
import { useLogbook } from '@/hooks/use-storage';

export default function Home() {
  const { logs } = useLogbook();
  
  const stats = {
    flights: logs.length,
    miles: logs.reduce((acc, log) => acc + (log.distance || 0), 0)
  };

  const dummyFlights = [
    "BOM → LHR · 9h 30m · Deep Work",
    "DEL → NRT · 7h 15m · Study",
    "MAA → JFK · 18h 45m · Creative",
    "BLR → SYD · 12h 20m · Deep Work",
    "CCU → CDG · 9h 50m · Reading"
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center pt-10 pb-20 px-4">
      <StarField />
      
      {/* Background Graphic Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center space-y-12">
        
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white mb-4">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Clear skies ahead for deep focus
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold text-white leading-tight">
            Your focus, <br className="hidden md:block"/>
            <span className="text-gradient-primary">cleared for takeoff.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Turn your work sessions into immersive virtual flights. 
            Set your destination, stay on course, and track your productivity journey across the globe.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link 
              href="/book"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-primary text-primary-foreground shadow-[0_0_40px_-10px_rgba(79,195,247,0.5)] hover:shadow-[0_0_60px_-10px_rgba(79,195,247,0.7)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Plane className="w-5 h-5" />
              Book a Flight
            </Link>
            <Link 
              href="/logbook"
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
            >
              View Logbook
            </Link>
          </div>
        </motion.div>

        {/* Marquee */}
        <div className="w-full max-w-4xl overflow-hidden py-4 border-y border-white/5 relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a0e1a] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a0e1a] to-transparent z-10" />
          
          <div className="flex whitespace-nowrap animate-marquee">
            {[...dummyFlights, ...dummyFlights].map((flight, i) => (
              <span key={i} className="mx-6 text-sm font-mono text-muted-foreground/60 flex items-center gap-2">
                <Plane className="w-3 h-3 text-primary/50" />
                {flight}
              </span>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
        >
          <div className="glass p-8 rounded-2xl text-left hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Custom Routes</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Set your departure, destination, and focus duration. Every work session becomes a unique journey across the world.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl text-left hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-6">
              <Plane className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Live Tracking</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Watch your progress on a real-time animated flight path. Immersive ambient sounds keep you in the zone.
            </p>
          </div>

          <div className="glass p-8 rounded-2xl text-left hover:-translate-y-2 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Focus Logbook</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Track your miles flown and hours focused. Build streaks and view your productivity history in a pilot's log.
            </p>
          </div>
        </motion.div>

        {/* Mini Stats if they have data */}
        {stats.flights > 0 && (
          <div className="mt-8 px-6 py-4 rounded-full border border-white/10 bg-white/5 flex gap-8 items-center text-sm">
            <div>
              <span className="text-muted-foreground mr-2">Flights completed:</span>
              <span className="font-bold text-white">{stats.flights}</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div>
              <span className="text-muted-foreground mr-2">Miles flown:</span>
              <span className="font-bold text-primary">{stats.miles.toLocaleString()} mi</span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
