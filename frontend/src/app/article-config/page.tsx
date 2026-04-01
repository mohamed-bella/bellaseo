'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Sparkles, Save, Globe, Layout, User, BookOpen, 
  Search, ChevronRight, Check, AlertCircle, Info, 
  Copy, Eye, Code, Zap, Target, FileText, 
  Trash2, Plus, ArrowRight, Settings, ExternalLink,
  MessageSquare, Layers, Wand2, Monitor, Database
} from 'lucide-react';
import Button from '@/components/ui/Button';
import apiClient from '@/services/apiClient';
import { toast } from 'sonner';

/**
 * ============================================================
 *  CONFIGURATION STUDIO — v2 (Apple-Grade Redesign)
 * ============================================================
 *  - High-precision control over the AI Generation Pipeline.
 *  - Support for Global, Campaign, and Site-level overrides.
 *  - Author Persona management for EEAT depth.
 *  - Real-time "Prompt Logic" compiler.
 * ============================================================
 */

// ─── Default Templates & Constants ──────────────────────────────────────────

const DEFAULT_VARIABLES = [
  'keyword', 'authorName', 'authorBio', 'targetAudience', 'siteName', 
  'niche', 'intent', 'tone', 'language', 'targetLength', 
  'internalLinks', 'externalLinks', 'researchBlock', 
  'faqDirective', 'conclusionDirective', 'campaignDirectives'
];

type ConfigScope = 'global' | 'campaign' | 'site';

// ─── Utility Components ───────────────────────────────────────────────────────

const Badge = ({ children, color = 'primary' }: { children: React.ReactNode, color?: string }) => {
  const colors: Record<string, string> = {
    primary: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    violet: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  };
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${colors[color] || colors.primary}`}>
      {children}
    </span>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle, colorClass }: any) => (
  <div className="flex items-center gap-4 mb-8">
    <div className={`p-3 rounded-2xl ${colorClass || 'bg-indigo-500/10 text-indigo-500'} border border-current/20 shadow-sm`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="text-xs font-medium text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ─── Main Application ─────────────────────────────────────────────────────────

export default function ArticleConfigPage() {
  // ── State: Scopes & Data ──
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [activeScope, setActiveScope] = useState<ConfigScope>('global');
  const [activeId, setActiveId] = useState<string>('global');
  
  // ── State: Configurations ──
  const [globalConfig, setGlobalConfig] = useState<any>({});
  const [campaignConfigs, setCampaignConfigs] = useState<Record<string, any>>({});
  const [siteConfigs, setSiteConfigs] = useState<Record<string, any>>({});
  
  // ── State: UI ──
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'author' | 'settings'>('prompt');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [tabIndex, setTabIndex] = useState(0); // 0: Editor, 1: Live Preview

  // ── Load Initial Data ──
  useEffect(() => {
    const init = async () => {
      try {
        const [settings, camps, sts] = await Promise.all([
          apiClient.get('/settings'),
          apiClient.get('/campaigns'),
          apiClient.get('/sites')
        ]);
        
        setGlobalConfig(settings.data.article_config || {});
        setCampaigns(camps.data);
        setSites(sts.data);
        
        const cMap: any = {};
        camps.data.forEach((c: any) => { if (c.article_config) cMap[c.id] = c.article_config; });
        setCampaignConfigs(cMap);

        const sMap: any = {};
        sts.data.forEach((s: any) => { 
          sMap[s.id] = { 
            author_profile: s.author_profile || {}, 
            master_prompt_template: s.master_prompt_template || null 
          }; 
        });
        setSiteConfigs(sMap);

      } catch (err) {
        toast.error('Initialization failed. Check backend connection.');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // ── Computed: Current working document ──
  const currentDoc = useMemo(() => {
    if (activeScope === 'global') return globalConfig;
    if (activeScope === 'campaign') return campaignConfigs[activeId] || {};
    return siteConfigs[activeId] || {};
  }, [activeScope, activeId, globalConfig, campaignConfigs, siteConfigs]);

  const updateDoc = (updates: any) => {
    if (activeScope === 'global') {
      setGlobalConfig({ ...globalConfig, ...updates });
    } else if (activeScope === 'campaign') {
      setCampaignConfigs({ ...campaignConfigs, [activeId]: { ...campaignConfigs[activeId], ...updates } });
    } else {
      setSiteConfigs({ ...siteConfigs, [activeId]: { ...siteConfigs[activeId], ...updates } });
    }
  };

  // ── Actions ──
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeScope === 'global') {
        await apiClient.post('/settings', { key: 'article_config', value: globalConfig });
      } else if (activeScope === 'campaign') {
        await apiClient.put(`/campaigns/${activeId}`, { article_config: campaignConfigs[activeId] });
      } else {
        const payload = siteConfigs[activeId];
        await apiClient.put(`/sites/${activeId}`, { 
          author_profile: payload.author_profile,
          master_prompt_template: payload.master_prompt_template
        });
      }
      toast.success(`${activeScope.charAt(0).toUpperCase() + activeScope.slice(1)} settings synced successfully.`);
    } catch (err) {
      toast.error('Sync failed. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('master-prompt-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const token = `{{${variable}}}`;
    const newValue = text.substring(0, start) + token + text.substring(end);
    
    if (activeScope === 'site') {
      updateDoc({ master_prompt_template: newValue });
    } else {
      updateDoc({ master_prompt_template: newValue });
    }

    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 10);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-pulse">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20 shadow-2xl">
          <Wand2 className="w-8 h-8 text-indigo-500 animate-spin-slow" />
        </div>
        <div className="text-center">
          <p className="text-lg font-black tracking-tight text-foreground">Studio Engine Initializing</p>
          <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Unified Command Post</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto min-h-[90vh] flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* ── Top Command Bar ── */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 md:p-8 card-premium border-indigo-500/10 bg-indigo-500/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="flex items-center gap-5 relative">
          <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-500/30 shadow-2xl shadow-indigo-500/10 rounded-[22px] flex items-center justify-center">
            <Zap className="w-7 h-7 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-3xl font-black tracking-tighter text-foreground">Configuration Studio</h1>
               <Badge color="violet">v2.0 PRO</Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground/80 mt-1 max-w-lg">
              Manage semantic architecture, author EEAT profiles, and recursive generation logic across your entire portfolio.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative">
          <div className="flex items-center bg-background/50 backdrop-blur-md p-1.5 rounded-2xl border border-indigo-500/10 overflow-hidden shadow-sm">
            <button 
              onClick={() => setActiveTab('prompt')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'prompt' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-muted-foreground hover:bg-indigo-500/5 hover:text-indigo-500'}`}
            >
              <Wand2 className="w-4 h-4" /> Directives Engine
            </button>
            <button 
              onClick={() => setActiveTab('author')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'author' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-muted-foreground hover:bg-indigo-500/5 hover:text-indigo-500'}`}
            >
              <User className="w-4 h-4" /> Author Profiles
            </button>
          </div>

          <Button onClick={handleSave} isLoading={isSaving} className="h-12 px-8 bg-foreground text-background hover:bg-foreground/90 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-transform active:scale-95">
            <Save className="w-4 h-4 mr-2" />
            Sync Lifecycle
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        
        {/* ── Left Sidebar: Scope Navigation ── */}
        <aside className="space-y-6">
          <div className="card-premium p-6 border-indigo-500/10">
            <div className="flex items-center justify-between mb-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Monitor className="w-3 h-3" /> Navigation Hierarchy
              </div>
              <Badge color="indigo">Unified</Badge>
            </div>
            
            <div className="space-y-2">
              <button 
                onClick={() => { setActiveScope('global'); setActiveId('global'); }}
                className={`w-full group flex items-center gap-4 p-4 rounded-2xl text-left transition-all border ${activeScope === 'global' ? 'bg-indigo-500/10 border-indigo-500/30' : 'hover:bg-indigo-500/5 border-transparent'}`}
              >
                <div className={`p-2.5 rounded-xl transition-colors ${activeScope === 'global' ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground group-hover:bg-indigo-500/10 group-hover:text-indigo-500'}`}>
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                   <span className={`block text-sm font-black tracking-tight ${activeScope === 'global' ? 'text-indigo-500' : 'text-foreground'}`}>Global Pipeline</span>
                   <span className="text-[10px] uppercase font-bold text-muted-foreground/60">System Defaults</span>
                </div>
              </button>

              <div className="pt-6 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-4">Campaign Scopes</span>
              </div>
              
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
                {campaigns.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => { setActiveScope('campaign'); setActiveId(c.id); }}
                    className={`w-full group flex items-center gap-4 p-3 rounded-xl text-left transition-all border ${activeScope === 'campaign' && activeId === c.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'hover:bg-indigo-500/5 border-transparent'}`}
                  >
                    <div className={`p-2 rounded-lg transition-colors ${activeScope === 'campaign' && activeId === c.id ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className={`block text-xs font-bold truncate ${activeScope === 'campaign' && activeId === c.id ? 'text-indigo-500' : 'text-foreground'}`}>{c.name}</span>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/50 tracking-tight">{c.niche || 'General'}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-6 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-4">Authority Sites</span>
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
                {sites.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => { setActiveScope('site'); setActiveId(s.id); }}
                    className={`w-full group flex items-center gap-4 p-3 rounded-xl text-left transition-all border ${activeScope === 'site' && activeId === s.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'hover:bg-indigo-500/5 border-transparent'}`}
                  >
                    <div className={`p-2 rounded-lg transition-colors ${activeScope === 'site' && activeId === s.id ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className={`block text-xs font-bold truncate ${activeScope === 'site' && activeId === s.id ? 'text-indigo-500' : 'text-foreground'}`}>{s.name}</span>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/50 tracking-tight">{s.type}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card-premium p-6 border-indigo-500/10 bg-indigo-500/5">
             <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">AI Guided</h4>
             </div>
             <p className="text-[10px] font-medium text-muted-foreground/80 mb-4 leading-relaxed">
               The generation engine automatically structures the article and pulls in live SEO data. Simply tell the AI how you want the tone and angle adjusted.
             </p>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="min-w-0 space-y-6">
          
          <div className="card-premium p-8 border-indigo-500/10 bg-indigo-500-[0.02]">
            
            {activeTab === 'prompt' && (
              <div className="animate-in slide-in-from-bottom-2 duration-400">
                <SectionHeader 
                  icon={Code} 
                  title="Campaign Directives" 
                  subtitle="Fine-tune how the AI generates article content for this scope. The base system prompt enforces SEO, structure, and EEAT passively." 
                  colorClass="bg-indigo-500/10 text-indigo-500"
                />

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Fine-Tuning Instructions</label>
                    <textarea 
                      id="master-prompt-editor"
                      value={currentDoc.master_prompt_template || ''}
                      onChange={(e) => updateDoc({ master_prompt_template: e.target.value })}
                      className="w-full h-40 bg-background/50 border border-indigo-500/20 rounded-3xl p-6 font-medium text-sm leading-relaxed text-foreground focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all resize-none custom-scrollbar"
                      placeholder="e.g. Focus on packing tips for hot weather. Use a slightly sarcastic tone. Never recommend wool clothing."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-indigo-500/10">
                    <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mb-2">Target Word Count</div>
                      <input 
                        type="number"
                        value={currentDoc.target_word_count || 1500}
                        onChange={(e) => updateDoc({ target_word_count: parseInt(e.target.value) || 1500 })}
                        className="w-full bg-background border border-indigo-500/20 rounded-lg px-3 py-1.5 text-sm font-bold text-foreground outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mb-2">Tone Directive</div>
                      <input 
                        value={currentDoc.tone || ''}
                        onChange={(e) => updateDoc({ tone: e.target.value })}
                        placeholder="e.g., Professional"
                        className="w-full bg-background border border-indigo-500/20 rounded-lg px-3 py-1.5 text-sm font-bold text-foreground outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mb-2">Language</div>
                      <input 
                        value={currentDoc.language || ''}
                        onChange={(e) => updateDoc({ language: e.target.value })}
                        placeholder="e.g., English"
                        className="w-full bg-background border border-indigo-500/20 rounded-lg px-3 py-1.5 text-sm font-bold text-foreground outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mb-2">Generation Mode</div>
                      <div className="text-sm font-black text-emerald-500 mt-2">Multi-Step High-Res</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'author' && (
              <div className="animate-in slide-in-from-bottom-2 duration-400">
                <SectionHeader 
                  icon={User} 
                  title="Author Persona & EEAT" 
                  subtitle="Define the persona that drives the expertise, authority, and trust indicators in your articles." 
                  colorClass="bg-violet-500/10 text-violet-500"
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Display Name</label>
                      <input 
                        value={currentDoc.author_profile?.name || ''}
                        onChange={(e) => updateDoc({ author_profile: { ...currentDoc.author_profile, name: e.target.value } })}
                        className="w-full bg-background/50 border border-indigo-500/10 rounded-2xl px-6 py-4 font-bold tracking-tight text-foreground focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                        placeholder="e.g. Dr. Aliyah Mansour"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Expert Bio (AI Narrative Context)</label>
                      <textarea 
                        value={currentDoc.author_profile?.bio || ''}
                        onChange={(e) => updateDoc({ author_profile: { ...currentDoc.author_profile, bio: e.target.value } })}
                        className="w-full h-40 bg-background/50 border border-indigo-500/10 rounded-2xl px-6 py-4 text-sm font-medium leading-relaxed text-foreground focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none resize-none"
                        placeholder="Describe the author's expertise, credentials, and writing style..."
                      />
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Target Audience Persona</label>
                      <input 
                        value={currentDoc.author_profile?.audience || ''}
                        onChange={(e) => updateDoc({ author_profile: { ...currentDoc.author_profile, audience: e.target.value } })}
                        className="w-full bg-background/50 border border-indigo-500/10 rounded-2xl px-6 py-4 font-bold tracking-tight text-foreground focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                        placeholder="e.g. Expats in Dubai looking for luxury real estate..."
                      />
                    </div>
                    
                    <div className="p-6 rounded-3xl bg-violet-500/5 border border-violet-500/10">
                       <div className="flex items-center gap-3 mb-4">
                          <Check className="w-4 h-4 text-violet-500" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-violet-500">EEAT Injection Active</h4>
                       </div>
                       <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                         The prompt engine will automatically wrap these details in semantic EEAT directives, ensuring the AI adopts this persona's unique insights and vocabulary.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* ── Help / Info Panel ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="card-premium p-6 border-indigo-500/10 hover:border-indigo-500/30 transition-colors">
                <Target className="w-5 h-5 text-indigo-500 mb-3" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground mb-1">Semantic Clusters</h4>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">Prompt logic automatically respects keyword intent and cluster silos to maximize topical authority.</p>
             </div>
             <div className="card-premium p-6 border-indigo-500/10 hover:border-indigo-500/30 transition-colors">
                <Layout className="w-5 h-5 text-indigo-500 mb-3" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground mb-1">Iterative Drafting</h4>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">Multi-step mode uses the blueprint to generate 15+ sections sequentially, reaching 12k+ words easily.</p>
             </div>
             <div className="card-premium p-6 border-indigo-500/10 hover:border-indigo-500/30 transition-colors">
                <Settings className="w-5 h-5 text-indigo-500 mb-3" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground mb-1">Inheritance Logic</h4>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">Sites inherit from Campaigns, which inherit from Global. Set once, override only when needed.</p>
             </div>
          </div>

        </main>
      </div>
    </div>
  );
}
