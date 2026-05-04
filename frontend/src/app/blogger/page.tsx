'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Rss, Globe, Plus, Zap, Send, Loader2, CheckCircle2, XCircle,
  FileText, RefreshCw, ExternalLink, Wifi, WifiOff, Settings2,
  Hash, Clock, BarChart3, PlayCircle, AlertCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import apiClient from '@/services/apiClient';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BloggerSite {
  id: string;
  name: string;
  api_url: string;
  type: string;
}

interface Campaign {
  id: string;
  name: string;
  target_site_id: string;
  schedule_type: string;
  posts_per_run: number;
  status: string;
}

interface Article {
  id: string;
  title: string;
  published_url: string;
  blogger_post_id: string;
  published_at: string;
  status: string;
}

interface TestResult {
  success: boolean;
  message: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BloggerPage() {
  const [sites, setSites]         = useState<BloggerSite[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [articles, setArticles]   = useState<Article[]>([]);
  const [loading, setLoading]     = useState(true);

  const [testingIds, setTestingIds]   = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const [triggeringIds, setTriggeringIds]     = useState<Set<string>>(new Set());
  const [triggerResults, setTriggerResults]   = useState<Record<string, string>>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesRes, campaignsRes, articlesRes] = await Promise.all([
        apiClient.get('/sites'),
        apiClient.get('/campaigns'),
        apiClient.get('/articles?limit=20'),
      ]);

      const bloggerSites: BloggerSite[] = (sitesRes.data as BloggerSite[]).filter(
        (s: BloggerSite) => s.type === 'blogger'
      );
      setSites(bloggerSites);

      const bloggerSiteIds = new Set(bloggerSites.map((s: BloggerSite) => s.id));
      const bloggerCampaigns = (campaignsRes.data as Campaign[]).filter(
        (c: Campaign) => bloggerSiteIds.has(c.target_site_id)
      );
      setCampaigns(bloggerCampaigns);

      const published = (articlesRes.data as Article[]).filter(
        (a: Article) => a.blogger_post_id && a.status === 'published'
      );
      setArticles(published);
    } catch (err) {
      console.error('Failed to load Blogger data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const testConnection = async (siteId: string) => {
    setTestingIds(prev => new Set(prev).add(siteId));
    setTestResults(prev => { const n = { ...prev }; delete n[siteId]; return n; });
    try {
      const { data } = await apiClient.post(`/sites/${siteId}/test`);
      if (data.success) {
        const msg = `${data.blog_name} · ${data.posts_total ?? 0} posts`;
        setTestResults(prev => ({ ...prev, [siteId]: { success: true, message: msg } }));
      } else {
        setTestResults(prev => ({ ...prev, [siteId]: { success: false, message: data.error || 'Failed' } }));
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Connection error';
      setTestResults(prev => ({ ...prev, [siteId]: { success: false, message: msg } }));
    } finally {
      setTestingIds(prev => { const n = new Set(prev); n.delete(siteId); return n; });
    }
  };

  const triggerCampaign = async (campaignId: string) => {
    setTriggeringIds(prev => new Set(prev).add(campaignId));
    setTriggerResults(prev => { const n = { ...prev }; delete n[campaignId]; return n; });
    try {
      await apiClient.post('/workflows/trigger', {
        campaign_id: campaignId,
        type: 'article_generation',
      });
      setTriggerResults(prev => ({ ...prev, [campaignId]: 'Workflow started — check Auto-Publish for progress.' }));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Trigger failed';
      setTriggerResults(prev => ({ ...prev, [campaignId]: `Error: ${msg}` }));
    } finally {
      setTriggeringIds(prev => { const n = new Set(prev); n.delete(campaignId); return n; });
    }
  };

  const scheduleLabel: Record<string, string> = {
    manual: 'Manual',
    hourly: 'Hourly',
    daily:  'Daily',
    weekly: 'Weekly',
  };

  const statusColor: Record<string, string> = {
    active:    'text-emerald-600 bg-emerald-50',
    paused:    'text-amber-600 bg-amber-50',
    completed: 'text-sky-600 bg-sky-50',
    archived:  'text-slate-500 bg-slate-100',
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
              <Rss className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              Blogger Automation
            </h1>
          </div>
          <p className="text-muted-foreground text-base">
            Connected Blogger blogs, active campaigns, published articles.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchAll} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Link href="/sites">
            <Button className="flex items-center gap-2 shadow-lg shadow-orange-500/20">
              <Plus className="w-4 h-4" />
              Add Blogger Site
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Quick Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Blogger Sites',     value: sites.length,    icon: Globe,    color: '#6366F1' },
          { label: 'Active Campaigns',  value: campaigns.filter(c => c.status === 'active').length, icon: Rss, color: '#F97316' },
          { label: 'Published Posts',   value: articles.length, icon: FileText, color: '#10B981' },
        ].map(stat => (
          <div key={stat.label} className="card-premium grainy p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${stat.color}18` }}>
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{loading ? '—' : stat.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Blogger Sites ────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            Connected Blogs
          </h2>
          <Link href="/sites" className="text-xs text-primary hover:underline font-bold">
            Manage all sites →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">Loading blogs...</div>
        ) : sites.length === 0 ? (
          <div className="py-12 bg-secondary/20 rounded-3xl border border-dashed border-border text-center text-muted-foreground">
            <Rss className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No Blogger sites connected.</p>
            <p className="text-sm mt-1">Go to Integrations → Add Site → select Blogger.</p>
            <Link href="/sites">
              <Button className="mt-4" variant="outline">Go to Integrations</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sites.map(site => (
              <div key={site.id} className="card-premium grainy p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 overflow-hidden shrink-0">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(site.api_url).hostname; } catch { return 'blogger.com'; } })()}&sz=128`}
                      alt={site.name}
                      className="w-6 h-6 object-contain"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{site.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{site.api_url}</p>
                  </div>
                  <Link href="/sites" title="Edit site">
                    <Button variant="ghost" size="icon" className="shrink-0 w-7 h-7 rounded-lg">
                      <Settings2 className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>

                {/* Connection test result */}
                {testResults[site.id] && (
                  <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border font-medium ${
                    testResults[site.id].success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                  }`}>
                    {testResults[site.id].success
                      ? <Wifi className="w-3.5 h-3.5 shrink-0" />
                      : <WifiOff className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{testResults[site.id].message}</span>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full text-xs flex items-center justify-center gap-2"
                  onClick={() => testConnection(site.id)}
                  disabled={testingIds.has(site.id)}
                >
                  {testingIds.has(site.id)
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Zap className="w-3.5 h-3.5" />}
                  {testingIds.has(site.id) ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Campaigns ───────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Hash className="w-5 h-5 text-orange-500" />
            Blogger Campaigns
          </h2>
          <Link href="/campaigns" className="text-xs text-primary hover:underline font-bold">
            Manage all campaigns →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground animate-pulse">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="py-10 bg-secondary/20 rounded-3xl border border-dashed border-border text-center text-muted-foreground">
            <Hash className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No campaigns target a Blogger site.</p>
            <p className="text-sm mt-1">Create a campaign → set Target Site to a Blogger blog.</p>
            <Link href="/campaigns">
              <Button className="mt-4" variant="outline">Go to Campaigns</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(campaign => {
              const siteForCampaign = sites.find(s => s.id === campaign.target_site_id);
              const isTriggering    = triggeringIds.has(campaign.id);
              const triggerMsg      = triggerResults[campaign.id];

              return (
                <div key={campaign.id} className="card-premium grainy p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground">{campaign.name}</p>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${statusColor[campaign.status] || 'text-slate-500 bg-slate-100'}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {siteForCampaign?.name || 'Unknown site'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {scheduleLabel[campaign.schedule_type] || campaign.schedule_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {campaign.posts_per_run} posts/run
                      </span>
                    </div>
                    {triggerMsg && (
                      <div className={`mt-2 text-[11px] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 ${
                        triggerMsg.startsWith('Error')
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {triggerMsg.startsWith('Error')
                          ? <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                        {triggerMsg}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Button variant="outline" size="icon" className="w-8 h-8 rounded-xl" title="View campaign">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      className="flex items-center gap-2 text-xs shadow-sm shadow-orange-500/20"
                      onClick={() => triggerCampaign(campaign.id)}
                      disabled={isTriggering || campaign.status !== 'active'}
                      title={campaign.status !== 'active' ? 'Campaign is not active' : 'Generate & publish now'}
                    >
                      {isTriggering
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <PlayCircle className="w-3.5 h-3.5" />}
                      {isTriggering ? 'Starting...' : 'Run Now'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Recent Blogger Articles ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            Published on Blogger
          </h2>
          <Link href="/articles" className="text-xs text-primary hover:underline font-bold">
            View all articles →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground animate-pulse">Loading articles...</div>
        ) : articles.length === 0 ? (
          <div className="py-10 bg-secondary/20 rounded-3xl border border-dashed border-border text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-bold">No Blogger articles published yet.</p>
            <p className="text-sm mt-1">Run a campaign above to generate and publish your first article.</p>
          </div>
        ) : (
          <div className="card-premium grainy overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Article</th>
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Blogger ID</th>
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">Published</th>
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {articles.slice(0, 10).map(article => (
                    <tr key={article.id} className="hover:bg-primary/3 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-foreground line-clamp-1">{article.title}</p>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span className="text-xs font-mono text-muted-foreground">{article.blogger_post_id}</span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {article.published_at ? new Date(article.published_at).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {article.published_url ? (
                          <a
                            href={article.published_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
