'use client';

import { useEffect, useState, useRef } from 'react';
import { Cpu, Save, Globe, Lock, Server, Palette, MessageCircle, Wifi, WifiOff, RefreshCw, Trash2, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import apiClient from '@/services/apiClient';
import { toast } from 'sonner';
import { getSocket } from '@/services/websocketClient';

export default function SettingsPage() {
  const [activeTab,  setActiveTab]  = useState('branding');
  const [isSaving,   setIsSaving]   = useState(false);
  const [isLoading,  setIsLoading]  = useState(true);
  const [waLoading,  setWaLoading]  = useState(false);
  const [waStatus,   setWaStatus]   = useState<{ connected: boolean; user: string | null; qr: string | null; pairingCode: string | null; sessionExists: boolean }>({
    connected: false, user: null, qr: null, pairingCode: null, sessionExists: false,
  });
  const [pairingPhone, setPairingPhone] = useState('');
  const [sysHealth, setSysHealth] = useState({ db: 'LOADING...', worker: 'LOADING...' });
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (activeTab === 'database') {
      apiClient.get('/health')
        .then(() => setSysHealth({ db: 'CONNECTED', worker: 'ACTIVE' }))
        .catch(() => setSysHealth({ db: 'DISCONNECTED', worker: 'INACTIVE' }));
    }
  }, [activeTab]);

  const [settings, setSettings] = useState<any>({
    branding: { name: 'SEO Engine', tagline: '24/7 AI-driven content factory', companyName: 'SignGaze OS Studio', primaryColor: '#FF6B00', iconName: 'TrendingUp' },
    ai_config: { provider: 'openai', openai_model: 'gpt-4o', gemini_model: 'gemini-1.5-pro' },
    api_keys: { openai: '', gemini: '', serper: '' },
    global_fallbacks: { wp_user: '', wp_pass: '', google_client_id: '' },
    authority: { google_indexing_enabled: false, google_indexing_key_file: '' },
    security: { api_secret: '' },
    internal_linking_config: { enabled_cpts: ['post', 'page'] }
  });
  const [allCpts, setAllCpts] = useState<any[]>([]);
  const [isSyncingCpts, setIsSyncingCpts] = useState(false);
  const [previewPosts, setPreviewPosts] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [selectedCptForPreview, setSelectedCptForPreview] = useState<string | null>(null);
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await apiClient.get('/settings');
        if (Object.keys(data).length > 0) {
          setSettings((prev: any) => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
    
    // Fetch CPTs from all sites to aggregate options
    const fetchCptOptions = async () => {
      try {
        const { data: sites } = await apiClient.get('/sites');
        const wpSites = sites.filter((s: any) => s.type === 'wordpress');
        if (wpSites.length > 0) {
          const { data: cpts } = await apiClient.get(`/sites/${wpSites[0].id}/post-types`);
          setAllCpts(cpts);
        }
      } catch (err) {
        console.error('Failed to fetch CPT options:', err);
      }
    };
    fetchCptOptions();
  }, []);

  useEffect(() => {
    // Real-time branding preview
    if (settings.branding) {
       const root = document.documentElement;
       root.style.setProperty('--primary', settings.branding.primaryColor);
    }
  }, [settings.branding]);

  // WhatsApp: fetch initial status + bind Socket.IO real-time events
  useEffect(() => {
    const fetchWaStatus = async () => {
      try {
        const { data } = await apiClient.get('/notifications/whatsapp/status');
        setWaStatus(data);
      } catch { /* ignore — backend may not have WA enabled */ }
    };
    fetchWaStatus();

    const socket = getSocket();
    socketRef.current = socket;

    socket.on('whatsapp:status', (data: any) => {
      setWaStatus(prev => ({ ...prev, connected: !!data.connected, user: data.user ?? null }));
      if (data.connected) toast.success(`✅ WhatsApp connected as +${data.user}`);
      else toast.info('WhatsApp disconnected.');
    });
    socket.on('whatsapp:qr', (data: any) => {
      setWaStatus(prev => ({ ...prev, qr: data.qr, pairingCode: null, connected: false }));
      toast.info('📱 New QR code ready — scan it to connect!');
    });
    socket.on('whatsapp:pairingCode', (data: any) => {
      setWaStatus(prev => ({ ...prev, pairingCode: data.code, qr: null, connected: false }));
      toast.info(`🔑 Pairing code generated: ${data.code}`);
    });

    return () => { 
      socket.off('whatsapp:status');
      socket.off('whatsapp:qr');
      socket.off('whatsapp:pairingCode');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleSave = async (key: string, value: any) => {
    setIsSaving(true);
    try {
      await apiClient.post('/settings', { key, value });
      toast.success('Settings updated successfully!');
    } catch (err) {
      console.error('Failed to update settings:', err);
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPreview = async (cptSlug: string) => {
    setSelectedCptForPreview(cptSlug);
    setIsPreviewLoading(true);
    setPreviewPosts([]);
    try {
      const { data: sites } = await apiClient.get('/sites');
      const wpSites = sites.filter((s: any) => s.type === 'wordpress');
      if (wpSites.length > 0) {
        const { data } = await apiClient.get(`/sites/${wpSites[0].id}/posts`, { params: { type: cptSlug, limit: 12 } });
        setPreviewPosts(data);
      }
    } catch (err) {
      toast.error('Failed to fetch preview posts');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading system settings...</div>;

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-1 text-lg">Manage AI models, global credentials, and security protocols.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Sidebar */}
        <aside className="lg:w-64 space-y-1">
           <button 
             onClick={() => setActiveTab('branding')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'branding' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary'}`}
           >
             <Palette className="w-4 h-4" />
             <span className="font-medium text-sm">Identity & Design</span>
           </button>
           <button 
             onClick={() => setActiveTab('ai')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'ai' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary'}`}
           >
             <Cpu className="w-4 h-4" />
             <span className="font-medium text-sm">AI Engine</span>
           </button>
           <button 
             onClick={() => setActiveTab('api')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'api' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary'}`}
           >
             <Globe className="w-4 h-4" />
             <span className="font-medium text-sm">Global Fallbacks</span>
           </button>
            <button
              onClick={() => setActiveTab('linking')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'linking' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <LinkIcon className="w-4 h-4" />
              <span className="font-medium text-sm">Linking Engine</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'security' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <Lock className="w-4 h-4" />
              <span className="font-medium text-sm">Security</span>
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'whatsapp' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="font-medium text-sm">WhatsApp</span>
              {waStatus.connected && (
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'database' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              <Server className="w-4 h-4" />
              <span className="font-medium text-sm">System Health</span>
            </button>
        </aside>


        {/* Content Area */}
        <div className="flex-1 space-y-6">
           {/* BRANDING TAB */}
           {activeTab === 'branding' && (
             <div className="card-premium space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-border pb-6">
                   <h3 className="font-bold text-foreground text-lg">Identity & Design</h3>
                   <p className="text-sm text-muted-foreground">Customize the logo, name, and visual theme of your engine.</p>
                </div>

                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Engine Name</label>
                        <input 
                          value={settings.branding.name}
                          onChange={e => setSettings({...settings, branding: {...settings.branding, name: e.target.value}})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Company Subtitle</label>
                        <input 
                          value={settings.branding.companyName}
                          onChange={e => setSettings({...settings, branding: {...settings.branding, companyName: e.target.value}})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground"
                        />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Global Tagline</label>
                      <input 
                        value={settings.branding.tagline}
                        onChange={e => setSettings({...settings, branding: {...settings.branding, tagline: e.target.value}})}
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border/50">
                      <div className="space-y-4">
                        <label className="text-[10px] uppercase font-black text-primary tracking-[0.2em]">Engine Primary Theme</label>
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-4 p-4 glass rounded-3xl border border-border/50 group/picker hover:border-primary/30 transition-all duration-500">
                            <div className="relative w-16 h-16 shrink-0 group/color">
                               <input 
                                 type="color"
                                 value={settings.branding.primaryColor}
                                 onChange={e => setSettings({...settings, branding: {...settings.branding, primaryColor: e.target.value}})}
                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                               />
                               <div 
                                 className="w-full h-full rounded-2xl border-2 border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-transform group-hover/color:scale-110 duration-500" 
                                 style={{ backgroundColor: settings.branding.primaryColor }} 
                               />
                               <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover/color:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                            <div className="flex-1">
                               <p className="text-xs font-bold text-foreground mb-1">Pick a Brand Color</p>
                               <p className="text-[10px] text-muted-foreground leading-snug">Click the swatch to open the color spectrum. All changes reflect in real-time.</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 bg-secondary/30 rounded-xl px-4 py-2 border border-border/40 focus-within:border-primary/50 transition-colors">
                             <span className="text-xs font-mono text-muted-foreground mr-2">HEX:</span>
                             <input 
                               value={settings.branding.primaryColor}
                               onChange={e => setSettings({...settings, branding: {...settings.branding, primaryColor: e.target.value}})}
                               className="flex-1 bg-transparent border-none focus:ring-0 text-foreground font-mono text-sm uppercase font-black"
                             />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em]">Platform Graphics</label>
                        <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                                <Palette className="w-3 h-3" /> Icon Family (Lucide)
                              </label>
                              <input 
                                value={settings.branding.iconName}
                                onChange={e => setSettings({...settings, branding: {...settings.branding, iconName: e.target.value}})}
                                className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground transition-all focus:ring-2 focus:ring-primary/20"
                                placeholder="e.g. Zap, Rocket, TrendingUp"
                              />
                            </div>
                            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                  <Palette className="w-5 h-5 text-primary" />
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-foreground italic">Pro Tip:</p>
                                  <p className="text-[10px] text-muted-foreground">You can use any icon name from the Lucide library to represent your engine.</p>
                               </div>
                            </div>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                  <Button onClick={() => handleSave('branding', settings.branding)} isLoading={isSaving}>
                    <Save className="w-4 h-4 mr-2" /> Save Identity
                  </Button>
                </div>
             </div>
           )}

           {/* AI ENGINE TAB */}
           {activeTab === 'ai' && (
             <div className="card-premium space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-border pb-6">
                   <h3 className="font-bold text-foreground text-lg">AI Configuration</h3>
                   <p className="text-sm text-muted-foreground">Provider and model selection for content generation.</p>
                </div>

                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Provider</label>
                        <select 
                          value={settings.ai_config.provider}
                          onChange={e => setSettings({...settings, ai_config: {...settings.ai_config, provider: e.target.value}})}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="gemini">Google Gemini</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Model</label>
                        <select 
                          value={settings.ai_config.provider === 'openai' ? settings.ai_config.openai_model : settings.ai_config.gemini_model}
                          onChange={e => {
                            const key = settings.ai_config.provider === 'openai' ? 'openai_model' : 'gemini_model';
                            setSettings({...settings, ai_config: {...settings.ai_config, [key]: e.target.value}});
                          }}
                          className="w-full bg-secondary border border-border rounded-lg px-4 py-2.5 text-foreground"
                        >
                          {settings.ai_config.provider === 'openai' ? (
                            <>
                              <option value="gpt-4o">GPT-4o</option>
                              <option value="gpt-4-turbo">GPT-4 Turbo</option>
                              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            </>
                          ) : (
                            <>
                              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                            </>
                          )}
                        </select>
                      </div>
                   </div>

                   <div className="space-y-4 pt-4 border-t border-border">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-widest">API Keys</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase">OpenAI Key</label>
                          <input 
                            type="password"
                            value={settings.api_keys.openai}
                            onChange={e => setSettings({...settings, api_keys: {...settings.api_keys, openai: e.target.value}})}
                            className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground font-mono text-sm"
                            placeholder="sk-..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase">Gemini Key</label>
                          <input 
                            type="password"
                            value={settings.api_keys.gemini}
                            onChange={e => setSettings({...settings, api_keys: {...settings.api_keys, gemini: e.target.value}})}
                            className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground font-mono text-sm"
                            placeholder="AIza..."
                          />
                        </div>

                         {/* Serper.dev — Research-First Engine */}
                         <div className="space-y-2 pt-4 border-t border-border">
                           <label className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2">
                             <span>🔍</span> Serper.dev (Research-First Engine)
                           </label>
                           <input
                             type="password"
                             value={settings.api_keys.serper || ''}
                             onChange={e => setSettings({...settings, api_keys: {...settings.api_keys, serper: e.target.value}})}
                             className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground font-mono text-sm"
                             placeholder="Get key at serper.dev"
                           />
                           <p className="text-[10px] text-muted-foreground italic">Powers the live SERP research step. Every article will be grounded with real 2026 sources.</p>
                         </div>

                         {/* Google Indexing API — Opt-In */}
                         <div className="space-y-3 pt-4 border-t border-border">
                           <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                             <span>⚡</span> Google Indexing API (Opt-In)
                           </label>
                           <div className="flex items-center gap-3">
                             <button
                               type="button"
                               onClick={() => setSettings({...settings, authority: {...(settings.authority || {}), google_indexing_enabled: !(settings.authority?.google_indexing_enabled)}})}
                               className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none border ${ settings.authority?.google_indexing_enabled ? 'bg-emerald-500 border-emerald-400' : 'bg-secondary border-border' }`}
                             >
                               <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${ settings.authority?.google_indexing_enabled ? 'translate-x-6' : 'translate-x-1' }`} />
                             </button>
                             <span className="text-sm text-foreground font-medium">
                               {settings.authority?.google_indexing_enabled ? 'Enabled — URLs submitted instantly after publish' : 'Disabled'}
                             </span>
                           </div>
                           {settings.authority?.google_indexing_enabled && (
                             <input
                               type="text"
                               value={settings.authority?.google_indexing_key_file || ''}
                               onChange={e => setSettings({...settings, authority: {...(settings.authority || {}), google_indexing_key_file: e.target.value}})}
                               className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground font-mono text-sm"
                               placeholder="/path/to/service-account-key.json"
                             />
                           )}
                         </div>
                      </div>
                   </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end gap-3">
                  <Button onClick={() => { handleSave('ai_config', settings.ai_config); handleSave('api_keys', settings.api_keys); if (settings.authority) handleSave('authority', settings.authority); }} isLoading={isSaving}>
                    <Save className="w-4 h-4 mr-2" /> Save AI Profile
                  </Button>
                </div>
             </div>
           )}

           {/* LINKING ENGINE TAB */}
           {activeTab === 'linking' && (
              <div className="card-premium space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="border-b border-border pb-6 flex items-start justify-between">
                    <div>
                       <h3 className="font-bold text-foreground text-lg">Internal Linking Engine</h3>
                       <p className="text-sm text-muted-foreground">Select which content types should be used as sources for internal internal linking.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={async () => {
                        setIsSyncingCpts(true);
                        try {
                          const { data: sites } = await apiClient.get('/sites');
                          const wpSites = sites.filter((s: any) => s.type === 'wordpress');
                          if (wpSites.length > 0) {
                            const { data: cpts } = await apiClient.get(`/sites/${wpSites[0].id}/post-types`);
                            setAllCpts(cpts);
                            toast.success('Graphed available CPTs from WordPress');
                          }
                        } finally { setIsSyncingCpts(false); }
                      }}
                      isLoading={isSyncingCpts}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Graph CPTs
                    </Button>
                 </div>

                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {allCpts.map((cpt: any) => (
                         <div 
                           key={cpt.slug}
                           onClick={() => {
                             const current = settings.internal_linking_config.enabled_cpts || [];
                             const next = current.includes(cpt.slug) 
                               ? current.filter((s: string) => s !== cpt.slug) 
                               : [...current, cpt.slug];
                             setSettings({ ...settings, internal_linking_config: { ...settings.internal_linking_config, enabled_cpts: next } });
                           }}
                           className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                             (settings.internal_linking_config.enabled_cpts || []).includes(cpt.slug)
                               ? 'bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]'
                               : 'bg-secondary/40 border-border/50 hover:border-primary/20'
                           }`}
                         >
                           <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                 (settings.internal_linking_config.enabled_cpts || []).includes(cpt.slug)
                                   ? 'bg-primary text-white'
                                   : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                              }`}>
                                 <Globe className="w-5 h-5" />
                              </div>
                              <div>
                                 <p className="font-bold text-foreground text-sm">{cpt.name}</p>
                                 <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">{cpt.slug}</p>
                              </div>
                           </div>
                           {(settings.internal_linking_config.enabled_cpts || []).includes(cpt.slug) && (
                             <div className="flex items-center gap-2 animate-in zoom-in duration-300">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleOpenPreview(cpt.slug); }}
                                 className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors uppercase font-bold"
                               >
                                 Preview
                               </button>
                               <CheckCircle2 className="w-5 h-5 text-primary" />
                             </div>
                           )}
                         </div>
                       ))}
                       {allCpts.length === 0 && (
                         <div className="col-span-2 py-10 text-center border-2 border-dashed border-border rounded-3xl">
                            <LinkIcon className="w-10 h-10 text-muted-foreground mx-auto opacity-20 mb-3" />
                            <p className="text-sm text-muted-foreground">No custom post types discovered yet.</p>
                            <p className="text-[10px] text-muted-foreground italic mt-1">Connect a WordPress site and click "Graph CPTs" to see options.</p>
                         </div>
                       )}
                    </div>
                    
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                       <p className="text-xs text-muted-foreground italic leading-relaxed">
                         <strong>Note:</strong> When generating articles, the system will search through all selected types for relevant content and automatically inject internal links into the new articles.
                       </p>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-border flex justify-end">
                    <Button onClick={() => handleSave('internal_linking_config', settings.internal_linking_config)} isLoading={isSaving}>
                       <Save className="w-4 h-4 mr-2" /> Save Linking Profile
                    </Button>
                 </div>
              </div>
           )}

           {/* GLOBAL FALLBACKS TAB */}
           {activeTab === 'api' && (
              <div className="card-premium space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="border-b border-border pb-6">
                    <h3 className="font-bold text-foreground text-lg">Global Fallbacks</h3>
                    <p className="text-sm text-muted-foreground">Default credentials used if a specific site is not configured.</p>
                 </div>

                 <div className="space-y-6">
                    <div className="space-y-4">
                       <h4 className="text-xs font-bold text-foreground uppercase tracking-widest">WordPress Default</h4>
                       <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-medium text-muted-foreground uppercase">Default User</label>
                           <input 
                             value={settings.global_fallbacks.wp_user}
                             onChange={e => setSettings({...settings, global_fallbacks: {...settings.global_fallbacks, wp_user: e.target.value}})}
                             className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground text-sm"
                           />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-medium text-muted-foreground uppercase">App Password</label>
                           <input 
                             type="password"
                             value={settings.global_fallbacks.wp_pass}
                             onChange={e => setSettings({...settings, global_fallbacks: {...settings.global_fallbacks, wp_pass: e.target.value}})}
                             className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground text-sm font-mono"
                           />
                         </div>
                       </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                       <h4 className="text-xs font-bold text-foreground uppercase tracking-widest">Google Cloud (Blogger)</h4>
                       <div className="space-y-2">
                         <label className="text-[10px] font-medium text-muted-foreground uppercase">Client ID</label>
                         <input 
                           value={settings.global_fallbacks.google_client_id}
                           onChange={e => setSettings({...settings, global_fallbacks: {...settings.global_fallbacks, google_client_id: e.target.value}})}
                           className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground text-sm"
                         />
                       </div>
                    </div>
                 </div>

                <div className="pt-6 border-t border-border flex justify-end">
                   <Button onClick={() => handleSave('global_fallbacks', settings.global_fallbacks)} isLoading={isSaving}>
                      <Save className="w-4 h-4 mr-2" /> Save Fallbacks
                   </Button>
                </div>
             </div>
           )}

           {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="card-premium space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="border-b border-border pb-6">
                    <h3 className="font-bold text-foreground text-lg">System Security</h3>
                    <p className="text-sm text-muted-foreground">Manage your API secret and access protocols.</p>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">API Secret Key</label>
                       <div className="flex gap-2">
                         <input 
                           type="password"
                           value={settings.security.api_secret}
                           onChange={e => setSettings({...settings, security: {...settings.security, api_secret: e.target.value}})}
                           className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2 text-foreground font-mono"
                         />
                         <Button variant="outline" type="button" onClick={() => setSettings({...settings, security: {...settings.security, api_secret: window.crypto.randomUUID().replace(/-/g, '')}})}>
                           Generate
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic mt-2">This key is required to authenticate external requests to the SEO SaaS API.</p>
                   </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                   <Button onClick={() => handleSave('security', settings.security)} isLoading={isSaving}>
                      <Save className="w-4 h-4 mr-2" /> Update Secret
                   </Button>
                </div>
             </div>
           )}

           {/* WHATSAPP SESSION TAB */}
           {activeTab === 'whatsapp' && (() => {
             const waAction = async (action: 'disconnect' | 'delete-session' | 'start') => {
               setWaLoading(true);
               try {
                 await apiClient.post(`/notifications/whatsapp/${action}`);
                 const { data } = await apiClient.get('/notifications/whatsapp/status');
                 setWaStatus(data);
                 const labels: Record<string, string> = {
                   disconnect: 'Disconnected successfully.',
                   'delete-session': 'Session deleted. Scan a new QR to reconnect.',
                   start: 'New session starting — watch for QR code…',
                 };
                 toast.success(labels[action]);
               } catch (err: any) {
                 toast.error(err?.response?.data?.error || 'Action failed');
               } finally {
                 setWaLoading(false);
               }
             };

            const requestPairing = async () => {
              if (!pairingPhone) { toast.error('Enter phone number first'); return; }
              setWaLoading(true);
              try {
                const { data } = await apiClient.post('/notifications/whatsapp/pair', { phone: pairingPhone });
                setWaStatus(prev => ({ ...prev, pairingCode: data.code }));
                toast.success('Pairing code requested!');
              } catch (err: any) {
                toast.error(err?.response?.data?.error || 'Failed to request pairing code');
              } finally {
                setWaLoading(false);
              }
            };

             return (
               <div className="card-premium space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 {/* Header */}
                 <div className="border-b border-border pb-6 flex items-start justify-between gap-4">
                   <div>
                     <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                       <MessageCircle className="w-5 h-5 text-emerald-400" /> WhatsApp Session
                     </h3>
                     <p className="text-sm text-muted-foreground mt-0.5">
                       Control the Baileys WebSocket session that delivers your SEO notifications.
                     </p>
                   </div>
                   {/* Live status pill */}
                   <span className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
                     waStatus.connected
                       ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                       : 'bg-red-500/10 text-red-400 border-red-500/20'
                   }`}>
                     {waStatus.connected
                       ? <><Wifi className="w-3 h-3" /> Connected · +{waStatus.user}</>
                       : <><WifiOff className="w-3 h-3" /> Disconnected</>}
                   </span>
                 </div>

                 {/* QR Code and Pairing Code area */}
                 {!waStatus.connected && (
                   <div className="flex flex-col items-center gap-5">
                     {waStatus.pairingCode ? (
                       <div className="flex flex-col items-center gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/20 w-full max-w-sm">
                         <div className="text-center">
                           <p className="text-sm font-bold text-primary uppercase tracking-widest mb-1">Your Pairing Code</p>
                           <p className="text-3xl font-mono font-black text-foreground tracking-widest">{waStatus.pairingCode.match(/.{1,4}/g)?.join('-')}</p>
                         </div>
                         <div className="text-sm text-center text-muted-foreground mt-2">
                           Open WhatsApp → Linked Devices → Link with phone number instead. Enter this code.
                         </div>
                       </div>
                     ) : waStatus.qr ? (
                       <>
                         <div className="p-4 bg-white rounded-2xl shadow-2xl ring-4 ring-emerald-500/20">
                           <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-56 h-56 rounded-lg" />
                         </div>
                         <div className="text-center space-y-1 max-w-xs">
                           <p className="text-sm font-semibold text-foreground">Scan with WhatsApp</p>
                           <p className="text-xs text-muted-foreground">
                             Open <strong>WhatsApp</strong> → tap <strong>⋮ Menu</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong>
                           </p>
                         </div>
                         
                         <div className="w-full max-w-xs mt-4 pt-4 border-t border-border">
                           <p className="text-xs font-bold text-center text-muted-foreground mb-3">Or use pairing code (better for 405 errors)</p>
                           <div className="flex gap-2">
                             <input 
                               type="text" 
                               placeholder="e.g. 14155552671"
                               value={pairingPhone}
                               onChange={e => setPairingPhone(e.target.value)}
                               className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                             />
                             <Button size="sm" onClick={requestPairing} isLoading={waLoading}>Get Code</Button>
                           </div>
                         </div>
                       </>
                     ) : (
                       <div className="w-56 h-56 rounded-2xl bg-secondary/50 border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-3">
                         <MessageCircle className="w-12 h-12 opacity-20" />
                         <p className="text-xs text-center px-6 leading-relaxed">
                           {waStatus.sessionExists
                             ? 'Session exists. Click Reconnect to restore.'
                             : 'No active session. Click Connect to start.'}
                         </p>
                       </div>
                     )}
                   </div>
                 )}

                 {/* Connected state info */}
                 {waStatus.connected && (
                   <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center text-2xl shrink-0">✅</div>
                     <div className="flex-1">
                       <p className="font-bold text-foreground">Session Active</p>
                       <p className="text-sm text-muted-foreground mt-0.5">
                         Connected as <span className="font-mono text-emerald-400 font-semibold">+{waStatus.user}</span>
                       </p>
                       <p className="text-xs text-muted-foreground mt-1 opacity-70">
                         Notifications are live. Use Disconnect to safely log out, or Delete Session to switch numbers.
                       </p>
                     </div>
                   </div>
                 )}

                 {/* Action buttons */}
                 <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
                   {/* Connect / Reconnect */}
                   {!waStatus.connected && (
                     <button
                       id="wa-connect-btn"
                       onClick={() => waAction('start')}
                       disabled={waLoading}
                       className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <RefreshCw className={`w-4 h-4 ${waLoading ? 'animate-spin' : ''}`} />
                       {waStatus.sessionExists ? 'Reconnect' : 'Connect'}
                     </button>
                   )}

                   {/* Disconnect — only when connected */}
                   {waStatus.connected && (
                     <button
                       id="wa-disconnect-btn"
                       onClick={() => waAction('disconnect')}
                       disabled={waLoading}
                       className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <WifiOff className="w-4 h-4" />
                       Disconnect
                     </button>
                   )}

                   {/* Delete Session — always visible */}
                   <button
                     id="wa-delete-btn"
                     onClick={() => {
                       if (confirm('⚠️ This will permanently delete all session files. You\'ll need to scan a new QR code to reconnect. Continue?')) {
                         waAction('delete-session');
                       }
                     }}
                     disabled={waLoading}
                     className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <Trash2 className="w-4 h-4" /> Delete Session
                   </button>

                   {/* Refresh status */}
                   <button
                     onClick={async () => {
                       const { data } = await apiClient.get('/notifications/whatsapp/status');
                       setWaStatus(data);
                       toast.info('Status refreshed.');
                     }}
                     disabled={waLoading}
                     className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground font-medium text-xs transition-all"
                   >
                     <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
                   </button>
                 </div>
               </div>
             );
           })()}

           {/* SYSTEM HEALTH TAB */}
            {activeTab === 'database' && (
              <div className="card-premium space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                 <div className="border-b border-border pb-6">
                    <h3 className="font-bold text-foreground text-lg">System Health</h3>
                    <p className="text-sm text-muted-foreground">Monitoring your database connection and core services.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 glass rounded-xl border border-border space-y-2">
                       <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-bold uppercase">Supabase DB</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sysHealth.db === 'CONNECTED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {sysHealth.db}
                          </span>
                       </div>
                       <p className="text-sm text-foreground font-mono">pg.supabase.co:5432</p>
                    </div>
                    <div className="p-4 glass rounded-xl border border-border space-y-2">
                       <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-bold uppercase">Background Worker</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sysHealth.worker === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {sysHealth.worker}
                          </span>
                       </div>
                       <p className="text-sm text-foreground">Cron Schedule: Enabled</p>
                    </div>
                 </div>

                 <div className="p-6 bg-primary/5 rounded-xl border border-primary/20">
                    <h4 className="font-bold text-foreground text-sm mb-2">Version Information</h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                       <span>Core Version: v1.0.0-stable</span>
                       <span>Build: 2026.03.25</span>
                    </div>
                 </div>
              </div>
            )}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedCptForPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 text-left">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCptForPreview(null)} />
          <div className="relative w-full max-w-2xl bg-secondary border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground">Content Preview: {selectedCptForPreview}</h3>
                <p className="text-xs text-muted-foreground">Showing the most recent entries of this type found on your site.</p>
              </div>
              <button onClick={() => setSelectedCptForPreview(null)} className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
               {isPreviewLoading ? (
                 <div className="py-20 text-center animate-pulse">
                    <RefreshCw className="w-8 h-8 text-primary mx-auto animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">Fetching posts from WordPress API...</p>
                 </div>
               ) : previewPosts.length > 0 ? (
                 <div className="grid grid-cols-1 gap-3">
                    {previewPosts.map((post: any) => (
                      <a 
                        key={post.id} 
                        href={post.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all group block"
                      >
                         <h4 className="font-bold text-foreground group-hover:text-primary transition-colors text-sm line-clamp-1">{post.title}</h4>
                         <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-muted-foreground font-mono">{new Date(post.date).toLocaleDateString()}</span>
                            <span className="text-[10px] text-primary underline opacity-0 group-hover:opacity-100 transition-opacity">View Article ↗</span>
                         </div>
                      </a>
                    ))}
                 </div>
               ) : (
                 <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl">
                    <Globe className="w-12 h-12 text-muted-foreground mx-auto opacity-10 mb-4" />
                    <p className="text-sm text-muted-foreground">No content found for this type.</p>
                 </div>
               )}
            </div>
            
            <div className="p-6 bg-secondary/50 border-t border-border flex justify-end">
               <Button onClick={() => setSelectedCptForPreview(null)}>Close Preview</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
