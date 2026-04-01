'use client';

import { useState, useEffect } from 'react';
import { Clock, Zap, ArrowRight, Play } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  schedule_type: string;
  cron_time?: string;
  status: string;
}

export default function NextScheduleCard({ campaigns }: { campaigns: Campaign[] }) {
  const [nextRun, setNextRun] = useState<{ time: Date; campaign: Campaign } | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const active = campaigns.filter(c => c.status === 'active' && c.schedule_type !== 'manual');
    if (active.length === 0) return;

    const calculateNext = () => {
      const now = new Date();
      let earliest: { time: Date; campaign: Campaign } | null = null;

      active.forEach(c => {
        let runTime = new Date();
        runTime.setSeconds(0, 0);

        if (c.schedule_type === 'hourly') {
          runTime.setHours(now.getHours() + 1, 0);
        } else if (c.schedule_type === 'daily') {
          runTime.setHours(24, 0); // Next Midnight
        } else if (c.schedule_type === 'weekly') {
          const day = now.getDay();
          const dist = 7 - day;
          runTime.setDate(now.getDate() + (dist === 0 ? 7 : dist));
          runTime.setHours(0, 0);
        }

        if (!earliest || runTime < earliest.time) {
          earliest = { time: runTime, campaign: c };
        }
      });

      setNextRun(earliest);
    };

    calculateNext();
    const timer = setInterval(calculateNext, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [campaigns]);

  useEffect(() => {
    if (!nextRun) return;

    const updateTimer = () => {
      const diff = nextRun.time.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Starting now...');
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      const parts = [];
      if (h > 0) parts.push(`${h}h`);
      if (m > 0 || h > 0) parts.push(`${m}m`);
      parts.push(`${s}s`);
      
      setTimeLeft(parts.join(' '));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextRun]);

  if (!nextRun) return null;

  return (
    <div className="card-premium grainy bg-gradient-to-br from-primary/10 via-transparent to-transparent border-primary/20 overflow-hidden relative group">
       {/* Abstract BG Decor */}
       <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/20 rounded-full blur-[60px] pointer-events-none" />
       
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
             <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                <Zap className="w-6 h-6 text-white" />
             </div>
             <div>
                <h3 className="text-xl font-black text-foreground tracking-tight">
                  Next Campaign Run
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Scheduler posting will start at <span className="text-foreground font-bold">{nextRun.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> for <span className="text-primary font-black">{nextRun.campaign.name}</span>.
                </p>
             </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="text-right">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1 opacity-60">Starts In</p>
                <div className="flex items-center gap-2">
                   <Clock className="w-4 h-4 text-primary animate-pulse" />
                   <span className="text-2xl font-black text-foreground font-mono tabular-nums">{timeLeft}</span>
                </div>
             </div>
             
             <div className="h-10 w-px bg-border hidden md:block" />

             <button className="h-12 px-6 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95">
               Details <ArrowRight className="w-4 h-4" />
             </button>
          </div>
       </div>
    </div>
  );
}
