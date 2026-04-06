'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  FolderKanban,
  Tags,
  FileText,
  Globe,
  Clock,
  Activity,
  FolderPlus,
  Search,
  Plus,
  Sparkles,
  Rocket,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist';
import NextScheduleCard from '@/components/dashboard/NextScheduleCard';
import AuthorityCard from '@/components/dashboard/AuthorityCard';
import apiClient from '@/services/apiClient';
import { getSocket } from '@/services/websocketClient';
import Link from 'next/link';
import Button from '@/components/ui/Button';

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  pending: 'Queued',
  generating: 'Writing articles...',
  reviewing: 'Waiting for review',
  approved: 'Approved',
  publishing: 'Publishing...',
  published: 'Done',
  failed: 'Failed',
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
        apiClient.get('/logs?limit=8'),
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
      <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh]">
        <Rocket className="w-8 h-8 text-[#FF642D] animate-bounce mb-4" />
        <h2 className="text-lg font-semibold text-[#1A1D23]">Loading Workspace...</h2>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 focus:outline-none pb-12">
      
      {/* ── Top Action Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E8EB] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-[#6B7280] mt-1">Live metrics and automation status</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* WhatsApp Status Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold ${whatsappStatus.connected ? 'border-green-200 bg-green-50 text-green-700' : 'border-[#E5E8EB] bg-white text-[#6B7280]'}`}>
            <div className={`w-2 h-2 rounded-full ${whatsappStatus.connected ? 'bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-[#9CA3AF]'}`} />
            WhatsApp {whatsappStatus.connected ? 'Live' : 'Offline'}
          </div>

          <Link href="/campaigns">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Core Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-[#6B7280]">Connected Sites</p>
            <Globe className="w-4 h-4 text-[#FF642D]" />
          </div>
          <p className="text-2xl font-bold text-[#1A1D23]">{stats.activeSites}</p>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-[#6B7280]">Active Projects</p>
            <FolderKanban className="w-4 h-4 text-[#FF642D]" />
          </div>
          <p className="text-2xl font-bold text-[#1A1D23]">{stats.totalCampaigns}</p>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-[#6B7280]">Tracked Keywords</p>
            <Tags className="w-4 h-4 text-[#FF642D]" />
          </div>
          <p className="text-2xl font-bold text-[#1A1D23]">{stats.totalKeywords}</p>
        </div>
        <div className="stat-card">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-[#6B7280]">Published Articles</p>
            <FileText className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="text-2xl font-bold text-[#1A1D23]">{stats.publishedArticles}</p>
        </div>
      </div>

      {/* ── Compact Quick Links ── */}
      <div className="flex gap-2">
        <Link href="/keywords" className="btn-secondary text-xs h-8">
          <Search className="w-3.5 h-3.5 mr-1.5" /> Add Keywords
        </Link>
        <Link href="/content-lab" className="btn-secondary text-xs h-8">
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Content Lab
        </Link>
        <Link href="/sites" className="btn-secondary text-xs h-8">
          <Globe className="w-3.5 h-3.5 mr-1.5" /> Manage Sites
        </Link>
      </div>

      <OnboardingChecklist 
        hasSites={stats.activeSites > 0} 
        hasCampaigns={stats.totalCampaigns > 0} 
        hasKeywords={stats.totalKeywords > 0} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NextScheduleCard campaigns={campaigns} />
        <AuthorityCard />
      </div>

      {/* ── Data Tables Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Workflows Table */}
        <div className="xl:col-span-2 card-premium p-0 overflow-hidden flex flex-col h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E8EB] bg-white">
            <h3 className="text-base font-semibold text-[#1A1D23] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#FF642D]" />
              Active Core Workflows
            </h3>
            {activeWorkflows.length > 0 && (
              <span className="badge-orange">{activeWorkflows.length} Running</span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Project Name</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {activeWorkflows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-[#6B7280]">
                      No active generation workflows running.
                    </td>
                  </tr>
                ) : (
                  activeWorkflows.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <div className="w-2 h-2 rounded-full bg-[#FF642D] animate-pulse" />
                          {WORKFLOW_STATUS_LABELS[w.status] || w.status}
                        </div>
                      </td>
                      <td className="font-medium text-[#6B7280]">
                        {w.campaigns?.name || 'Manual Selection'}
                      </td>
                      <td className="w-48">
                        <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#FF642D] h-1.5 rounded-full w-1/3 animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card-premium p-0 flex flex-col h-full">
          <div className="px-5 py-4 border-b border-[#E5E8EB] bg-white">
            <h3 className="text-base font-semibold text-[#1A1D23] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#6B7280]" />
              System Log
            </h3>
          </div>
          
          <div className="p-0 overflow-y-auto max-h-[300px]">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-[#6B7280] text-center py-8">
                No logs recorded.
              </p>
            ) : (
              <div className="divide-y divide-[#E5E8EB]">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-[#F7F8FA] transition-colors flex gap-3">
                    {log.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm text-[#1A1D23] leading-snug">{log.message}</p>
                      <p className="text-xs text-[#9CA3AF] mt-1 font-medium">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mt-auto px-5 py-3 border-t border-[#E5E8EB] bg-[#F7F8FA]">
            <Link href="/workflows" className="text-xs font-semibold text-[#FF642D] hover:underline">
              View comprehensive log →
            </Link>
          </div>
        </div>
        
      </div>
    </div>
  );
}
