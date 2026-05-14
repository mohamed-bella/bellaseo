'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Sparkles, Save, Globe, Layout, User, BookOpen, 
  ChevronLeft, Check, AlertCircle, Info, 
  Zap, Target, Layers, Wand2, Monitor, 
  Settings, ArrowLeft, RefreshCw, Loader2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import apiClient from '@/services/apiClient';
import { toast } from 'sonner';

/**
 * ============================================================
 *  PROJECT STUDIO — High-Precision Campaign Configuration
 * ============================================================
 *  - Supports Smart Inheritance from Global Article Studio.
 *  - Real-time "Effective Value" indicators.
 *  - Dedicated UI for Project-level fine-tuning.
 * ============================================================
 */

type TabType = 'directives' | 'author' | 'schedule' | 'target';

export default function ProjectStudioPage() {
  const { id } = useParams();
  const router = useRouter();

  // ── State ──
  const [campaign, setCampaign] = useState<any>(null);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('directives');

  // ── Local Overrides ──
  // This state holds only what is different/custom for THIS project
  const [localConfig, setLocalConfig] = useState<any>({});
  
  // ── Post Types ──
  const [postTypes, setPostTypes] = useState<any[]>([
    { slug: 'post', name: 'Posts' },
    { slug: 'page', name: 'Pages' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campRes, settingsRes, sitesRes] = await Promise.all([
          apiClient.get(`/campaigns/${id}`),
          apiClient.get('/settings'),
          apiClient.get('/sites')
        ]);
        
        setCampaign(campRes.data);
        setGlobalSettings(settingsRes.data);
        setSites(sitesRes.data);
        
        // Initialize local config from campaign's article_config
        setLocalConfig(campRes.data.article_config || {});
      } catch (err) {
        toast.error('Failed to load project data.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Fetch CPTs when target site changes
  useEffect(() => {
    if (campaign?.target_site_id && sites.length > 0) {
      const selectedSite = sites.find((s) => s.id === campaign.target_site_id);
      if (selectedSite?.type === 'wordpress') {
        apiClient
          .get(`/sites/${campaign.target_site_id}/post-types`)
          .then((res) => setPostTypes(res.data))
          .catch(() => setPostTypes([{ slug: 'post', name: 'Posts' }, { slug: 'page', name: 'Pages' }]));
      } else {
        setPostTypes([{ slug: 'post', name: 'Posts' }]);
      }
    }
  }, [campaign?.target_site_id, sites]);

  // ── Smart Inheritance Logic ──
  const globalDirectives = globalSettings?.article_config || {};
  
  const getEffectiveValue = (key: string, defaultValue: any) => {
    if (localConfig[key] !== undefined && localConfig[key] !== '' && localConfig[key] !== null) {
      return { value: localConfig[key], isOverridden: true };
    }
    return { value: globalDirectives[key] || defaultValue, isOverridden: false };
  };

  const updateLocalConfig = (key: string, value: any) => {
    setLocalConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const clearOverride = (key: string) => {
    const next = { ...localConfig };
    delete next[key];
    setLocalConfig(next);
    toast.info(`Reset to inherit from Global Studio.`);
  };

  const loadProTemplate = () => {
    const template = `You are an elite SEO content strategist and expert writer for the {{niche}} niche.

# YOUR PERSONA
- Name: [Author Name]
- Expertise: [Brief bio explaining why you are an authority]
- Target Audience: [Who are you writing for?]

# CONTENT & SEO RULES
- TONE: Professional, helpful, and data-driven.
- LENGTH: Aim for {{targetLength}} words.
- KEYWORDS: Use "{{keyword}}" in H1, first paragraph, and 2+ H2s.
- LINKS: Include 1-2 internal links and 2-3 external authority links.
- MEDIA: Use [IMAGE_PLACEHOLDER: description] where visual aid is needed.

# STRUCTURE RULES
1. Catchy H1 Title (must include {{keyword}})
2. Engaging Intro (mention {{keyword}} in first sentence)
3. H2/H3 Body Sections (focus on user intent: {{intent}})
4. FAQ Section (using <h3> and <p>)
5. Conclusion with CTA

# HTML OUTPUT
- Output ONLY raw HTML. No markdown, no explanations.`;
    
    updateLocalConfig('master_prompt_template', template);
    toast.success('Pro Template loaded. Now personalize it!');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put(`/campaigns/${id}`, {
        ...campaign,
        article_config: localConfig
      });
      toast.success('Project Studio synced successfully.');
    } catch (err) {
      toast.error('Save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-pulse">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Calibrating Project Studio...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto min-h-[90vh] flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* ── Top Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/campaigns')}
            className="w-12 h-12 flex items-center justify-center bg-secondary border border-border rounded-2xl hover:bg-primary/5 hover:border-primary/30 transition-all text-muted-foreground hover:text-primary active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tighter text-foreground italic">{campaign.name}</h1>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                Project Hub
              </span>
            </div>
            <p className="text-sm font-bold text-muted-foreground mt-1 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" /> Studio Config · Connected to <span className="text-foreground">{sites.find(s => s.id === campaign.target_site_id)?.name || 'No Site'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <Button variant="outline" onClick={() => router.push(`/campaigns/${id}`)} className="h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest border-border/60">
              Go to Workspace
           </Button>
           <Button onClick={handleSave} isLoading={isSaving} className="h-12 px-8 bg-primary text-white hover:bg-primary/90 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">
              <Save className="w-4 h-4 mr-2" />
              Sync Design
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 mt-4">
        
        {/* ── Sidebar ── */}
        <aside className="space-y-4">
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('directives')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all border ${activeTab === 'directives' || activeTab === 'author' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-transparent border-transparent text-muted-foreground hover:bg-secondary'}`}
            >
              <Zap className="w-5 h-5" />
              <span className="text-sm font-black uppercase tracking-widest">Master Instruction</span>
            </button>
            <button 
              onClick={() => setActiveTab('schedule')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all border ${activeTab === 'schedule' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-transparent border-transparent text-muted-foreground hover:bg-secondary'}`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-black uppercase tracking-widest">Automation</span>
            </button>
            <button 
              onClick={() => setActiveTab('target')}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all border ${activeTab === 'target' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-transparent border-transparent text-muted-foreground hover:bg-secondary'}`}
            >
              <Globe className="w-5 h-5" />
              <span className="text-sm font-black uppercase tracking-widest">Publication</span>
            </button>
          </div>

          <div className="p-8 rounded-[32px] bg-secondary border border-border/50 space-y-6">
             <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Prompt Guidelines</h4>
             </div>
             
             <ul className="space-y-4">
                {[
                  { t: "Persona", d: "Define who the AI is (e.g., 'Expert Dentist')." },
                  { t: "Word Count", d: "Specify target length (e.g., '1500 words')." },
                  { t: "Formatting", d: "Rules for H2, H3, lists, and tables." },
                  { t: "SEO Rules", d: "Keyword density and linking strategy." },
                  { t: "Language", d: "Force specific dialects or styles." }
                ].map((item, idx) => (
                  <li key={idx} className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-primary">{item.t}</p>
                    <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">{item.d}</p>
                  </li>
                ))}
             </ul>

             <div className="pt-4 border-t border-border/50">
               <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                 Use tokens like <code className="text-primary font-bold">{"{{keyword}}"}</code> or <code className="text-primary font-bold">{"{{niche}}"}</code> to keep instructions dynamic.
               </p>
             </div>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="card-premium p-8 lg:p-10 border-border bg-card/30">
          
          {(activeTab === 'directives' || activeTab === 'author') && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-400">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
                       <Wand2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-foreground uppercase tracking-tighter italic">Master Project Instruction</h2>
                      <p className="text-xs font-bold text-muted-foreground mt-0.5">The "Brain" of this specific project.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={loadProTemplate}
                      className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-2 rounded-xl hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-3 h-3" /> Load Pro Template
                    </button>
                    {localConfig.master_prompt_template && (
                      <button 
                        onClick={() => clearOverride('master_prompt_template')}
                        className="text-[9px] font-black uppercase tracking-widest bg-secondary text-muted-foreground px-3 py-2 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                      >
                        Reset to Global
                      </button>
                    )}
                  </div>
               </div>

               <div className="space-y-4">
                  <textarea
                    value={localConfig.master_prompt_template || globalDirectives.master_prompt_template || ''}
                    onChange={(e) => updateLocalConfig('master_prompt_template', e.target.value)}
                    className="w-full h-[600px] bg-background/50 border border-border rounded-[32px] p-8 text-sm font-medium focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all leading-relaxed font-mono"
                    placeholder="Describe exactly how you want the articles written..."
                  />
                  
                  <div className="flex items-center justify-between px-4">
                    <p className="text-[10px] text-muted-foreground font-bold">
                      {localConfig.master_prompt_template ? "✅ Using Project Custom Prompt" : "⚪ Inheriting Global Studio Prompt"}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-bold">
                      {(localConfig.master_prompt_template || globalDirectives.master_prompt_template || '').length} characters
                    </p>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-400">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
                     <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">Automation Schedule</h2>
                    <p className="text-xs font-bold text-muted-foreground mt-0.5 italic">Configure when and how often the AI publishes for you.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Schedule Frequency</label>
                    <select 
                      value={campaign.schedule_type}
                      onChange={(e) => setCampaign({ ...campaign, schedule_type: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="manual">Manual Only</option>
                      <option value="daily">Daily Run</option>
                      <option value="hourly">Hourly Run</option>
                      <option value="weekly">Weekly Run</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Articles Per Run</label>
                    <input 
                      type="number"
                      min={1}
                      max={20}
                      value={campaign.posts_per_run || 1}
                      onChange={(e) => setCampaign({ ...campaign, posts_per_run: parseInt(e.target.value) })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
               </div>

               {/* ── Scheduled Time ── */}
               {campaign.schedule_type !== 'manual' && campaign.schedule_type !== 'hourly' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/50">
                   <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                       Run Time (HH:MM)
                     </label>
                     <input
                       type="time"
                       value={campaign.cron_time || '09:00'}
                       onChange={(e) => setCampaign({ ...campaign, cron_time: e.target.value })}
                       className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/10"
                     />
                     <p className="text-[10px] text-muted-foreground font-medium">
                       The exact time the scheduler will trigger this campaign each day/week.
                     </p>
                   </div>

                   <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                       Timezone
                     </label>
                     <select
                       value={campaign.cron_timezone || 'Africa/Casablanca'}
                       onChange={(e) => setCampaign({ ...campaign, cron_timezone: e.target.value })}
                       className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/10"
                     >
                       <option value="Africa/Casablanca">Africa/Casablanca (GMT+1)</option>
                       <option value="Europe/Paris">Europe/Paris (GMT+1/+2)</option>
                       <option value="Europe/London">Europe/London (GMT+0/+1)</option>
                       <option value="America/New_York">America/New_York (GMT-5/-4)</option>
                       <option value="America/Los_Angeles">America/Los_Angeles (GMT-8/-7)</option>
                       <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                       <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
                       <option value="UTC">UTC (GMT+0)</option>
                     </select>
                   </div>
                 </div>
               )}

               {campaign.schedule_type === 'hourly' && (
                 <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                   <p className="text-[11px] font-bold">
                     ⚡ Hourly runs trigger at the start of every hour automatically — no time selection needed.
                   </p>
                 </div>
               )}

               {campaign.schedule_type === 'manual' && (
                 <div className="p-5 rounded-2xl bg-secondary border border-border/50 text-muted-foreground">
                   <p className="text-[11px] font-bold">
                     🔒 Manual mode — this campaign will only run when you trigger it from the workspace.
                   </p>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'target' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-400">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
                     <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">Publication Target</h2>
                    <p className="text-xs font-bold text-muted-foreground mt-0.5 italic">Where should the finalized articles land?</p>
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Website</label>
                    <select 
                      value={campaign.target_site_id || ''}
                      onChange={(e) => setCampaign({ ...campaign, target_site_id: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="">No Website Selected</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
                    </select>
                  </div>
                  
                  <div className="p-6 bg-secondary rounded-2xl border border-border/50">
                    <h4 className="text-xs font-black uppercase tracking-widest text-foreground mb-4">WordPress Configuration</h4>
                    <div className="space-y-4">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Target Post Type</label>
                          <select 
                            value={campaign.target_cpt || 'post'}
                            onChange={(e) => setCampaign({ ...campaign, target_cpt: e.target.value })}
                            className="w-full bg-[#F9FAFB] border border-[#E5E8EB] hover:border-[#D1D5DB] rounded-xl px-4 py-3 text-[13px] text-[#1A1D23] font-bold outline-none focus:ring-2 focus:ring-[#FF642D]/20 transition-all focus:border-[#FF642D]"
                          >
                             {postTypes.map(pt => (
                                <option key={pt.slug} value={pt.slug}>{pt.name}</option>
                             ))}
                          </select>
                       </div>
                       <p className="text-[10px] text-muted-foreground italic">Note: Custom Post Types (CPTs) are fetched automatically from the connected site.</p>
                    </div>
                  </div>
               </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
