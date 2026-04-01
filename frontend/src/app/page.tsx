'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FolderKanban,
  Tags,
  FileText,
  Globe,
  CheckCircle2,
  Clock,
  ShieldCheck,
  History,
  Zap,
  Activity,
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
        {/* Abstract Background Accents */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
            {/* Logo Spinner Hybrid */}
            <div className="relative mb-10">
                <div className="w-24 h-24 rounded-full border-[3px] border-primary/10 border-t-primary animate-[spin_1.5s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldCheck className="w-10 h-10 text-primary/80" />
                </div>
            </div>

            {/* Loading text with animated dots */}
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-black text-foreground tracking-tight animate-pulse">Initializing Engine</h2>
              <div className="flex gap-1.5 justify-center">
                  {[0, 1, 2].map((i) => (
                    <div 
                      key={i} 
                      className="w-1.5 h-1.5 rounded-full bg-primary" 
                      style={{ animation: `bounce 1s infinite ${i * 0.2}s` }}
                    />
                  ))}
              </div>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40 pt-4">Connecting to Authority Clusters</p>
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
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-foreground tracking-tight">Dashboard</h1>
            <div className={`mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${whatsappStatus.connected ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-primary'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${whatsappStatus.connected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_theme(colors.emerald.500)]' : 'bg-primary'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                {whatsappStatus.connected 
                  ? `WhatsApp Live${whatsappStatus.user ? ` · +${whatsappStatus.user}` : ''}` 
                  : 'WhatsApp Offline'}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground font-medium">Welcome back. Your SEO automation engine is performing well.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="btn-primary">
            Quick Launch
          </Link>
        </div>
      </div>

      {/* Onboarding */}
      <OnboardingChecklist 
        hasSites={stats.activeSites > 0} 
        hasCampaigns={stats.totalCampaigns > 0} 
        hasKeywords={stats.totalKeywords > 0} 
      />

      <NextScheduleCard campaigns={campaigns} />

      {/* E-E-A-T Authority Metrics */}
      <AuthorityCard />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Sites"
          value={stats.activeSites}
          icon={Globe}
          description="Connected platforms"
          isLoading={isLoading}
        />
        <StatCard
          title="Live Clusters"
          value={stats.totalCampaigns}
          icon={FolderKanban}
          description="Thematic silos"
          isLoading={isLoading}
        />
        <StatCard
          title="Target Keywords"
          value={stats.totalKeywords}
          icon={Tags}
          trend={{ value: 8, isUp: true }}
          description="Target SEO reach"
          isLoading={isLoading}
        />
        <StatCard
          title="Articles"
          value={stats.publishedArticles}
          icon={FileText}
          trend={{ value: 24, isUp: true }}
          description="Live on your websites"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Currently Running */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl p-8 border border-border h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                <Activity className="w-6 h-6 text-primary" />
                Live Engine
              </h3>
              <span className="text-[11px] font-black text-primary border border-primary/20 px-3 py-1 rounded-full uppercase tracking-widest">
                Active
              </span>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="py-20 flex items-center justify-center">
                  <LoadingSpinner size={40} />
                </div>
              ) : activeWorkflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
                  <Clock className="w-12 h-12 mb-4 opacity-10" />
                  <p className="text-base font-bold text-foreground">Nothing is running right now</p>
                  <p className="text-[13px] text-center opacity-70 mt-1 max-w-xs font-medium">
                    Go to{' '}
                    <Link href="/campaigns" className="text-primary hover:underline font-bold">
                      My Projects
                    </Link>{' '}
                    to start generating.
                  </p>
                </div>
              ) : (
                activeWorkflows.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-6 rounded-2xl border border-border bg-muted/20"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-3 h-3 bg-primary rounded-full animate-ping" />
                      <div>
                        <p className="text-base font-bold text-foreground leading-tight">
                          {WORKFLOW_STATUS_LABELS[w.status] || w.status}
                        </p>
                        <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest mt-1.5 opacity-70">
                          {w.campaigns?.name || 'Manual Run'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-border/50">
                        {w.status === 'pending' ? 'Queued' : 'Processing'}
                      </span>
                      <div className="w-32 h-1 bg-secondary rounded-full overflow-hidden relative">
                        {w.status === 'pending' ? (
                          <div className="h-full bg-muted-foreground/30 w-full" />
                        ) : (
                          <div className="h-full bg-primary/20 w-full absolute top-0 left-0">
                             <div className="h-full bg-primary w-1/2 rounded-full absolute top-0 left-0 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] origin-left" />
                             <div className="h-full bg-primary w-1/3 rounded-full absolute top-0 left-0 animate-pulse" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Panels */}
        <div className="space-y-8">
          {/* System Health */}
          <div className="bg-card rounded-xl p-8 border border-border">
            <h3 className="text-xl font-bold text-foreground mb-8 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              Infrastructure
            </h3>
            <div className="space-y-6">
              {[
                { label: 'API Cluster', status: 'Optimal', ok: true },
                { label: 'Cloud DB', status: 'Connected', ok: true },
                {
                  label: 'WhatsApp Relay',
                  status: whatsappStatus.connected ? 'Active' : 'Offline',
                  ok: whatsappStatus.connected,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-primary'}`} />
                    <span className="text-sm font-bold text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${
                      item.ok
                        ? 'text-emerald-600 border-emerald-100 bg-emerald-50'
                        : 'text-primary border-rose-100 bg-rose-50'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card rounded-xl p-8 border border-border">
            <h3 className="text-xl font-bold text-foreground mb-8 flex items-center gap-3">
              <History className="w-6 h-6 text-primary" />
              Activity
            </h3>
            <div className="space-y-5">
              {recentLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No activity yet.
                </p>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="border-l-2 border-border pl-4 py-0.5">
                    <p className="text-[13px] font-medium text-foreground/80 line-clamp-2 leading-relaxed">
                      {log.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1.5 mt-2 font-black tracking-widest opacity-60">
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
                className="block text-center text-[11px] font-black text-primary hover:opacity-80 transition-opacity uppercase tracking-widest pt-4 border-t border-border mt-4"
              >
                Full Engine Logs →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

