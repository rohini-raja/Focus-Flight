import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionConfig, formatTime } from '@/utils/flight-utils';

interface ArrivalBoardProps {
  session: SessionConfig;
  onExit: () => void;
  onBookAnother: () => void;
}

function SplitFlapText({ text }: { text: string }) {
  return (
    <div className="flex gap-2 justify-center">
      {text.split('').map((char, i) => (
        <SplitFlapChar key={i} targetChar={char} delay={i * 0.1} />
      ))}
    </div>
  );
}

function SplitFlapChar({ targetChar, delay }: { targetChar: string; delay: number }) {
  const [char, setChar] = useState(' ');
  
  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
    let cycles = 0;
    const maxCycles = 20;
    
    setTimeout(() => {
      const interval = setInterval(() => {
        if (cycles >= maxCycles) {
          setChar(targetChar);
          clearInterval(interval);
        } else {
          setChar(chars[Math.floor(Math.random() * chars.length)]);
          cycles++;
        }
      }, 50);
      return () => clearInterval(interval);
    }, delay * 1000);
  }, [targetChar, delay]);

  return (
    <div className="w-16 h-24 bg-zinc-900 border border-zinc-700 rounded-md flex items-center justify-center relative shadow-xl overflow-hidden">
      <div className="absolute inset-x-0 top-1/2 h-px bg-black/50 z-10" />
      <span className="text-5xl font-mono font-bold text-amber-500 z-0">{char}</span>
    </div>
  );
}

export function ArrivalBoard({ session, onExit, onBookAnother }: ArrivalBoardProps) {
  const [phase, setPhase] = useState<'landing' | 'board'>('landing');

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('board');
    }, 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-y-auto">
      <AnimatePresence mode="wait">
        {phase === 'landing' ? (
          <motion.div 
            key="landing"
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            {/* Runway Lights Background */}
            <div className="absolute inset-0 overflow-hidden perspective-1000 flex justify-center items-end opacity-40">
              <div className="w-full h-[200%] rotate-x-60 flex justify-center gap-32 transform-gpu">
                <div className="w-2 h-full flex flex-col justify-between items-center py-20">
                  {[...Array(20)].map((_, i) => <div key={`l-${i}`} className="w-4 h-16 bg-amber-500 rounded-full blur-sm" />)}
                </div>
                <div className="w-2 h-full flex flex-col justify-between items-center py-20">
                  {[...Array(20)].map((_, i) => <div key={`r-${i}`} className="w-4 h-16 bg-amber-500 rounded-full blur-sm" />)}
                </div>
              </div>
            </div>

            <div className="relative z-10 text-center">
              <SplitFlapText text="LANDED" />
              <motion.p 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 2 }}
                className="mt-8 text-xl font-mono text-amber-500/80 tracking-widest"
              >
                Welcome to {session.to}
              </motion.p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="board"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto flex flex-col"
          >
            <header className="mb-12 border-b-4 border-zinc-800 pb-6 flex items-end justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-mono font-bold text-amber-500 mb-2">ARRIVALS</h1>
                <p className="text-zinc-400 font-mono text-lg">{session.to.toUpperCase()} INTERNATIONAL</p>
              </div>
              <div className="text-right font-mono text-zinc-500 hidden md:block">
                <p>LOCAL TIME</p>
                <p className="text-2xl text-zinc-300">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </header>

            {/* FIDS Table */}
            <div className="w-full overflow-x-auto mb-12">
              <table className="w-full text-left font-mono whitespace-nowrap">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="py-4 px-4">FLIGHT</th>
                    <th className="py-4 px-4">FROM</th>
                    <th className="py-4 px-4">STATUS</th>
                    <th className="py-4 px-4">GATE</th>
                    <th className="py-4 px-4">DURATION</th>
                  </tr>
                </thead>
                <tbody className="text-lg md:text-2xl">
                  {/* Dummy Row */}
                  <tr className="border-b border-zinc-800/50 text-zinc-600">
                    <td className="py-4 px-4">QF442</td>
                    <td className="py-4 px-4">SYDNEY</td>
                    <td className="py-4 px-4">LANDED</td>
                    <td className="py-4 px-4">A4</td>
                    <td className="py-4 px-4">1h 20m</td>
                  </tr>
                  {/* Active Session Row */}
                  <tr className="border-b border-zinc-700 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                    <td className="py-4 px-4 font-bold">FF001</td>
                    <td className="py-4 px-4 font-bold">{session.from.toUpperCase()}</td>
                    <td className="py-4 px-4 text-green-400 animate-pulse flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-400" /> ARRIVED
                    </td>
                    <td className="py-4 px-4 font-bold">B7</td>
                    <td className="py-4 px-4 font-bold">{formatTime(session.durationMinutes * 60)}</td>
                  </tr>
                  {/* Dummy Row */}
                  <tr className="border-b border-zinc-800/50 text-zinc-600">
                    <td className="py-4 px-4">BA909</td>
                    <td className="py-4 px-4">LONDON</td>
                    <td className="py-4 px-4">DELAYED</td>
                    <td className="py-4 px-4">C12</td>
                    <td className="py-4 px-4">8h 45m</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <StatCard label="Time in Air" value={formatTime(session.durationMinutes * 60)} icon="🕐" />
              <StatCard label="Distance" value={`${session.distance} km`} icon="📍" />
              <StatCard label="Focus Type" value={session.focusType} icon="🎯" />
              <StatCard label="Task" value={session.label} icon="📋" />
            </div>

            <div className="mt-auto flex flex-col sm:flex-row justify-end gap-4">
              <button 
                onClick={onExit}
                className="px-8 py-4 rounded-xl border-2 border-zinc-700 text-zinc-300 font-bold hover:bg-zinc-800 transition-colors"
              >
                Claim Baggage (View Logbook)
              </button>
              <button 
                onClick={onBookAnother}
                className="px-8 py-4 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors"
              >
                Book Another Flight →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between boarding-pass-cutout">
      <div className="text-zinc-500 font-mono text-sm uppercase mb-2 flex items-center gap-2">
        {icon} {label}
      </div>
      <div className="text-xl font-bold text-white truncate" title={value}>{value}</div>
    </div>
  );
}
