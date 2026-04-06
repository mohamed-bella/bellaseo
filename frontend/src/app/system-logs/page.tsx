'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, Cpu, MonitorPlay, Pause, Play, Trash2 } from 'lucide-react';
import { io } from 'socket.io-client';

interface LogEntry {
  id: string;
  source: 'frontend' | 'backend';
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | 'frontend' | 'backend'>('all');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(isPaused);

  // Keep ref updated for event listeners
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Handle auto-scroll
  useEffect(() => {
    if (!isPaused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  useEffect(() => {
    // 1. Backend Logs integration
    const socket = io('http://localhost:4000');
    
    socket.on('system:log', (data: Omit<LogEntry, 'id'>) => {
      if (isPausedRef.current) return;
      
      setLogs(prev => {
        const newLogs = [...prev, { ...data, id: Math.random().toString(36).substring(7) }];
        return newLogs.slice(-1000); // Keep last 1000
      });
    });

    socket.on('terminal:history', (history: Omit<LogEntry, 'id'>[]) => {
      setLogs(history.map(item => ({
        ...item,
        id: Math.random().toString(36).substring(7)
      })));
    });

    // 2. Frontend Logs Interceptor
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const formatArgs = (args: any[]) => {
      return args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    };

    const interceptFrontend = (level: 'info' | 'warn' | 'error', ...args: any[]) => {
      if (!isPausedRef.current) {
        setLogs(prev => {
          const newLogs = [...prev, {
            id: Math.random().toString(36).substring(7),
            source: 'frontend',
            level,
            message: formatArgs(args),
            timestamp: new Date().toISOString()
          }];
          return newLogs.slice(-500);
        });
      }
    };

    console.log = function (...args) {
      originalLog.apply(console, args);
      interceptFrontend('info', ...args);
    };

    console.warn = function (...args) {
      originalWarn.apply(console, args);
      interceptFrontend('warn', ...args);
    };

    console.error = function (...args) {
      originalError.apply(console, args);
      interceptFrontend('error', ...args);
    };

    return () => {
      socket.disconnect();
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const filteredLogs = logs.filter(log => filter === 'all' || log.source === filter);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 focus:outline-none h-[calc(100vh-8rem)] flex flex-col">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E8EB] pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight flex items-center gap-2">
            <Terminal className="w-6 h-6 text-[#1A1D23]" />
            System Console
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">Real-time aggregate stream of all Frontend and Backend activity.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-[#F3F4F6] p-1.5 rounded-lg border border-[#E5E8EB]">
          <button 
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-white text-[#1A1D23] shadow-sm' : 'text-[#6B7280] hover:text-[#1A1D23]'}`}
          >
            All Logs
          </button>
          <button 
            onClick={() => setFilter('backend')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${filter === 'backend' ? 'bg-white text-[#10B981] shadow-sm' : 'text-[#6B7280] hover:text-[#10B981]'}`}
          >
            <Cpu className="w-3.5 h-3.5" /> Backend
          </button>
          <button 
            onClick={() => setFilter('frontend')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${filter === 'frontend' ? 'bg-white text-[#3B82F6] shadow-sm' : 'text-[#6B7280] hover:text-[#3B82F6]'}`}
          >
            <MonitorPlay className="w-3.5 h-3.5" /> Frontend
          </button>
        </div>
      </div>

      {/* ── Terminal Window ── */}
      <div className="flex-1 bg-[#0A0A0A] rounded-xl border border-[#262626] shadow-xl overflow-hidden flex flex-col relative font-mono mt-2">
        
        {/* Terminal Header Bar */}
        <div className="h-10 bg-[#171717] border-b border-[#262626] flex items-center justify-between px-4 shrink-0">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#EF4444] opacity-80" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B] opacity-80" />
              <div className="w-3 h-3 rounded-full bg-[#10B981] opacity-80" />
           </div>
           
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setLogs([])}
                className="p-1.5 text-[#737373] hover:text-white transition-colors title='Clear Console'"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className={`p-1.5 flex items-center gap-1.5 text-xs font-bold transition-colors ${isPaused ? 'text-[#F59E0B] bg-[#F59E0B]/10 rounded-md' : 'text-[#737373] hover:text-white'}`}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {isPaused ? 'RESUME STREAM' : ''}
              </button>
           </div>
        </div>

        {/* Terminal Output */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1.5 text-[13px] custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="text-[#737373] italic">Waiting for system logs...</div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="flex items-start gap-3 hover:bg-[#1A1A1A] px-1 py-0.5 rounded transition-colors group">
                <span className="text-[#525252] shrink-0 w-20">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                
                <span className={`shrink-0 w-20 font-bold uppercase tracking-wider text-[10px] flex items-center justify-center rounded-sm py-0.5 ${
                  log.source === 'backend' ? 'text-[#10B981] bg-[#10B981]/10' : 'text-[#3B82F6] bg-[#3B82F6]/10'
                }`}>
                  {log.source === 'backend' ? 'SERVER' : 'CLIENT'}
                </span>

                <span className={`shrink-0 w-12 font-bold uppercase text-[10px] mt-0.5 ${
                  log.level === 'error' ? 'text-[#EF4444]' :
                  log.level === 'warn' ? 'text-[#F59E0B]' :
                  'text-[#A3A3A3]'
                }`}>
                  [{log.level}]
                </span>

                <span className={`flex-1 break-words whitespace-pre-wrap leading-relaxed ${
                  log.level === 'error' ? 'text-[#EF4444]' :
                  log.level === 'warn' ? 'text-[#F59E0B]' :
                  'text-[#D4D4D4]'
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0A0A0A; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #262626; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #404040; }
      `}</style>
    </div>
  );
}
