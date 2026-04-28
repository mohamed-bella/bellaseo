'use client';

import { useEffect, useState } from 'react';
import { Zap, Clock, CheckCircle2, AlertCircle, RefreshCw, Layers, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import apiClient from '@/services/apiClient';
import { getSocket } from '@/services/websocketClient';
import Link from 'next/link';

const STATUS_META: Record<string, { icon: any; label: string; color: string }> = {
  pending:    { icon: Clock,         label: '⏳ Queued',                      color: 'text-muted-foreground' },
  generating: { icon: RefreshCw,     label: '✍️ Writing articles...',          color: 'text-primary animate-spin' },
  reviewing:  { icon: Layers,        label: '👁 Waiting for your review',      color: 'text-amber-500' },
  approved:   { icon: CheckCircle2,  label: '✅ Approved',                     color: 'text-primary' },
  publishing: { icon: Zap,           label: '🚀 Publishing to your site...', color: 'text-primary animate-pulse' },
  published:  { icon: CheckCircle2,  label: '✅ Done — Live on your site',     color: 'text-emerald-500' },
  failed:     { icon: AlertCircle,   label: '⚠️ Something went wrong',         color: 'text-rose-500' },
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [{ data: wData }, { data: lData }, { data: cData }] = await Promise.all([
        apiClient.get('/workflows'),
        apiClient.get('/logs?limit=50'),
        apiClient.get('/campaigns'),
      ]);
      setWorkflows(wData);
      setLogs(lData);
      setCampaigns(cData.filter((c: any) => c.status === 'active' && c.schedule_type !== 'manual'));
    } catch (err) {
      console.error('Failed to fetch automation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNextRun = (cronTime: string, type: string) => {
    const [hours, minutes] = cronTime.split(':').map(Number);
    const now = new Date();
    let next = new Date();
    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      if (type === 'daily') next.setDate(next.getDate() + 1);
      else if (type === 'weekly') next.setDate(next.getDate() + 7);
      else if (type === 'hourly') {
        next = new Date();
        next.setHours(next.getHours() + 1, minutes, 0, 0);
      }
    }
    return next;
  };

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    const handleUpdate = () => fetchData();
    socket.on('workflow:statusChanged', handleUpdate);
    socket.on('workflow:started', handleUpdate);
    socket.on('workflow:retrying', handleUpdate);
    return () => {
      socket.off('workflow:statusChanged');
      socket.off('workflow:started');
      socket.off('workflow:retrying');
    };
  }, []);

  const retryWorkflow = async (id: string) => {
    try {
      await apiClient.patch(`/workflows/${id}/retry`);
    } catch {
      alert('Could not restart this run. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Zap className="w-7 h-7 text-primary" />
            Automation Engine
          </h1>
          <p className="text-muted-foreground mt-1 text-base">
            This is where the AI works. Each &ldquo;run&rdquo; writes articles based on your projects and then publishes them.
          </p>
        </div>
        <Link
          href="/campaigns"
          className="flex items-center gap-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors px-4 py-2 rounded-xl"
        >
          Go to My Projects <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Scheduled Runs Section */}
      {campaigns.length > 0 && (
        <div className="bg-[#1A1D23] rounded-3xl p-6 text-white border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16" />
          <h3 className="font-bold text-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2 relative z-10">
            <Clock className="w-4 h-4" /> Next Scheduled Runs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
            {campaigns.map((c) => {
              const nextRun = calculateNextRun(c.cron_time, c.schedule_type);
              return (
                <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-[150px]">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-0.5">{c.schedule_type} @ {c.cron_time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-primary uppercase">Starting In</p>
                    <p className="text-sm font-black text-white">
                      {Math.max(0, Math.floor((nextRun.getTime() - Date.now()) / (1000 * 60 * 60)))}h {Math.max(0, Math.floor(((nextRun.getTime() - Date.now()) / (1000 * 60)) % 60))}m
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Automation Runs */}
        <div className="space-y-6">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Automation Runs
          </h3>

          <div className="space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground animate-pulse">Loading runs...</div>
            ) : workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-border rounded-2xl bg-secondary/10 px-6">
                <Zap className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">No automation runs yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                  Go to{' '}
                  <Link href="/campaigns" className="text-primary hover:underline font-bold">
                    My Projects
                  </Link>{' '}
                  and click <strong>&ldquo;Generate Articles&rdquo;</strong> to start your first run.
                </p>
              </div>
            ) : (
              workflows.map((w) => {
                const meta = STATUS_META[w.status] || STATUS_META.pending;
                const Icon = meta.icon;
                return (
                  <div
                    key={w.id}
                    className="card-premium flex items-center justify-between p-5 border border-border group hover:border-primary/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn('p-2 rounded-lg bg-secondary', meta.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground capitalize">
                            {w.type === 'article_generation' ? 'Article Generation' : w.type.replace('_', ' ')}
                          </p>
                          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
                            {w.campaigns?.name || 'Manual Run'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {meta.label} &nbsp;·&nbsp; {new Date(w.last_run).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>

                    {w.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                        onClick={() => retryWorkflow(w.id)}
                      >
                        Try Again
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Audit Logs */}
        <div className="space-y-6">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            System Activity Log
          </h3>

          <div className="bg-secondary/50 rounded-xl border border-border overflow-hidden flex flex-col h-[600px]">
            <div className="bg-secondary p-3 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border">
              Recent Events
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
              {logs.length === 0 ? (
                <p className="text-muted-foreground italic text-center pt-8">
                  No activity yet. Logs will appear here once a run starts.
                </p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-3 text-muted-foreground">
                    <span className="opacity-40 shrink-0">
                      [{new Date(log.created_at).toLocaleTimeString()}]
                    </span>
                    <span
                      className={cn(
                        'font-bold uppercase w-10 text-center rounded shrink-0',
                        log.level === 'error'
                          ? 'text-rose-500 bg-rose-500/10'
                          : log.level === 'warn'
                          ? 'text-amber-500 bg-amber-500/10'
                          : 'text-primary bg-primary/10'
                      )}
                    >
                      {log.level}
                    </span>
                    <span className="text-foreground/80">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
