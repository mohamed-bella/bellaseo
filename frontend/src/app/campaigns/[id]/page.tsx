'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, Plus, Eye, CheckCircle2, FileEdit, Settings,
  Zap, Loader2, Play, Pause, Trash2, Globe, XCircle, RotateCcw,
  FolderOpen, Tag, Clock, BarChart2, ExternalLink, Check,
  X, RefreshCw, ChevronDown, ChevronUp, Layers, LayoutGrid, Library,
  MoreHorizontal, ChevronRight, Search
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import apiClient from '@/services/apiClient';
import { motion, AnimatePresence } from 'framer-motion';

const ArticleEditor = dynamic(() => import('@/components/articles/ArticleEditor'), { ssr: false });
import { getSocket } from '@/services/websocketClient';

// ── helpers ──────────────────────────────────────────────────────────────────
function readingTime(wc: number) { return `${Math.ceil((wc || 0) / 200)} min`; }

const STATUS_ART: Record<string, { label: string; cls: string }> = {
  review:   { label: 'Review',   cls: 'text-amber-600 bg-amber-50 border-amber-200' },
  approved: { label: 'Approved', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  published:{ label: 'Live',     cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  draft:    { label: 'Draft',    cls: 'text-[#9CA3AF] bg-[#F3F4F6] border-[#E5E8EB]' },
  rejected: { label: 'Rejected', cls: 'text-rose-600 bg-rose-50 border-rose-200' },
};

const STATUS_KW: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'Pending',    cls: 'text-[#9CA3AF] bg-[#F3F4F6] border-[#E5E8EB]' },
  in_progress: { label: 'Writing…',  cls: 'text-[#FF642D] bg-orange-50 border-orange-200' },
  done:        { label: 'Done',       cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  failed:      { label: 'Failed',     cls: 'text-rose-600 bg-rose-50 border-rose-200' },
};

const ART_TABS = ['All', 'Review', 'Approved', 'Live', 'Draft', 'Rejected'] as const;
type ArtTab = typeof ART_TABS[number];

const CLUSTER_COLORS = [
  '#6366F1','#8B5CF6','#EC4899','#14B8A6','#F59E0B','#3B82F6','#10B981','#EF4444',
];

// ── component ─────────────────────────────────────────────────────────────────
export default function ProjectHubPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [campaign, setCampaign]   = useState<any>(null);
  const [keywords, setKeywords]   = useState<any[]>([]);
  const [articles, setArticles]   = useState<any[]>([]);
  const [clusters, setClusters]   = useState<any[]>([]);
  const [sites, setSites]         = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redesign: Workspace View
  const [view, setView] = useState<'topics' | 'library'>('topics');

  // topics pane
  const [newTopic, setNewTopic]           = useState('');
  const [newTopicCluster, setNewTopicCluster] = useState('');
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [topicSearch, setTopicSearch]     = useState('');
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(new Set());

  // cluster creation
  const [newClusterName, setNewClusterName] = useState('');
  const [isCreatingCluster, setIsCreatingCluster] = useState(false);
  const [showClusterForm, setShowClusterForm] = useState(false);

  // generation
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating]             = useState(false);
  const [triggerMsg, setTriggerMsg]                 = useState<{ msg: string; isError: boolean } | null>(null);

  // article actions
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [artStatusFilter, setArtStatusFilter] = useState<ArtTab>('All');

  // editor
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen]       = useState(false);

  // settings
  const [isSettingsOpen, setIsSettingsOpen]           = useState(false);
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);
  const [postTypes, setPostTypes] = useState([{ slug: 'post', name: 'Posts' }, { slug: 'page', name: 'Pages' }]);
  const [formData, setFormData] = useState({
    name: '', niche: '', schedule_type: 'manual', target_word_count: 1500,
    article_style: 'informative', prompt_template: '', target_site_id: '',
    target_cpt: 'post', cron_time: '09:00', cron_timezone: 'Africa/Casablanca', posts_per_run: 1,
  });

  const progress = keywords.length > 0 ? (articles.filter(a => a.status === 'published').length / keywords.length) * 100 : 0;

  // ── data ────────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [cRes, kRes, aRes, clRes, sRes] = await Promise.all([
        apiClient.get('/campaigns'),
        apiClient.get(`/keywords?campaign_id=${projectId}`),
        apiClient.get(`/articles?campaign_id=${projectId}`),
        apiClient.get(`/clusters?campaign_id=${projectId}`),
        apiClient.get('/sites'),
      ]);

      const c = cRes.data.find((x: any) => x.id === projectId);
      if (!c) { router.push('/campaigns'); return; }
      setCampaign(c);
      setSites(sRes.data);
      setKeywords(kRes.data);
      setArticles(aRes.data);
      setClusters(clRes.data);
      setFormData({
        name: c.name, niche: c.niche, schedule_type: c.schedule_type,
        target_word_count: c.target_word_count || 1500,
        article_style: c.article_style || 'informative',
        prompt_template: c.prompt_template || '',
        target_site_id: c.target_site_id || '',
        target_cpt: c.target_cpt || 'post',
        cron_time: c.cron_time || '09:00',
        cron_timezone: c.cron_timezone || 'Africa/Casablanca',
        posts_per_run: c.posts_per_run || 1,
      });
    } catch (err) {
      console.error('[CampaignHub] fetchData error', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    socket.on('keyword:statusChanged', fetchData);
    socket.on('article:created', fetchData);
    socket.on('article:statusChanged', fetchData);
    socket.on('article:approved', fetchData);
    socket.on('article:rejected', fetchData);
    socket.on('workflow:statusChanged', fetchData);
    return () => {
      socket.off('keyword:statusChanged', fetchData);
      socket.off('article:created', fetchData);
      socket.off('article:statusChanged', fetchData);
      socket.off('article:approved', fetchData);
      socket.off('article:rejected', fetchData);
      socket.off('workflow:statusChanged', fetchData);
    };
  }, [fetchData]);

  useEffect(() => {
    if (!formData.target_site_id || !sites.length) return;
    const s = sites.find((x) => x.id === formData.target_site_id);
    if (s?.type === 'wordpress') {
      apiClient.get(`/sites/${formData.target_site_id}/post-types`)
        .then((r) => setPostTypes(r.data))
        .catch(() => setPostTypes([{ slug: 'post', name: 'Posts' }, { slug: 'page', name: 'Pages' }]));
    } else {
      setPostTypes([{ slug: 'post', name: 'Posts' }]);
    }
  }, [formData.target_site_id, sites]);

  // ── cluster colour map ──────────────────────────────────────────────────────
  const clusterColorMap = Object.fromEntries(
    clusters.map((cl, i) => [cl.id, CLUSTER_COLORS[i % CLUSTER_COLORS.length]])
  );

  // ── topics pane logic ───────────────────────────────────────────────────────
  const filteredKeywords = keywords.filter(k =>
    !topicSearch || k.main_keyword.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const groupedKeywords = React.useMemo(() => {
    const groups: Record<string, typeof keywords> = {};
    for (const k of filteredKeywords) {
      const key = k.cluster_id || '__none__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(k);
    }
    return groups;
  }, [filteredKeywords]);

  const pendingKeywords = keywords.filter(k => k.status === 'pending');

  const handleToggleSelectAll = () => {
    if (selectedKeywordIds.size === pendingKeywords.length) setSelectedKeywordIds(new Set());
    else setSelectedKeywordIds(new Set(pendingKeywords.map(k => k.id)));
  };

  const handleToggleSelect = (id: string) =>
    setSelectedKeywordIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleQuickAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    setIsAddingTopic(true);
    try {
      await apiClient.post('/keywords', {
        campaign_id: projectId,
        main_keyword: newTopic.trim(),
        cluster_id: newTopicCluster || null,
        intent: 'informational', difficulty: 'medium', is_pillar: false, secondary_keywords: [],
      });
      setNewTopic(''); setNewTopicCluster('');
      fetchData();
    } catch (err) { console.error(err); }
    finally { setIsAddingTopic(false); }
  };

  const handleDeleteKeyword = async (id: string) => {
    if (!confirm('Drop this topic? Any drafted articles will be deleted too.')) return;
    await apiClient.delete(`/keywords/${id}`).catch(console.error);
    fetchData();
  };

  const handleCreateCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClusterName.trim()) return;
    setIsCreatingCluster(true);
    try {
      await apiClient.post('/clusters', { name: newClusterName.trim(), campaign_id: projectId });
      setNewClusterName(''); setShowClusterForm(false);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setIsCreatingCluster(false); }
  };

  const toggleCluster = (id: string) =>
    setCollapsedClusters(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── article actions ─────────────────────────────────────────────────────────
  const setArtLoading = (id: string, action: string) =>
    setActionLoading(prev => ({ ...prev, [id]: action }));
  const clearArtLoading = (id: string) =>
    setActionLoading(prev => { const n = { ...prev }; delete n[id]; return n; });

  const handleApprove = async (artId: string) => {
    setArtLoading(artId, 'approve');
    try { await apiClient.post(`/articles/${artId}/approve`); fetchData(); }
    catch (err) { console.error(err); }
    finally { clearArtLoading(artId); }
  };

  const handleReject = async (artId: string) => {
    setArtLoading(artId, 'reject');
    try { await apiClient.post(`/articles/${artId}/reject`); fetchData(); }
    catch (err) { console.error(err); }
    finally { clearArtLoading(artId); }
  };

  const handleSetStatus = async (artId: string, status: string) => {
    setArtLoading(artId, status);
    try { await apiClient.patch(`/articles/${artId}/status`, { status }); fetchData(); }
    catch (err) { console.error(err); }
    finally { clearArtLoading(artId); }
  };

  // ── generation ──────────────────────────────────────────────────────────────
  const handleGenerate = async (ids: string[], isRegenId: string | null = null) => {
    if (!ids.length) return;
    setIsGenerating(true); 
    setTriggerMsg(null); 
    
    try {
      if (isRegenId) {
        await apiClient.post(`/articles/${isRegenId}/regenerate`, {
          target_length: formData.target_word_count,
          style: formData.article_style,
        });
        setTriggerMsg({ msg: `Regenerating article…`, isError: false });
        fetchData();
      } else {
        await apiClient.post('/workflows/trigger', {
          campaign_id: projectId, 
          type: 'article_generation',
          keyword_ids: ids,
        });
        setTriggerMsg({ msg: `AI writing ${ids.length} article(s)…`, isError: false });
      }
      setSelectedKeywordIds(new Set());
    } catch (err: any) {
      setTriggerMsg({ msg: err.response?.data?.error || 'Generation failed', isError: true });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setTriggerMsg(null), 5000);
    }
  };

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSettings(true);
    try { await apiClient.put(`/campaigns/${projectId}`, formData); setIsSettingsOpen(false); fetchData(); }
    catch (err) { console.error(err); }
    finally { setIsSubmittingSettings(false); }
  };

  // ── derived ──────────────────────────────────────────────────────────────────
  const filteredArticles = artStatusFilter === 'All' ? articles
    : articles.filter(a => {
        if (artStatusFilter === 'Live') return a.status === 'published';
        return a.status === artStatusFilter.toLowerCase();
      });

  const artCounts = {
    All: articles.length,
    Review: articles.filter(a => a.status === 'review').length,
    Approved: articles.filter(a => a.status === 'approved').length,
    Live: articles.filter(a => a.status === 'published').length,
    Draft: articles.filter(a => a.status === 'draft').length,
    Rejected: articles.filter(a => a.status === 'rejected').length,
  };

  const targetSite = sites.find(s => s.id === campaign?.target_site_id);

  // ── loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-[#9CA3AF] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF642D]" />
        <span className="text-sm font-medium">Loading project…</span>
      </div>
    );
  }
  if (!campaign) return null;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 sm:px-6">

      {/* ── CLEAN HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/campaigns')}
            className="group flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all mb-2"
          >
            <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> 
            Back to Projects
          </button>
          <h1 className="text-4xl font-black text-foreground tracking-tighter flex items-center gap-3">
            {campaign.name}
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </h1>
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground pt-1">
             <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> {targetSite?.name || 'Local Sync'}</span>
             <span className="text-border">|</span>
             <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> {campaign.niche}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-full px-6 border-border hover:border-primary/50 text-foreground text-xs font-bold"
            onClick={async () => {
              const newStatus = campaign.status === 'active' ? 'paused' : 'active';
              setActionLoading(prev => ({ ...prev, 'toggle-status': 'loading' }));
              try {
                await apiClient.put(`/campaigns/${projectId}`, { status: newStatus });
                await fetchData();
              } catch (err) {
                console.error(err);
              } finally {
                setActionLoading(prev => { const n = { ...prev }; delete n['toggle-status']; return n; });
              }
            }}
            disabled={actionLoading['toggle-status'] === 'loading'}
          >
            {actionLoading['toggle-status'] === 'loading' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : campaign.status === 'active' ? (
              <Pause className="w-4 h-4 mr-2 text-amber-500" />
            ) : (
              <Play className="w-4 h-4 mr-2 text-emerald-500" />
            )}
            {campaign.status === 'active' ? 'Pause Engine' : 'Resume Engine'}
          </Button>

          <Button
            variant="outline"
            className="rounded-full px-6 border-border hover:border-primary/50 text-foreground text-xs font-bold"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2" /> Project Settings
          </Button>
          <Button
            className="rounded-full px-6 bg-foreground text-background hover:bg-primary transition-all text-xs font-bold shadow-xl"
            onClick={() => handleGenerate(Array.from(selectedKeywordIds))}
            disabled={selectedKeywordIds.size === 0 || isGenerating}
            isLoading={isGenerating}
          >
            <Zap className="w-4 h-4 mr-2" /> 
            Generate ({selectedKeywordIds.size})
          </Button>
        </div>
      </div>

      {/* ── CAMPAIGN PULSE (Modern Stats) ── */}
      <div className="bg-white rounded-[32px] p-8 border border-border shadow-sm overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
              <span>Campaign Pulse</span>
              <span className="text-foreground">{Math.round(progress)}% Complete</span>
            </div>
            <div className="h-3 w-full bg-secondary/30 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-primary shadow-[0_0_20px_rgba(255,100,45,0.4)]" 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 md:pl-12 border-l border-border/0 md:border-l-border">
            {[
              { label: 'Topics', value: keywords.length, icon: Tag },
              { label: 'Writing', value: keywords.filter(k => k.status === 'in_progress').length, icon: RefreshCw },
              { label: 'Live', value: artCounts.Live, icon: CheckCircle2 },
            ].map(s => (
              <div key={s.label} className="text-center md:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{s.label}</p>
                <p className="text-2xl font-black text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WORKSPACE SWITCHER ── */}
      <div className="flex items-center justify-center pt-4">
        <div className="bg-secondary/20 p-1.5 rounded-2xl border border-border flex items-center gap-1">
          <button
            onClick={() => setView('topics')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              view === 'topics' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Topics
          </button>
          <button
            onClick={() => setView('library')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              view === 'library' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Library className="w-4 h-4" /> Library
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <AnimatePresence mode="wait">
        {view === 'topics' ? (
          <motion.div
            key="topics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Topics Workspace Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-border shadow-sm">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                 <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      value={topicSearch}
                      onChange={e => setTopicSearch(e.target.value)}
                      placeholder="Search topics..."
                      className="w-full bg-secondary/20 border-none rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                 </div>
                 <Button 
                   onClick={() => setShowClusterForm(!showClusterForm)}
                   variant="outline" 
                   className="rounded-xl border-border px-4 py-2.5 text-xs font-bold"
                 >
                   <Layers className="w-4 h-4 mr-2" /> Cluster
                 </Button>
              </div>

              <form onSubmit={handleQuickAddTopic} className="flex items-center gap-2 w-full sm:w-auto">
                 <input 
                    value={newTopic}
                    onChange={e => setNewTopic(e.target.value)}
                    placeholder="Fast add topic..."
                    className="flex-1 sm:w-64 bg-secondary/10 border-border border rounded-xl px-4 py-2.5 text-xs font-medium focus:border-primary outline-none"
                 />
                 <Button type="submit" isLoading={isAddingTopic} className="rounded-xl px-4 py-2.5 bg-primary text-white">
                   <Plus className="w-4 h-4" />
                 </Button>
              </form>
            </div>

            {/* Topics List Area */}
            <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden min-h-[400px]">
              {showClusterForm && (
                <div className="p-6 bg-secondary/5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">New Cluster</span>
                    <input 
                      autoFocus
                      value={newClusterName}
                      onChange={e => setNewClusterName(e.target.value)}
                      placeholder="Enter cluster name..."
                      className="bg-white border border-border rounded-xl px-4 py-2 text-xs font-medium outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setShowClusterForm(false)} variant="ghost" className="text-xs">Cancel</Button>
                    <Button onClick={handleCreateCluster} isLoading={isCreatingCluster} className="bg-primary text-white text-xs px-6">Save Cluster</Button>
                  </div>
                </div>
              )}

              <div className="divide-y divide-border/50">
                {keywords.length === 0 ? (
                  <div className="py-24 text-center">
                    <div className="w-16 h-16 bg-secondary/20 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                      <Tag className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-black text-lg text-foreground">No topics yet</h3>
                    <p className="text-sm text-muted-foreground">Start your campaign by adding some keywords above.</p>
                  </div>
                ) : (
                  <div>
                    {/* Clustered groups */}
                    {clusters.map(cl => {
                      const kws = groupedKeywords[cl.id] || [];
                      if (!kws.length) return null;
                      const color = clusterColorMap[cl.id];
                      const collapsed = collapsedClusters.has(cl.id);
                      return (
                        <div key={cl.id} className="group">
                          <button
                            onClick={() => toggleCluster(cl.id)}
                            className="w-full flex items-center justify-between px-8 py-5 hover:bg-secondary/5 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-xs font-black uppercase tracking-[0.15em] text-foreground">{cl.name}</span>
                              <span className="text-[10px] font-bold text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full">{kws.length}</span>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? '' : 'rotate-90'}`} />
                          </button>
                          {!collapsed && (
                            <div className="bg-secondary/[0.02] border-t border-border/30">
                              {kws.map(k => (
                                <KeywordRow 
                                  key={k.id} k={k} articles={articles} 
                                  selectedKeywordIds={selectedKeywordIds} 
                                  handleToggleSelect={handleToggleSelect} 
                                  handleDeleteKeyword={handleDeleteKeyword} 
                                  openEditor={(art) => { setSelectedArticle(art); setIsEditorOpen(true); }} 
                                  onGenerate={() => handleGenerate([k.id])}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Unclustered */}
                    {(groupedKeywords['__none__'] || []).length > 0 && (
                      <div className="group">
                         <div className="px-8 py-5 flex items-center gap-4 border-b border-border/30">
                            <span className="w-3 h-3 rounded-full bg-border" />
                            <span className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground">Unclustered Pipeline</span>
                            <span className="text-[10px] font-bold text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full">{groupedKeywords['__none__'].length}</span>
                         </div>
                         <div className="">
                            {(groupedKeywords['__none__'] || []).map(k => (
                              <KeywordRow 
                                key={k.id} k={k} articles={articles} 
                                selectedKeywordIds={selectedKeywordIds} 
                                handleToggleSelect={handleToggleSelect} 
                                handleDeleteKeyword={handleDeleteKeyword} 
                                openEditor={(art) => { setSelectedArticle(art); setIsEditorOpen(true); }} 
                                onGenerate={() => handleGenerate([k.id])}
                              />
                            ))}
                         </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Library Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {ART_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setArtStatusFilter(tab)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                    artStatusFilter === tab
                      ? 'bg-foreground text-background border-foreground shadow-lg shadow-foreground/10'
                      : 'bg-white text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {tab} <span className="ml-1.5 opacity-50">{artCounts[tab]}</span>
                </button>
              ))}
            </div>

            {/* Articles Grid */}
            {filteredArticles.length === 0 ? (
              <div className="bg-white rounded-[32px] border border-border shadow-sm py-24 text-center">
                 <div className="w-16 h-16 bg-secondary/20 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                    <FileEdit className="w-8 h-8 text-muted-foreground" />
                 </div>
                 <h3 className="font-black text-lg text-foreground">No content found</h3>
                 <p className="text-sm text-muted-foreground">Try selecting a different filter or generate some content.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map(art => {
                  const kw = keywords.find(k => k.id === art.keyword_id);
                  const statusInfo = STATUS_ART[art.status] || STATUS_ART.draft;
                  const loading = actionLoading[art.id];
                  return (
                    <div 
                      key={art.id} 
                      className="group bg-white rounded-[32px] border border-border p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all flex flex-col h-full"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => { setSelectedArticle(art); setIsEditorOpen(true); }} className="p-2 hover:bg-secondary/20 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                              <FileEdit className="w-4 h-4" />
                           </button>
                           {art.status === 'published' && art.published_url && (
                             <a href={art.published_url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-secondary/20 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                               <ExternalLink className="w-4 h-4" />
                             </a>
                           )}
                        </div>
                      </div>

                      <h3 className="text-lg font-black text-foreground tracking-tight line-clamp-2 leading-tight mb-3 group-hover:text-primary transition-colors">
                        {art.title || 'Draft Article'}
                      </h3>
                      
                      {art.meta_description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-6">
                          {art.meta_description}
                        </p>
                      )}

                      <div className="mt-auto pt-6 border-t border-border/50 flex items-center justify-between">
                         <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /> {art.word_count || 0}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {readingTime(art.word_count)}</span>
                         </div>
                         
                         {/* Quick Actions for Library Card */}
                         <div className="flex items-center gap-1.5">
                            {art.status === 'review' && (
                              <button 
                                onClick={() => handleApprove(art.id)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                                title="Approve & Publish"
                              >
                                {loading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                            )}
                            <button 
                              onClick={() => { setSelectedArticle(art); setIsEditorOpen(true); }}
                              className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-all"
                            >
                              Open
                            </button>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI PRE-FLIGHT MODAL REMOVED FOR FRICTIONLESS WORKFLOW */}

      {/* ── EDITOR MODAL ── */}
      <Modal isOpen={isEditorOpen} onClose={() => { setIsEditorOpen(false); setSelectedArticle(null); }} maxWidth="max-w-[1400px] w-full" noPadding>
        {selectedArticle && (
          <ArticleEditor
            article={selectedArticle}
            onClose={() => { setIsEditorOpen(false); setSelectedArticle(null); }}
            onUpdate={() => { setIsEditorOpen(false); fetchData(); }}
            onRegenerate={() => handleGenerate([selectedArticle.keyword_id], selectedArticle.id)}
          />
        )}
      </Modal>

      {/* ── SETTINGS MODAL ── */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title={`Config: ${campaign.name}`} maxWidth="max-w-xl w-full">
        <form onSubmit={handleSubmitSettings} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] uppercase font-bold text-[#9CA3AF] mb-1">Project Name</label>
              <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-[#E5E8EB] rounded-lg px-4 py-2 text-sm text-[#1A1D23] focus:outline-none focus:border-[#FF642D]" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] uppercase font-bold text-[#9CA3AF] mb-1">Niche / Topic</label>
              <textarea required rows={2} value={formData.niche} onChange={e => setFormData({ ...formData, niche: e.target.value })}
                className="w-full border border-[#E5E8EB] rounded-lg px-4 py-2 text-sm text-[#1A1D23] focus:outline-none focus:border-[#FF642D] resize-none"
                placeholder="Describe the niche…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#9CA3AF] mb-1">Schedule</label>
              <select value={formData.schedule_type} onChange={e => setFormData({ ...formData, schedule_type: e.target.value })}
                className="w-full border border-[#E5E8EB] rounded-lg px-4 py-2 text-sm text-[#1A1D23] focus:outline-none focus:border-[#FF642D]">
                <option value="manual">Manual</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#9CA3AF] mb-1">Target Site</label>
              <select value={formData.target_site_id} onChange={e => setFormData({ ...formData, target_site_id: e.target.value })}
                className="w-full border border-[#E5E8EB] rounded-lg px-4 py-2 text-sm text-[#1A1D23] focus:outline-none focus:border-[#FF642D]">
                <option value="">None</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 bg-[#FFF5F0] rounded-xl border border-[#FDDDD0] space-y-3">
            <h4 className="text-[10px] font-black text-[#FF642D] uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3" /> Campaign Directives
            </h4>
            <p className="text-[10px] text-[#9CA3AF] leading-relaxed">
              Describe how the AI should write for this campaign. e.g. "Focus on packing tips based on weather and culture. Be direct."
            </p>
            <textarea value={formData.prompt_template} onChange={e => setFormData({ ...formData, prompt_template: e.target.value })}
              className="w-full h-28 bg-white border border-[#E5E8EB] rounded-xl p-4 text-xs font-mono text-emerald-700 focus:outline-none focus:border-[#FF642D] resize-none custom-scrollbar"
              placeholder="Describe how articles should be written…" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#9CA3AF] mb-1">Words</label>
              <input type="number" value={formData.target_word_count} onChange={e => setFormData({ ...formData, target_word_count: parseInt(e.target.value) })}
                className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm text-[#1A1D23] focus:outline-none focus:border-[#FF642D]" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#9CA3AF] mb-1">Style</label>
              <select value={formData.article_style} onChange={e => setFormData({ ...formData, article_style: e.target.value })}
                className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm text-[#1A1D23] focus:outline-none focus:border-[#FF642D]">
                <option value="informative">Informative</option>
                <option value="conversational">Conversational</option>
                <option value="technical">Technical</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#9CA3AF] mb-1">Post Type</label>
              <select value={formData.target_cpt} onChange={e => setFormData({ ...formData, target_cpt: e.target.value })}
                className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm text-[#1A1D23] focus:outline-none focus:border-[#FF642D]">
                {postTypes.map(pt => <option key={pt.slug} value={pt.slug}>{pt.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmittingSettings} className="bg-[#1A1D23] hover:bg-[#FF642D]">Save Config</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── KeywordRow sub-component ──────────────────────────────────────────────────
function KeywordRow({ k, articles, selectedKeywordIds, handleToggleSelect, onGenerate, handleDeleteKeyword, openEditor }: {
  k: any; articles: any[]; selectedKeywordIds: Set<string>;
  handleToggleSelect: (id: string) => void;
  onGenerate: () => void;
  handleDeleteKeyword: (id: string) => void;
  openEditor: (art: any) => void;
}) {
  const art = articles.find(a => a.keyword_id === k.id);
  const isPending = k.status === 'pending';
  const isWriting = k.status === 'in_progress';
  const statusInfo = STATUS_KW[k.status] || STATUS_KW.pending;
  const selected = selectedKeywordIds.has(k.id);

  return (
    <div className={`group flex items-center gap-6 px-8 py-4 hover:bg-white transition-all border-b border-border/30 last:border-0 ${selected ? 'bg-primary/[0.03]' : ''}`}>
      {/* Selection Control */}
      <div className="flex items-center justify-center w-6 h-6 shrink-0">
        {isPending ? (
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => handleToggleSelect(k.id)}
              className="peer w-5 h-5 rounded-lg border-2 border-border text-primary focus:ring-primary focus:ring-offset-0 transition-all cursor-pointer appearance-none checked:bg-primary checked:border-primary"
            />
            <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
          </div>
        ) : isWriting ? (
          <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
          </div>
        ) : (
          <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${k.status === 'done' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            {k.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-rose-500" />}
          </div>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{k.main_keyword}</p>
          {k.is_pillar && (
            <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary px-2 py-0.5 rounded-md">Pillar</span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="opacity-50">{k.intent}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="opacity-50">{k.difficulty}</span>
          </div>
          {art && (
            <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${STATUS_ART[art.status]?.cls || ''}`}>
              {STATUS_ART[art.status]?.label || art.status}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions (Hover Only) */}
      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
        {art ? (
          <button
            onClick={() => openEditor(art)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-secondary/50 text-foreground hover:bg-foreground hover:text-background transition-all border border-border/50"
          >
            <FileEdit className="w-3.5 h-3.5" /> Edit
          </button>
        ) : isPending ? (
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
          >
            <Play className="w-3.5 h-3.5" /> Write
          </button>
        ) : null}
        
        <button
          onClick={() => handleDeleteKeyword(k.id)}
          className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-50 transition-all"
          title="Delete Topic"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
