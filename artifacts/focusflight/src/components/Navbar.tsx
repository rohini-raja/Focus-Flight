import React from 'react';
import { Link, useLocation } from 'wouter';
import { Plane, BookOpen, Settings, Train } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

export function Navbar() {
  const [location] = useLocation();
  const { activeSession } = useSession();

  // Don't show regular navbar during active flight to maintain immersion
  if (location === '/flight' && activeSession) {
    return null;
  }

  const navItems = [
    { path: '/book', label: 'Book', icon: Plane },
    { path: '/transit', label: 'Transit', icon: Train },
    { path: '/logbook', label: 'Logbook', icon: BookOpen },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b-0 border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-2 group outline-none">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
              <Plane className="w-5 h-5 text-primary transform -rotate-45" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">
              Rohini's Focus
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover-elevate ${
                  location === item.path 
                    ? 'bg-white/10 text-white shadow-sm' 
                    : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>

          {/* Active Session Indicator */}
          {activeSession && location !== '/flight' && (
            <Link 
              href="/flight"
              className="px-4 py-1.5 rounded-full bg-secondary/20 text-secondary border border-secondary/30 text-sm font-semibold flex items-center gap-2 hover:bg-secondary/30 transition-colors animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              Flight in progress
            </Link>
          )}
        </div>
      </div>
      
    </nav>
  );
}
