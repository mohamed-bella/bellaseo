'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FolderKanban,
  Tags,
  FileText,
  Globe,
  Clock,
  Activity,
  Plus,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { getSocket } from '@/services/websocketClient';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { motion } from 'framer-motion';

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending: 'Queued',
  generating: 'Generating Content',
  reviewing: 'In Review',
  approved: 'Approved',
  publishing: 'Live Syncing',
  published: 'Finalized',
  failed: 'Error',
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeSites: 0,
    totalCampaigns: 0,
    totalKeywords: 0,
    publishedArticles: 0,
  });

  const [activeWorkflows, setActiveWorkflows] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [whatsappStatus, setWhatsappStatus] = useState<any>({ connected: false });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [c, k, a, w, logs, wa, s] = await Promise.all([
        apiClient.get('/campaigns'),
        apiClient.get('/keywords'),
        apiClient.get('/articles'),
        apiClient.get('/workflows?status=generating,publishing'),
        apiClient.get('/logs?limit=12'),
        apiClient.get('/notifications/whatsapp/status'),
        apiClient.get('/sites'),
      ]);

      setStats({
        activeSites: s.data.length,
        totalCampaigns: c.data.length,
        totalKeywords: k.data.length,
        publishedArticles: a.data.filter((art: any) => art.status === 'published').length,
      });
      setActiveWorkflows(w.data);
      setRecentLogs(logs.data);
      setWhatsappStatus(wa.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const socket = getSocket();
    socket.on('workflow:statusChanged', fetchDashboardData);
    socket.on('article:statusChanged', fetchDashboardData);
    socket.on('whatsapp:status', (status) => setWhatsappStatus(status));
    return () => {
      socket.off('workflow:statusChanged');
      socket.off('article:statusChanged');
      socket.off('whatsapp:status');
    };
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 bg-[#FF642D]/20 animate-ping rounded-full" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-2 bg-[#1A1D23] rounded-full flex items-center justify-center z-10 shadow-xl border border-gray-800">
             <Zap className="w-8 h-8 text-[#FF642D] animate-pulse" />
          </div>
          <div className="absolute inset-0 border-[3px] border-[#FF642D] border-t-transparent rounded-full animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black tracking-tight text-[#1A1D23] uppercase">Synchronizing Nodes</h2>
          <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.2em] animate-pulse">Establishing Secure Uplink...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto py-8 px-4 space-y-12">
      
      {/* ── Minimal Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-[#E5E8EB]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
             <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#9CA3AF]">System Live</span>
          </div>
          <h1 className="text-4xl font-black text-[#1A1D23] tracking-tighter">Command Center</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest">WhatsApp Engine</p>
            <p className={`text-xs font-bold ${whatsappStatus.connected ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {whatsappStatus.connected ? 'Operational' : 'Disconnected'}
            </p>
          </div>
          <Link href="/campaigns">
            <Button className="px-8 py-6 rounded-2xl bg-[#1A1D23] font-bold text-sm tracking-wide hover:bg-[#FF642D] transition-all group">
               Deploy New Project
               <Zap className="w-4 h-4 ml-2 text-[#FF642D] group-hover:text-white transition-colors" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── High Impact Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 pt-4">
        {[
          { label: 'Network Reach', value: stats.activeSites, icon: Globe, unit: 'Sites' },
          { label: 'Active Pipeline', value: stats.totalCampaigns, icon: FolderKanban, unit: 'Projects' },
          { label: 'Keyword Velocity', value: stats.totalKeywords, icon: Tags, unit: 'Seeds' },
          { label: 'Content Factory', value: stats.publishedArticles, icon: FileText, unit: 'Published' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col group cursor-default"
          >
            <div className="flex items-center gap-2 mb-2">
               <stat.icon className="w-4 h-4 text-[#FF642D]" />
               <p className="text-[11px] font-black text-[#9CA3AF] uppercase tracking-widest">{stat.label}</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-[#1A1D23] tracking-tighter group-hover:text-[#FF642D] transition-colors">
                {stat.value}
              </span>
              <span className="text-xs font-bold text-[#D1D5DB] lowercase">{stat.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Action Hub (Semrush Style CTAs) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
        {[
          {
            title: 'Keyword Intel',
            description: 'Discover high-volume, low-competition keywords to fuel your content pipeline.',
            icon: Search,
            href: '/keywords',
            badgeBg: 'bg-blue-50',
            badgeText: 'text-blue-600',
            btnText: 'Analyze Keywords',
          },
          {
            title: 'Content Factory',
            description: 'Launch AI-driven articles perfectly localized to your target language and location.',
            icon: Zap,
            href: '/campaigns',
            badgeBg: 'bg-[#FFF5F0]',
            badgeText: 'text-[#FF642D]',
            btnText: 'Start Generation',
          },
          {
            title: 'Site Integrations',
            description: 'Connect WordPress, Blogger, and custom CMS destinations for auto-publishing.',
            icon: Globe,
            href: '/sites',
            badgeBg: 'bg-emerald-50',
            badgeText: 'text-emerald-600',
            btnText: 'Manage Integrations',
          }
        ].map((cta, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + (i * 0.1) }}
            className="flex flex-col bg-white border border-[#E5E8EB] rounded-[20px] p-7 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] hover:border-[#D1D5DB] transition-all group"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:-translate-y-1 ${cta.badgeBg}`}>
               <cta.icon className={`w-6 h-6 ${cta.badgeText}`} />
            </div>
            <h3 className="text-lg font-black text-[#1A1D23] mb-2 tracking-tight">{cta.title}</h3>
            <p className="text-[13px] text-[#6B7280] leading-relaxed mb-8 flex-1 font-medium">
              {cta.description}
            </p>
            <Link href={cta.href}>
              <Button className="w-full py-4 bg-white border border-[#E5E8EB] text-[#1A1D23] font-bold text-[13px] rounded-xl group-hover:bg-[#F9FAFB] group-hover:border-[#D1D5DB] transition-all shadow-sm flex items-center justify-center gap-2">
                {cta.btnText}
                <ArrowRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#1A1D23] transition-colors" />
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 pt-8">
        
        {/* Workflows Column */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black uppercase tracking-tight text-[#1A1D23] flex items-center gap-3">
              <Activity className="w-5 h-5 text-[#FF642D]" />
              Active Processes
            </h2>
            {activeWorkflows.length > 0 && (
              <span className="text-[10px] font-bold bg-[#FF642D] text-white px-3 py-1 rounded-full animate-pulse">
                {activeWorkflows.length} Synchronizing
              </span>
            )}
          </div>

          <div className="space-y-4">
            {activeWorkflows.length === 0 ? (
              <div className="border-2 border-dashed border-[#E5E8EB] rounded-3xl p-12 text-center">
                 <p className="text-sm font-bold text-[#9CA3AF]">Engine Idle. No active content streams detected.</p>
              </div>
            ) : (
              activeWorkflows.map((w, i) => (
                <motion.div 
                  key={w.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white border border-[#E5E8EB] rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#F9FAFB] flex items-center justify-center shrink-0">
                       <Zap className="w-5 h-5 text-[#FF642D] animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-black text-[#1A1D23] leading-none mb-1 text-base underline decoration-[#FF642D]/20 decoration-4">
                        {w.campaigns?.name || 'Content Stream'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider italic">
                          {WORKFLOW_STATUS_LABELS[w.status] || 'Processing'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-32 sm:w-64">
                    <div className="h-2 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: '40%' }}
                         className="h-full bg-[#1A1D23]" 
                       />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Activity Column */}
        <div className="space-y-8">
          <h2 className="text-lg font-black uppercase tracking-tight text-[#1A1D23] flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#9CA3AF]" />
            Telemetry
          </h2>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {recentLogs.length === 0 ? (
              <p className="text-xs font-bold text-[#D1D5DB]">Waiting for system events...</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="group relative pl-6 border-l-2 border-[#E5E8EB] hover:border-[#FF642D] transition-colors pb-4">
                  <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-white border-2 border-[#E5E8EB] group-hover:border-[#FF642D] transition-colors" />
                  <p className="text-xs font-bold text-[#1A1D23] leading-relaxed mb-1">{log.message}</p>
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── Glory Footer ── */}
      <div className="pt-12 flex justify-center">
         <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#F9FAFB] border border-[#E5E8EB]">
            <Sparkles className="w-4 h-4 text-[#FF642D]" />
            <p className="text-[11px] font-black text-[#1A1D23] uppercase tracking-[0.3em]">Precision Engineering SEO</p>
         </div>
      </div>

    </div>
  );
}
