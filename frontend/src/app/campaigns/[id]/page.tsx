'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, Rocket, Plus, Eye, CheckCircle2,
  AlertTriangle, FileEdit, Trash2, Globe, Settings,
  Zap, Clock, Ban, Loader2, Play, Info, Puzzle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ArticleEditor from '@/components/articles/ArticleEditor';
import apiClient from '@/services/apiClient';
import { getSocket } from '@/services/websocketClient';

function readingTime(wordCount: number) {
  const mins = Math.ceil((wordCount || 0) / 200);
  return `${mins} min read`;
}

export default function ProjectHubPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quick Add Topic
  const [newTopic, setNewTopic] = useState('');
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  // Multi-select for Generation
  const [selectedKeywordIds, setSelectedKeywordIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<{msg: string, isError: boolean} | null>(null);

  // Pre-Flight Modal
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState('');
  const [targetIdsForGen, setTargetIdsForGen] = useState<string[]>([]);
  const [isFetchingTemplate, setIsFetchingTemplate] = useState(false);
  const [customVars, setCustomVars] = useState<Record<string, string>>({});
  const [isRegeneratingArticleId, setIsRegeneratingArticleId] = useState<string | null>(null);

  // Parse tags dynamically
  const ignoredTags = ['keyword', 'secondary_keywords', 'custom_instructions'];
  const rawTags = Array.from(new Set([...promptTemplate.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map(m => m[1])));
  const variableTags = rawTags.filter(t => !ignoredTags.includes(t) && !t.startsWith('RANDOM_'));

  // Editor Modal
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmittingSettings, setIsSubmittingSettings] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [postTypes, setPostTypes] = useState<any[]>([
    { slug: 'post', name: 'Posts' },
    { slug: 'page', name: 'Pages' },
  ]);
  const [formData, setFormData] = useState({
    name: '',
    niche: '',
    schedule_type: 'manual',
    target_word_count: 1500,
    article_style: 'informative',
    prompt_template: '',
    target_site_id: '',
    target_cpt: 'post',
    cron_time: '09:00',
    cron_timezone: 'Africa/Casablanca',
    posts_per_run: 1,
  });

  const fetchData = async () => {
    try {
      const [cRes, kRes, aRes, sRes] = await Promise.all([
        apiClient.get(`/campaigns`),
        apiClient.get(`/keywords?campaign_id=${projectId}`),
        apiClient.get(`/articles`),
        apiClient.get(`/sites`)
      ]);

      const c = cRes.data.find((camp: any) => camp.id === projectId);
      if (!c) {
        router.push('/campaigns');
        return;
      }
      setCampaign(c);
      setSites(sRes.data);
      
      // Sync form data for settings
      setFormData({
        name: c.name,
        niche: c.niche,
        schedule_type: c.schedule_type,
        target_word_count: c.target_word_count || 1500,
        article_style: c.article_style || 'informative',
        prompt_template: c.prompt_template || '',
        target_site_id: c.target_site_id || '',
        target_cpt: c.target_cpt || 'post',
        cron_time: c.cron_time || '09:00',
        cron_timezone: c.cron_timezone || 'Africa/Casablanca',
        posts_per_run: c.posts_per_run || 1,
      });
      
      const projectKeywords = kRes.data.filter((k: any) => k.campaign_id === projectId);
      setKeywords(projectKeywords);
      
      const projectKeywordIds = new Set(projectKeywords.map((k: any) => k.id));
      setArticles(aRes.data.filter((a: any) => projectKeywordIds.has(a.keyword_id)));
      
    } catch (err) {
      console.error('Failed to fetch hub data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (formData.target_site_id) {
      const selectedSite = sites.find((s) => s.id === formData.target_site_id);
      if (selectedSite?.type === 'wordpress') {
        apiClient
          .get(`/sites/${formData.target_site_id}/post-types`)
          .then((res) => setPostTypes(res.data))
          .catch(() => setPostTypes([{ slug: 'post', name: 'Posts' }, { slug: 'page', name: 'Pages' }]));
      } else {
        setPostTypes([{ slug: 'post', name: 'Posts' }]);
      }
    }
  }, [formData.target_site_id, sites]);

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingSettings(true);
    try {
      await apiClient.put(`/campaigns/${projectId}`, formData);
      setIsSettingsOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSubmittingSettings(false);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = getSocket();
    const refresh = () => fetchData();
    socket.on('keyword:statusChanged', refresh);
    socket.on('article:created', refresh);
    socket.on('article:statusChanged', refresh);
    socket.on('workflow:statusChanged', refresh);

    return () => {
      socket.off('keyword:statusChanged');
      socket.off('article:created');
      socket.off('article:statusChanged');
      socket.off('workflow:statusChanged');
    };
  }, [projectId]);

  const fetchPromptTemplate = async () => {
    setIsFetchingTemplate(true);
    try {
      const { data } = await apiClient.get(`/workflows/prompt-template?campaign_id=${projectId}`);
      setPromptTemplate(data.template);
    } catch (err) {
      console.error('Failed to fetch prompt template', err);
    } finally {
      setIsFetchingTemplate(false);
    }
  };

  const handleOpenPreFlight = (ids: string[]) => {
    if (ids.length === 0) return;
    setTargetIdsForGen(ids);
    setIsRegeneratingArticleId(null);
    setCustomVars({
      targetLength: String(formData.target_word_count),
      style: formData.article_style
    });
    fetchPromptTemplate();
    setIsPreFlightOpen(true);
  };

  const handleRegenerateRequest = (article: any) => {
    setIsEditorOpen(false);
    setIsRegeneratingArticleId(article.id);
    setTargetIdsForGen([article.keyword_id]);
    setCustomVars({
      targetLength: String(formData.target_word_count),
      style: formData.article_style
    });
    fetchPromptTemplate();
    setIsPreFlightOpen(true);
  };

  const handleQuickAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim()) return;
    setIsAddingTopic(true);
    try {
      await apiClient.post('/keywords', {
        campaign_id: projectId,
        main_keyword: newTopic.trim(),
        intent: 'informational',
        difficulty: 'medium',
        is_pillar: false,
        secondary_keywords: []
      });
      setNewTopic('');
      fetchData();
    } catch (err) {
      console.error('Add topic failed', err);
    } finally {
      setIsAddingTopic(false);
    }
  };

  const handleToggleSelectAll = () => {
    const pendingKeywords = keywords.filter(k => k.status === 'pending');
    if (selectedKeywordIds.size === pendingKeywords.length) {
      setSelectedKeywordIds(new Set());
    } else {
      setSelectedKeywordIds(new Set(pendingKeywords.map(k => k.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedKeywordIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedKeywordIds(next);
  };

  const handleGenerate = async () => {
    if (targetIdsForGen.length === 0) return;
    setIsGenerating(true);
    setTriggerMsg(null);
    setIsPreFlightOpen(false);

    // Variable engine handled securely by backend promptEngine.js
    const finalPrompt = promptTemplate;

    try {
      if (isRegeneratingArticleId) {
         // Single Article Regeneration
         await apiClient.post(`/articles/${isRegeneratingArticleId}/regenerate`, {
             prompt_override: finalPrompt,
             target_length: parseInt(customVars['targetLength'] || String(formData.target_word_count)),
             style: customVars['style'] || formData.article_style
         });
         setTriggerMsg({ msg: `✍️ AI is regenerating the article!`, isError: false });
         setIsRegeneratingArticleId(null);
         fetchData();
      } else {
         // Bulk Article Generation
         await apiClient.post('/workflows/trigger', {
           campaign_id: projectId,
           type: 'article_generation',
           keyword_ids: targetIdsForGen,
           prompt_override: finalPrompt
         });
         setTriggerMsg({ msg: `✍️ AI is now writing ${targetIdsForGen.length} article(s)!`, isError: false });
      }
      setSelectedKeywordIds(new Set());
    } catch (err: any) {
      setTriggerMsg({ msg: err.response?.data?.error || 'Failed to start AI.', isError: true });
    } finally {
      setIsGenerating(false);
      setTimeout(() => setTriggerMsg(null), 5000);
    }
  };

  const handleDeleteKeyword = async (id: string) => {
    if (!confirm('Drop this topic? Any drafted articles for it will vanish too.')) return;
    try {
      await apiClient.delete(`/keywords/${id}`);
      fetchData();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground animate-pulse">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary/50" />
        Loading Project Hub...
      </div>
    );
  }

  if (!campaign) return null;

  const pendingKeywords = keywords.filter(k => k.status === 'pending');
  const generatingKeywords = keywords.filter(k => k.status === 'in_progress');
  const reviewArticles = articles.filter(a => a.status === 'review');

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-[0.98] duration-500 ease-out-quart">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => router.push('/campaigns')}
            className="text-xs uppercase font-bold tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mb-2"
          >
            <ChevronLeft className="w-3 h-3" /> Back to All Projects
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-foreground tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
              {campaign.name}
            </h1>
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
              campaign.status === 'active' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
            }`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{campaign.niche} • Target: {campaign.target_word_count} words/post</p>
        </div>
        
        <div className="flex gap-3 shrink-0">
          {triggerMsg && (
            <div className={`px-4 flex items-center rounded-xl border text-xs font-bold animate-in fade-in slide-in-from-right-4 
              ${triggerMsg.isError ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-primary/10 border-primary/20 text-primary'}`}>
              {triggerMsg.msg}
            </div>
          )}
          <Button variant="outline" className="flex items-center gap-2" title="Project Settings" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-4 h-4" /> Config
          </Button>
          <Button 
            className="flex items-center gap-2 shadow-lg shadow-primary/20" 
            onClick={() => handleOpenPreFlight(Array.from(selectedKeywordIds))}
            disabled={selectedKeywordIds.size === 0 || isGenerating}
            isLoading={isGenerating}
          >
            <Zap className="w-4 h-4" /> 
            Generate Selected ({selectedKeywordIds.size})
          </Button>
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-premium grainy p-4 rounded-2xl border border-border">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Topics</p>
          <p className="text-2xl font-black text-foreground mt-1">{keywords.length}</p>
        </div>
        <div className="glass-premium grainy p-4 rounded-2xl border border-border">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-primary">In Progress</p>
          <p className="text-2xl font-black text-primary mt-1">{generatingKeywords.length}</p>
        </div>
        <div className="glass-premium grainy p-4 rounded-2xl border border-border">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-amber-500">Needs Review</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{reviewArticles.length}</p>
        </div>
        <div className="glass-premium grainy p-4 rounded-2xl border border-border">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-emerald-500">Live Articles</p>
          <p className="text-2xl font-black text-emerald-500 mt-1">
            {articles.filter(a => a.status === 'published').length}
          </p>
        </div>
      </div>

      {/* ── DUAL PANE GRID ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start h-full pb-10">
        
        {/* LEFT PANE: Topics Queue */}
        <div className="glass rounded-3xl border border-border overflow-hidden flex flex-col h-[700px]">
          <div className="p-5 border-b border-border bg-secondary/30 pb-4">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              Topics Queue
              <span className="bg-secondary text-muted-foreground text-[10px] px-2 py-0.5 rounded-full">{keywords.length}</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Add topics here, then generate AI scripts for them.</p>
            
            {/* Quick Add */}
            <form onSubmit={handleQuickAddTopic} className="mt-4 flex gap-2">
              <input 
                type="text" 
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="e.g. Best Hiking Boots..."
                className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
              />
              <Button type="submit" isLoading={isAddingTopic} className="shrink-0 px-4">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {keywords.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <p className="text-sm font-bold">No topics yet.</p>
                <p className="text-xs">Add one above to get started.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Header row for select all */}
                {pendingKeywords.length > 0 && (
                  <div className="flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary cursor-pointer"
                      checked={selectedKeywordIds.size === pendingKeywords.length && pendingKeywords.length > 0}
                      onChange={handleToggleSelectAll}
                    />
                    <span>Select All Pending</span>
                  </div>
                )}
                
                {keywords.map(k => {
                  const hasArticle = articles.some(a => a.keyword_id === k.id);
                  const isGeneratingThis = k.status === 'in_progress';
                  const isDone = k.status === 'done' || hasArticle;

                  return (
                    <label key={k.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group hover:bg-secondary/40 ${
                      selectedKeywordIds.has(k.id) ? 'bg-primary/5 border-primary/30' : 'bg-transparent border-transparent hover:border-border'
                    }`}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        {!isDone && !isGeneratingThis ? (
                          <input 
                            type="checkbox"
                            checked={selectedKeywordIds.has(k.id)}
                            onChange={() => handleToggleSelect(k.id)}
                            className="w-4 h-4 shrink-0 rounded border-border bg-secondary text-primary focus:ring-primary cursor-pointer"
                          />
                        ) : (
                          <div className="w-4 h-4 shrink-0" /> // Spacer
                        )}
                        <div className="truncate">
                          <p className={`text-sm font-bold truncate ${isDone ? 'text-muted-foreground line-through opacity-70' : 'text-foreground'}`}>
                            {k.main_keyword}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {k.is_pillar && <span className="text-[9px] uppercase font-black tracking-widest text-primary">Pillar</span>}
                            <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">{k.difficulty}</span>
                            <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground capitalize">• {k.intent}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        {isGeneratingThis ? (
                          <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin" /> Writing...
                          </div>
                        ) : isDone ? (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        ) : (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={(e) => { e.preventDefault(); handleOpenPreFlight([k.id]); }}
                              title="Generate this specific article"
                            >
                              <Play className="w-4 h-4 ml-0.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500 transition-all"
                              onClick={(e) => { e.preventDefault(); handleDeleteKeyword(k.id); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Content Library */}
        <div className="glass rounded-3xl border border-border overflow-hidden flex flex-col h-[700px]">
          <div className="p-5 border-b border-border bg-secondary/30 pb-4">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              Generated Content
              <span className="bg-secondary text-muted-foreground text-[10px] px-2 py-0.5 rounded-full">{articles.length}</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Review drafts, approve, and push to your integration.</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {articles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <FileEdit className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm font-bold">No articles generated.</p>
                <p className="text-xs">Select topics on the left and hit generate.</p>
              </div>
            ) : (
              articles.map(art => {
                const isReview = art.status === 'review';
                const isLive = art.status === 'published';
                return (
                  <div key={art.id} onClick={() => { setSelectedArticle(art); setIsEditorOpen(true); }} className="relative group flex flex-col p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer">
                    <div className={`absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      isReview ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 
                      isLive ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 
                      'text-muted-foreground border-border'
                    }`}>
                      {art.status}
                    </div>

                    <h3 className="font-bold text-sm text-foreground pr-20 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {art.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {art.meta_description || 'No meta description provided...'}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1 group-hover:text-primary transition-colors"><Eye className="w-3 h-3" /> Open Editor</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Pre-Flight Transparency Modal */}
      {/* Pre-Flight Fine-Tuning Modal */}
      <Modal
        isOpen={isPreFlightOpen}
        onClose={() => setIsPreFlightOpen(false)}
        title={isRegeneratingArticleId ? "AI Regeneration Override" : "AI Pre-Flight Review"}
        maxWidth="max-w-2xl w-full"
      >
        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex gap-4 items-start">
            <div className="w-10 h-10 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Generation Fine-Tuning</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Targeting <b>{targetIdsForGen.length}</b> topic(s). Add any one-off specific instructions for this run, or leave blank to use campaign defaults.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">One-Off Override Instructions</label>
              <textarea
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
                className="w-full h-32 bg-secondary/30 border border-border rounded-xl p-4 text-sm font-mono text-emerald-400 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 resize-none custom-scrollbar shadow-inner"
                placeholder="e.g. Focus purely on technical specs, keep the intro exceptionally short..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Target Word Count</label>
                <input
                  type="number"
                  value={customVars['targetLength'] || formData.target_word_count}
                  onChange={(e) => setCustomVars({...customVars, targetLength: e.target.value})}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Tone & Voice</label>
                <input
                  type="text"
                  value={customVars['style'] || formData.article_style}
                  onChange={(e) => setCustomVars({...customVars, style: e.target.value})}
                  placeholder="e.g. Professional"
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setIsPreFlightOpen(false)}>Cancel</Button>
            <Button 
              className="px-8 shadow-lg shadow-primary/20" 
              onClick={handleGenerate}
              isLoading={isGenerating}
            >
              Start AI Generation <Zap className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </Modal>

      {/* Article Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setSelectedArticle(null); }}
        title="Review Article"
        maxWidth="max-w-7xl w-full"
      >
        {selectedArticle && (
          <ArticleEditor
            article={selectedArticle}
            onUpdate={() => {
              setIsEditorOpen(false);
              fetchData();
            }}
            onRegenerate={() => handleRegenerateRequest(selectedArticle)}
          />
        )}
      </Modal>

      {/* Project Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={`Project Hub Config: ${campaign.name}`}
      >
        <form onSubmit={handleSubmitSettings} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Project Name</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">What is this project about? (Niche/Topic)</label>
              <textarea
                required
                rows={2}
                value={formData.niche}
                onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary custom-scrollbar"
                placeholder="Describe the niche..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Schedule</label>
              <select
                value={formData.schedule_type}
                onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="manual">Manual</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Target Site</label>
              <select
                value={formData.target_site_id}
                onChange={(e) => setFormData({ ...formData, target_site_id: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">None Selected</option>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-4">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3" /> Campaign Directives (Fine-tuning)
            </h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Describe exactly how you want the AI to write this campaign's articles. 
              Keep it simple: e.g. "Focus on packing tips based on weather and culture. Be direct and avoid generic history."
            </p>
            <textarea
              value={formData.prompt_template}
              onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
              className="w-full h-32 bg-black/40 border border-border rounded-xl p-4 text-xs font-mono text-emerald-400/90 focus:ring-1 focus:ring-primary outline-none custom-scrollbar leading-relaxed"
              placeholder="Describe how the article should be written..."
            />
          </div>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-4">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3" /> Writing Config
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Words</label>
                <input
                  type="number"
                  value={formData.target_word_count}
                  onChange={(e) => setFormData({ ...formData, target_word_count: parseInt(e.target.value) })}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Style</label>
                <select
                  value={formData.article_style}
                  onChange={(e) => setFormData({ ...formData, article_style: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="informative">Informative</option>
                  <option value="conversational">Conversational</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Post Type</label>
              <select
                value={formData.target_cpt}
                onChange={(e) => setFormData({ ...formData, target_cpt: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm"
              >
                {postTypes.map((pt) => <option key={pt.slug} value={pt.slug}>{pt.name}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmittingSettings}>Save Project Hub Config</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
