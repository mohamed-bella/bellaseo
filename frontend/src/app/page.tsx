'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FolderKanban,
  Tags,
  FileText,
  Globe,
  Clock,
  History,
  Zap,
  Activity,
  FolderPlus,
  Search,
  ArrowRight,
  Plus,
  Sparkles,
  Rocket,
  ExternalLink,
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist';
import NextScheduleCard from '@/components/dashboard/NextScheduleCard';
import AuthorityCard from '@/components/dashboard/AuthorityCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import apiClient from '@/services/apiClient';
import { getSocket } from '@/services/websocketClient';
import Link from 'next/link';

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Queued',
  generating: '✍️ Writing articles...',
  reviewing: '👁 Waiting for your review',
  approved: '✅ Approved',
  publishing: '🚀 Publishing to your site...',
  published: '✅ Done',
  failed: '⚠️ Something went wrong',
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeSites: 0,
    totalCampaigns: 0,
    totalKeywords: 0,
    publishedArticles: 0,
  });

  const [activeWorkflows, setActiveWorkflows] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
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
        apiClient.get('/logs?limit=5'),
        apiClient.get('/notifications/whatsapp/status'),
        apiClient.get('/sites'),
      ]);

      setCampaigns(c.data);
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-10">
                <div className="w-20 h-20 rounded-full border-[3px] border-primary/10 border-t-primary animate-[spin_1.5s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Rocket className="w-8 h-8 text-primary/80" />
                </div>
            </div>
            <div className="text-center space-y-3">
              <h2 className="text-xl font-black text-foreground tracking-tight">Loading Dashboard</h2>
              <div className="flex gap-1.5 justify-center">
                  {[0, 1, 2].map((i) => (
                    <div 
                      key={i} 
                      className="w-1.5 h-1.5 rounded-full bg-primary" 
                      style={{ animation: `bounce 1s infinite ${i * 0.2}s` }}
                    />
                  ))}
              </div>
            </div>
        </div>
        <style jsx>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); opacity: 0.3; }
            50% { transform: translateY(-4px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 focus:outline-none">
      
      {/* ── Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your SEO automation at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${whatsappStatus.connected ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : 'border-border bg-secondary text-muted-foreground'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${whatsappStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
            {whatsappStatus.connected ? 'WhatsApp Live' : 'WhatsApp Offline'}
          </div>
          <Link href="/campaigns" className="btn-primary text-sm gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Link>
        </div>
      </div>

      {/* ── Stats Grid (information density first) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Sites" value={stats.activeSites} icon={Globe} description="Connected" isLoading={isLoading} />
        <StatCard title="Projects" value={stats.totalCampaigns} icon={FolderKanban} description="Active clusters" isLoading={isLoading} />
        <StatCard title="Keywords" value={stats.totalKeywords} icon={Tags} description="Tracked" isLoading={isLoading} />
        <StatCard title="Published" value={stats.publishedArticles} icon={FileText} description="Live articles" isLoading={isLoading} />
      </div>

      {/* ── Quick Actions Strip (compact, not giant cards) ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card border border-border">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" /> Quick Actions
        </span>
        <Link href="/campaigns" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/30 text-primary text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95">
          <FolderPlus className="w-3.5 h-3.5" /> New Project
        </Link>
        <Link href="/keywords" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 hover:border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95">
          <Search className="w-3.5 h-3.5" /> Add Keywords
        </Link>
        <Link href="/sites" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95">
          <Globe className="w-3.5 h-3.5" /> Connect Site
        </Link>
        <Link href="/content-lab" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95">
          <Sparkles className="w-3.5 h-3.5" /> AI Content Lab
        </Link>
      </div>

      {/* ── Onboarding (only if incomplete) ── */}
      <OnboardingChecklist 
        hasSites={stats.activeSites > 0} 
        hasCampaigns={stats.totalCampaigns > 0} 
        hasKeywords={stats.totalKeywords > 0} 
      />

      {/* ── Schedule + Authority side-by-side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NextScheduleCard campaigns={campaigns} />
        <AuthorityCard />
      </div>

      {/* ── Live Engine + Activity ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pb-10">
        {/* Live Engine */}
        <div className="xl:col-span-2">
          <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-foreground flex items-center gap-3">
                <Activity className="w-5 h-5 text-primary" />
                Live Engine
              </h3>
              <span className="text-[10px] font-black text-primary border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                {activeWorkflows.length > 0 ? `${activeWorkflows.length} Running` : 'Idle'}
              </span>
            </div>

            <div className="space-y-3">
              {activeWorkflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
                  <Clock className="w-10 h-10 mb-3 opacity-10" />
                  <p className="text-sm font-bold text-foreground">No active workflows</p>
                  <p className="text-xs text-center opacity-60 mt-1 max-w-xs">
                    Go to{' '}
                    <Link href="/campaigns" className="text-primary hover:underline font-bold">
                      Projects
                    </Link>{' '}
                    to start generating content.
                  </p>
                </div>
              ) : (
                activeWorkflows.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-5 rounded-xl border border-border bg-secondary/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-ping" />
                      <div>
                        <p className="text-sm font-bold text-foreground leading-tight">
                          {WORKFLOW_STATUS_LABELS[w.status] || w.status}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">
                          {w.campaigns?.name || 'Manual Run'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-muted-foreground bg-secondary px-2 py-0.5 rounded-full uppercase tracking-widest border border-border/50">
                        {w.status === 'pending' ? 'Queued' : 'Processing'}
                      </span>
                      <div className="w-24 h-1 bg-secondary rounded-full overflow-hidden relative">
                        <div className="h-full bg-primary/20 w-full absolute inset-0">
                           <div className="h-full bg-primary w-1/3 rounded-full absolute left-0 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border">
          <h3 className="text-lg font-black text-foreground mb-6 flex items-center gap-3">
            <History className="w-5 h-5 text-primary" />
            Activity Feed
          </h3>
          <div className="space-y-4">
            {recentLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-8 text-center">
                No activity recorded yet.
              </p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-primary/20 pl-4 py-1">
                  <p className="text-xs font-medium text-foreground/80 line-clamp-2 leading-relaxed">
                    {log.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1.5 font-bold opacity-50">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(log.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))
            )}
            <Link
              href="/workflows"
              className="flex items-center justify-center gap-2 text-[11px] font-black text-primary hover:opacity-80 transition-opacity uppercase tracking-widest pt-4 border-t border-border mt-2"
            >
              View All Logs <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
