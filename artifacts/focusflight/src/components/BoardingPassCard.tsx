import React from 'react';
import { Plane, Clock, Calendar } from 'lucide-react';
import { SessionConfig } from '@/utils/flight-utils';
import { format } from 'date-fns';

interface BoardingPassProps {
  session: Partial<SessionConfig>;
  isInteractive?: boolean;
  onClick?: () => void;
}

export function BoardingPassCard({ session, isInteractive = false, onClick }: BoardingPassProps) {
  const Icon = session.mode === 'train' ? Plane : session.mode === 'bus' ? Plane : Plane; // TODO adapt icons
  
  return (
    <div 
      onClick={isInteractive ? onClick : undefined}
      className={`
        relative w-full max-w-md mx-auto rounded-xl overflow-hidden glass
        border border-white/10 shadow-2xl
        ${isInteractive ? 'cursor-pointer hover:-translate-y-1 hover:shadow-primary/20 hover:border-primary/50 transition-all duration-300' : ''}
      `}
    >
      {/* Top Color Bar */}
      <div className={`h-2 w-full ${session.mode === 'train' ? 'bg-orange-500' : session.mode === 'bus' ? 'bg-emerald-500' : 'bg-primary'}`} />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Passenger</p>
            <p className="font-display text-lg font-bold text-white">GUEST</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Date</p>
            <p className="font-mono text-sm text-white">
              {session.date ? format(new Date(session.date), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy')}
            </p>
          </div>
        </div>

        {/* Route Large */}
        <div className="flex items-center justify-between my-8">
          <div className="text-center w-1/3">
            <h2 className="text-4xl font-display font-bold text-white tracking-tighter">
              {session.fromCode || '???'}
            </h2>
            <p className="text-sm text-muted-foreground truncate mt-1">{session.from || 'Origin'}</p>
          </div>
          
          <div className="flex-1 flex flex-col items-center px-4 relative">
            <div className="w-full border-t-2 border-dashed border-white/20 absolute top-1/2 -translate-y-1/2" />
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center bg-card border border-white/10 z-10
              ${session.mode === 'train' ? 'text-orange-500' : session.mode === 'bus' ? 'text-emerald-500' : 'text-primary'}
            `}>
              <Icon className="w-5 h-5 transform rotate-90" />
            </div>
          </div>

          <div className="text-center w-1/3">
            <h2 className="text-4xl font-display font-bold text-white tracking-tighter">
              {session.toCode || '???'}
            </h2>
            <p className="text-sm text-muted-foreground truncate mt-1">{session.to || 'Destination'}</p>
          </div>
        </div>

        {/* Flight Details Grid */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-white/5 border border-white/5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Flight Time</p>
            <div className="flex items-center gap-1.5 text-white font-mono text-sm">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {Math.floor((session.durationMinutes || 0) / 60)}h {(session.durationMinutes || 0) % 60}m
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Class</p>
            <p className="text-white font-medium text-sm truncate">{session.focusType || 'Deep Work'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Seat</p>
            <p className="text-white font-mono text-sm font-bold">{session.id?.substring(0,3).toUpperCase() || '12A'}</p>
          </div>
        </div>
      </div>

      {/* Perforation Effect */}
      <div className="relative w-full h-8 flex items-center">
        <div className="absolute left-[-16px] w-8 h-8 rounded-full bg-background" />
        <div className="w-full border-t-2 border-dashed border-white/20 mx-4" />
        <div className="absolute right-[-16px] w-8 h-8 rounded-full bg-background" />
      </div>

      {/* Footer / Barcode area */}
      <div className="p-6 pt-2 bg-white/5 flex justify-between items-center">
        <div className="flex flex-col">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold">Remarks</p>
          <p className="text-sm text-white/80 max-w-[200px] truncate">{session.label || 'Have a great session'}</p>
        </div>
        <div className="flex gap-1 h-8 opacity-50">
          {/* Faux Barcode */}
          {[1,3,2,1,4,1,2,5,1,2,3].map((w, i) => (
            <div key={i} className="bg-white h-full rounded-sm" style={{ width: `${w * 2}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
