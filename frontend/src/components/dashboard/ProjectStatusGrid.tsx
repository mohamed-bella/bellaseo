'use client';

import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Clock, Layers, Zap, AlertCircle } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { motion } from 'framer-motion';

export default function ProjectStatusGrid() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const { data } = await apiClient.get('/dashboard/project-status');
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch project status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-48 bg-gray-100 rounded-[32px]" />
      ))}
    </div>
  );

  if (projects.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((p) => (
        <motion.div 
          key={p.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative p-7 rounded-[32px] border transition-all flex flex-col justify-between ${
            p.isFinished 
              ? 'bg-emerald-500/5 border-emerald-500/20' 
              : 'bg-white border-[#E5E8EB] hover:border-primary/30 shadow-sm'
          }`}
        >
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <h3 className="font-black text-[#1A1D23] text-lg tracking-tight leading-tight">{p.name}</h3>
                <div className="flex items-center gap-2">
                   <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                     p.schedule_type === 'manual' ? 'bg-gray-100 text-gray-500' : 'bg-[#FF642D]/10 text-[#FF642D]'
                   }`}>
                     {p.schedule_type}
                   </span>
                   {p.isFinished && (
                     <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                        Complete
                     </span>
                   )}
                </div>
              </div>
              {p.isFinished ? (
                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-[#FF642D]/10 rounded-2xl flex items-center justify-center text-[#FF642D] border border-[#FF642D]/20">
                  <Activity className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Published</p>
                  <p className="text-xl font-black text-[#1A1D23]">{p.publishedArticles} <span className="text-[10px] text-gray-400 font-bold lowercase">Docs</span></p>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Queue</p>
                  <p className="text-xl font-black text-[#1A1D23]">{p.pendingKeywords} <span className="text-[10px] text-gray-400 font-bold lowercase">Left</span></p>
               </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {p.activeWorkflows.length > 0 ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-[#FF642D] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#FF642D] uppercase tracking-tight">
                    {p.activeWorkflows.length} Active Nodes
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                    {p.isFinished ? 'Mission Finished' : 'Standby'}
                  </span>
                </>
              )}
            </div>
            
            <p className="text-[9px] font-black text-gray-400 italic">
              {p.cron_time || '00:00'} {p.cron_timezone?.split('/')[1] || 'UTC'}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
