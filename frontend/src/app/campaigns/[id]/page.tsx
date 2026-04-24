'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, Plus, Eye, CheckCircle2, FileEdit, Settings,
  Zap, Loader2, Play, Trash2, Globe, XCircle, RotateCcw,
  FolderOpen, Tag, Clock, BarChart2, ExternalLink, Check,
  X, RefreshCw, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import apiClient from '@/services/apiClient';

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

  // preflight
  const [isPreFlightOpen, setIsPreFlightOpen]     = useState(false);
  const [promptTemplate, setPromptTemplate]       = useState('');
  const [targetIdsForGen, setTargetIdsForGen]     = useState<string[]>([]);
  const [isFetchingTemplate, setIsFetchingTemplate] = useState(false);
  const [customVars, setCustomVars]               = useState<Record<string, string>>({});
  const [isRegeneratingArticleId, setIsRegeneratingArticleId] = useState<string | null>(null);

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
  const fetchPromptTemplate = async () => {
    setIsFetchingTemplate(true);
    try {
      const { data } = await apiClient.get(`/workflows/prompt-template?campaign_id=${projectId}`);
      setPromptTemplate(data.template);
    } catch (err) { console.error(err); }
    finally { setIsFetchingTemplate(false); }
  };

  const handleOpenPreFlight = (ids: string[]) => {
    if (!ids.length) return;
    setTargetIdsForGen(ids);
    setIsRegeneratingArticleId(null);
    setCustomVars({ targetLength: String(formData.target_word_count), style: formData.article_style });
    fetchPromptTemplate();
    setIsPreFlightOpen(true);
  };

  const handleRegenerateRequest = (article: any) => {
    setIsEditorOpen(false);
    setIsRegeneratingArticleId(article.id);
    setTargetIdsForGen([article.keyword_id]);
    setCustomVars({ targetLength: String(formData.target_word_count), style: formData.article_style });
    fetchPromptTemplate();
    setIsPreFlightOpen(true);
  };

  const handleGenerate = async () => {
    if (!targetIdsForGen.length) return;
    setIsGenerating(true); setTriggerMsg(null); setIsPreFlightOpen(false);
    try {
      if (isRegeneratingArticleId) {
        await apiClient.post(`/articles/${isRegeneratingArticleId}/regenerate`, {
          prompt_override: promptTemplate,
          target_length: parseInt(customVars['targetLength'] || String(formData.target_word_count)),
          style: customVars['style'] || formData.article_style,
        });
        setTriggerMsg({ msg: `Regenerating article…`, isError: false });
        setIsRegeneratingArticleId(null);
        fetchData();
      } else {
        await apiClient.post('/workflows/trigger', {
          campaign_id: projectId, type: 'article_generation',
          keyword_ids: targetIdsForGen, prompt_override: promptTemplate,
        });
        setTriggerMsg({ msg: `AI writing ${targetIdsForGen.length} article(s)…`, isError: false });
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
    <div className="space-y-5 pb-10">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push('/campaigns')}
            className="text-[11px] uppercase font-bold tracking-widest text-[#9CA3AF] hover:text-[#FF642D] transition-colors flex items-center gap-1 mb-2"
          >
            <ChevronLeft className="w-3 h-3" /> All Projects
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-[#1A1D23] tracking-tight">{campaign.name}</h1>
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
              campaign.status === 'active' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-600 bg-amber-50 border-amber-200'
            }`}>{campaign.status}</span>
            {targetSite && (
              <span className="text-[10px] font-bold flex items-center gap-1 text-[#9CA3AF] bg-[#F3F4F6] border border-[#E5E8EB] px-2.5 py-1 rounded-full">
                <Globe className="w-3 h-3" /> {targetSite.name}
              </span>
            )}
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1.5">{campaign.niche} · {campaign.target_word_count} words · {campaign.article_style}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {triggerMsg && (
            <span className={`px-3 py-2 rounded-xl text-xs font-bold border ${
              triggerMsg.isError ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}>{triggerMsg.msg}</span>
          )}
          <Button
            variant="outline"
            className="flex items-center gap-2 border-[#E5E8EB] text-[#1A1D23] hover:border-[#FF642D] hover:text-[#FF642D] text-xs"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-3.5 h-3.5" /> Config
          </Button>
          <Button
            className="flex items-center gap-2 text-xs bg-[#1A1D23] hover:bg-[#FF642D] transition-colors"
            onClick={() => handleOpenPreFlight(Array.from(selectedKeywordIds))}
            disabled={selectedKeywordIds.size === 0 || isGenerating}
            isLoading={isGenerating}
          >
            <Zap className="w-3.5 h-3.5" />
            Generate ({selectedKeywordIds.size})
          </Button>
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: 'Topics', value: keywords.length, color: '#1A1D23' },
          { label: 'Pending', value: keywords.filter(k => k.status === 'pending').length, color: '#9CA3AF' },
          { label: 'Writing', value: keywords.filter(k => k.status === 'in_progress').length, color: '#FF642D' },
          { label: 'Review', value: artCounts.Review, color: '#D97706' },
          { label: 'Live', value: artCounts.Live, color: '#059669' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#E5E8EB] rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">{s.label}</p>
            <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── DUAL PANE ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">

        {/* ── LEFT: TOPICS QUEUE ── */}
        <div className="bg-white border border-[#E5E8EB] rounded-2xl overflow-hidden flex flex-col" style={{ height: 720 }}>

          {/* pane header */}
          <div className="px-5 pt-5 pb-4 border-b border-[#E5E8EB] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[#1A1D23] uppercase tracking-wider">Topics Queue</h2>
                <span className="text-[10px] font-bold bg-[#F3F4F6] border border-[#E5E8EB] text-[#9CA3AF] px-2 py-0.5 rounded-full">{keywords.length}</span>
              </div>
              <div className="flex items-center gap-2">
                {pendingKeywords.length > 0 && (
                  <button
                    onClick={handleToggleSelectAll}
                    className="text-[10px] font-bold text-[#9CA3AF] hover:text-[#FF642D] transition-colors uppercase tracking-widest"
                  >
                    {selectedKeywordIds.size === pendingKeywords.length ? 'Deselect All' : `Select All (${pendingKeywords.length})`}
                  </button>
                )}
                <button
                  onClick={() => setShowClusterForm(v => !v)}
                  className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] hover:text-[#FF642D] flex items-center gap-1 transition-colors"
                >
                  <Layers className="w-3 h-3" /> Cluster
                </button>
              </div>
            </div>

            {/* cluster create form */}
            {showClusterForm && (
              <form onSubmit={handleCreateCluster} className="flex gap-2 mb-3">
                <input
                  autoFocus
                  value={newClusterName}
                  onChange={e => setNewClusterName(e.target.value)}
                  placeholder="New cluster name…"
                  className="flex-1 text-xs border border-[#E5E8EB] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#FF642D] text-[#1A1D23] placeholder:text-[#9CA3AF]"
                />
                <Button type="submit" isLoading={isCreatingCluster} className="text-xs px-3 py-1.5 h-auto">Create</Button>
                <button type="button" onClick={() => setShowClusterForm(false)} className="p-1.5 text-[#9CA3AF] hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
              </form>
            )}

            {/* quick add */}
            <form onSubmit={handleQuickAddTopic} className="flex gap-2">
              <input
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="Add topic…"
                className="flex-1 text-xs border border-[#E5E8EB] rounded-lg px-3 py-2 focus:outline-none focus:border-[#FF642D] text-[#1A1D23] placeholder:text-[#9CA3AF]"
              />
              {clusters.length > 0 && (
                <select
                  value={newTopicCluster}
                  onChange={e => setNewTopicCluster(e.target.value)}
                  className="text-xs border border-[#E5E8EB] rounded-lg px-2 py-2 focus:outline-none focus:border-[#FF642D] text-[#9CA3AF] bg-white"
                >
                  <option value="">No cluster</option>
                  {clusters.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                </select>
              )}
              <Button type="submit" isLoading={isAddingTopic} className="text-xs px-3 py-2 h-auto shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </form>

            {/* search */}
            {keywords.length > 5 && (
              <input
                value={topicSearch}
                onChange={e => setTopicSearch(e.target.value)}
                placeholder="Filter topics…"
                className="mt-2 w-full text-xs border border-[#E5E8EB] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#FF642D] text-[#1A1D23] placeholder:text-[#9CA3AF]"
              />
            )}
          </div>

          {/* keyword list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {keywords.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF] gap-2">
                <Tag className="w-8 h-8 opacity-30" />
                <p className="text-sm font-bold">No topics yet</p>
                <p className="text-xs">Add one above to start generating</p>
              </div>
            ) : (
              <div>
                {/* clustered groups */}
                {clusters.map(cl => {
                  const kws = groupedKeywords[cl.id] || [];
                  if (!kws.length) return null;
                  const color = clusterColorMap[cl.id];
                  const collapsed = collapsedClusters.has(cl.id);
                  return (
                    <div key={cl.id} className="border-b border-[#F3F4F6]">
                      <button
                        onClick={() => toggleCluster(cl.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F9FAFB] transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1D23]">{cl.name}</span>
                          <span className="text-[10px] text-[#9CA3AF] font-mono">{kws.length}</span>
                        </div>
                        {collapsed ? <ChevronDown className="w-3 h-3 text-[#9CA3AF]" /> : <ChevronUp className="w-3 h-3 text-[#9CA3AF]" />}
                      </button>
                      {!collapsed && (
                        <div className="pb-1">
                          {kws.map(k => <KeywordRow key={k.id} k={k} articles={articles} selectedKeywordIds={selectedKeywordIds} handleToggleSelect={handleToggleSelect} handleOpenPreFlight={handleOpenPreFlight} handleDeleteKeyword={handleDeleteKeyword} openEditor={(art) => { setSelectedArticle(art); setIsEditorOpen(true); }} />)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* unclustered */}
                {(groupedKeywords['__none__'] || []).length > 0 && (
                  <div>
                    {clusters.length > 0 && (
                      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F3F4F6]">
                        <span className="w-2 h-2 rounded-full bg-[#E5E8EB] shrink-0" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#9CA3AF]">Unclustered</span>
                        <span className="text-[10px] text-[#9CA3AF] font-mono">{groupedKeywords['__none__'].length}</span>
                      </div>
                    )}
                    {(groupedKeywords['__none__'] || []).map(k => (
                      <KeywordRow key={k.id} k={k} articles={articles} selectedKeywordIds={selectedKeywordIds} handleToggleSelect={handleToggleSelect} handleOpenPreFlight={handleOpenPreFlight} handleDeleteKeyword={handleDeleteKeyword} openEditor={(art) => { setSelectedArticle(art); setIsEditorOpen(true); }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: CONTENT LIBRARY ── */}
        <div className="bg-white border border-[#E5E8EB] rounded-2xl overflow-hidden flex flex-col" style={{ height: 720 }}>

          {/* pane header */}
          <div className="px-5 pt-5 pb-4 border-b border-[#E5E8EB] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[#1A1D23] uppercase tracking-wider">Content Library</h2>
                <span className="text-[10px] font-bold bg-[#F3F4F6] border border-[#E5E8EB] text-[#9CA3AF] px-2 py-0.5 rounded-full">{articles.length}</span>
              </div>
            </div>
            {/* status tabs */}
            <div className="flex flex-wrap gap-1">
              {ART_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setArtStatusFilter(tab)}
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${
                    artStatusFilter === tab
                      ? 'bg-[#1A1D23] text-white border-[#1A1D23]'
                      : 'bg-[#F3F4F6] text-[#9CA3AF] border-transparent hover:border-[#E5E8EB] hover:text-[#1A1D23]'
                  }`}
                >
                  {tab} {artCounts[tab] > 0 && <span className="ml-1 opacity-70">{artCounts[tab]}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* articles list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {filteredArticles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF] gap-2">
                <FileEdit className="w-8 h-8 opacity-30" />
                <p className="text-sm font-bold">{artStatusFilter === 'All' ? 'No articles yet' : `No ${artStatusFilter.toLowerCase()} articles`}</p>
                {artStatusFilter === 'All' && <p className="text-xs">Select topics and hit Generate</p>}
              </div>
            ) : filteredArticles.map(art => {
              const kw = keywords.find(k => k.id === art.keyword_id);
              const statusInfo = STATUS_ART[art.status] || STATUS_ART.draft;
              const loading = actionLoading[art.id];
              return (
                <div key={art.id} className="border border-[#E5E8EB] rounded-xl overflow-hidden hover:border-[#FF642D]/40 hover:shadow-sm transition-all group">
                  {/* card top */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => { setSelectedArticle(art); setIsEditorOpen(true); }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                      {kw && (
                        <span className="text-[10px] font-bold text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full truncate max-w-[180px]">
                          {kw.main_keyword}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-[#1A1D23] line-clamp-2 leading-snug group-hover:text-[#FF642D] transition-colors">
                      {art.title || 'Untitled'}
                    </h3>
                    {art.meta_description && (
                      <p className="text-[11px] text-[#9CA3AF] mt-1 line-clamp-1">{art.meta_description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2.5 text-[10px] text-[#9CA3AF] font-medium">
                      {art.word_count > 0 && <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" />{art.word_count.toLocaleString()} words</span>}
                      {art.word_count > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{readingTime(art.word_count)}</span>}
                      <span>{new Date(art.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>

                  {/* card actions */}
                  <div className="px-4 pb-3 flex items-center gap-2 border-t border-[#F3F4F6] pt-2.5">
                    {art.status === 'review' && (
                      <>
                        <button
                          onClick={() => handleApprove(art.id)}
                          disabled={!!loading}
                          className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          {loading === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Approve & Publish
                        </button>
                        <button
                          onClick={() => handleReject(art.id)}
                          disabled={!!loading}
                          className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50"
                        >
                          {loading === 'reject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          Reject
                        </button>
                      </>
                    )}

                    {art.status === 'draft' && (
                      <button
                        onClick={() => handleSetStatus(art.id, 'review')}
                        disabled={!!loading}
                        className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        {loading === 'review' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                        Submit for Review
                      </button>
                    )}

                    {art.status === 'rejected' && (
                      <button
                        onClick={() => handleSetStatus(art.id, 'review')}
                        disabled={!!loading}
                        className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-[#F3F4F6] text-[#9CA3AF] border border-[#E5E8EB] hover:bg-[#E5E8EB] transition-colors disabled:opacity-50"
                      >
                        {loading === 'review' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        Re-review
                      </button>
                    )}

                    {art.status === 'approved' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200">
                        <Loader2 className="w-3 h-3 animate-spin" /> Publishing…
                      </span>
                    )}

                    {art.status === 'published' && art.published_url && (
                      <a
                        href={art.published_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> View Live
                      </a>
                    )}

                    <button
                      onClick={() => { setSelectedArticle(art); setIsEditorOpen(true); }}
                      className="ml-auto flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-[#F3F4F6] text-[#1A1D23] border border-[#E5E8EB] hover:bg-[#1A1D23] hover:text-white transition-colors"
                    >
                      <FileEdit className="w-3 h-3" /> Open Editor
                    </button>

                    {kw && (
                      <button
                        onClick={() => handleOpenPreFlight([kw.id])}
                        className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-[#FFF5F0] text-[#FF642D] border border-[#FDDDD0] hover:bg-[#FDDDD0] transition-colors"
                        title="Regenerate this article"
                      >
                        <RefreshCw className="w-3 h-3" /> Regen
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── PRE-FLIGHT MODAL ── */}
      <Modal isOpen={isPreFlightOpen} onClose={() => setIsPreFlightOpen(false)} title={isRegeneratingArticleId ? 'Regeneration Override' : 'AI Pre-Flight'} maxWidth="max-w-2xl w-full">
        <div className="space-y-5">
          <div className="bg-[#FFF5F0] border border-[#FDDDD0] p-4 rounded-xl flex gap-3 items-start">
            <Zap className="w-5 h-5 text-[#FF642D] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#1A1D23]">Generation Fine-Tuning</p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Targeting <b className="text-[#1A1D23]">{targetIdsForGen.length}</b> topic(s). Override instructions or leave blank to use campaign defaults.
              </p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2 block">Override Instructions</label>
            <textarea
              value={promptTemplate}
              onChange={e => setPromptTemplate(e.target.value)}
              className="w-full h-28 border border-[#E5E8EB] rounded-xl p-4 text-xs font-mono text-emerald-700 bg-[#F9FAFB] focus:outline-none focus:border-[#FF642D] resize-none"
              placeholder="e.g. Focus on technical specs, keep intro very short…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Word Count</label>
              <input
                type="number"
                value={customVars['targetLength'] || formData.target_word_count}
                onChange={e => setCustomVars({ ...customVars, targetLength: e.target.value })}
                className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm text-[#1A1D23] focus:outline-none focus:border-[#FF642D]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest mb-1">Tone</label>
              <input
                type="text"
                value={customVars['style'] || formData.article_style}
                onChange={e => setCustomVars({ ...customVars, style: e.target.value })}
                className="w-full border border-[#E5E8EB] rounded-lg px-3 py-2 text-sm text-[#1A1D23] focus:outline-none focus:border-[#FF642D]"
                placeholder="informative"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E8EB]">
            <Button variant="ghost" onClick={() => setIsPreFlightOpen(false)}>Cancel</Button>
            <Button className="bg-[#1A1D23] hover:bg-[#FF642D] transition-colors" onClick={handleGenerate} isLoading={isGenerating}>
              <Zap className="w-4 h-4 mr-2" /> Start Generation
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── EDITOR MODAL ── */}
      <Modal isOpen={isEditorOpen} onClose={() => { setIsEditorOpen(false); setSelectedArticle(null); }} maxWidth="max-w-[1400px] w-full" noPadding>
        {selectedArticle && (
          <ArticleEditor
            article={selectedArticle}
            onClose={() => { setIsEditorOpen(false); setSelectedArticle(null); }}
            onUpdate={() => { setIsEditorOpen(false); fetchData(); }}
            onRegenerate={() => handleRegenerateRequest(selectedArticle)}
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
function KeywordRow({ k, articles, selectedKeywordIds, handleToggleSelect, handleOpenPreFlight, handleDeleteKeyword, openEditor }: {
  k: any; articles: any[]; selectedKeywordIds: Set<string>;
  handleToggleSelect: (id: string) => void;
  handleOpenPreFlight: (ids: string[]) => void;
  handleDeleteKeyword: (id: string) => void;
  openEditor: (art: any) => void;
}) {
  const art = articles.find(a => a.keyword_id === k.id);
  const isPending = k.status === 'pending';
  const isWriting = k.status === 'in_progress';
  const statusInfo = STATUS_KW[k.status] || STATUS_KW.pending;
  const selected = selectedKeywordIds.has(k.id);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition-colors group border-b border-[#F3F4F6] last:border-0 ${selected ? 'bg-[#FFF5F0]' : ''}`}>
      {/* checkbox */}
      <div className="w-4 h-4 shrink-0">
        {isPending ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => handleToggleSelect(k.id)}
            className="w-4 h-4 rounded border-[#E5E8EB] text-[#FF642D] focus:ring-[#FF642D] cursor-pointer"
          />
        ) : isWriting ? (
          <Loader2 className="w-4 h-4 text-[#FF642D] animate-spin" />
        ) : k.status === 'done' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <XCircle className="w-4 h-4 text-rose-400" />
        )}
      </div>

      {/* keyword info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#1A1D23] truncate">{k.main_keyword}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {k.is_pillar && <span className="text-[9px] font-black uppercase tracking-widest text-[#FF642D]">Pillar</span>}
          <span className="text-[9px] font-bold text-[#9CA3AF] capitalize">{k.intent}</span>
          <span className="text-[9px] font-bold text-[#9CA3AF] capitalize">{k.difficulty}</span>
          {art && (
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${STATUS_ART[art.status]?.cls || ''}`}>
              {STATUS_ART[art.status]?.label || art.status}
            </span>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {art ? (
          <button
            onClick={() => openEditor(art)}
            className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-[#F3F4F6] text-[#1A1D23] hover:bg-[#1A1D23] hover:text-white transition-colors border border-[#E5E8EB]"
          >
            <Eye className="w-3 h-3" />
          </button>
        ) : isPending ? (
          <button
            onClick={() => handleOpenPreFlight([k.id])}
            className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-[#FFF5F0] text-[#FF642D] hover:bg-[#FF642D] hover:text-white transition-colors border border-[#FDDDD0]"
          >
            <Play className="w-3 h-3" />
          </button>
        ) : null}
        <button
          onClick={() => handleDeleteKeyword(k.id)}
          className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-500 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
