'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Globe, Plus, Trash2, ShieldCheck, ShieldAlert,
  ExternalLink, Settings2, Activity, Box, Layout,
  Info, Loader2, Search, CheckCircle2, XCircle, TrendingUp, HelpCircle,
  Wifi, WifiOff, Zap, FileText, Send, FlameIcon as Flame, Link2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import apiClient from '@/services/apiClient';

type PostTestPhase = 'idle' | 'publishing' | 'live' | 'deleting' | 'deleted';
type PostTestState = { phase: PostTestPhase; wp_id?: number; blogger_id?: string; url?: string; error?: string };
type BloggerTestResult = { success: boolean; blog_name?: string; blog_url?: string; posts_total?: number; description?: string; message?: string };

function SitesPageInner() {
  const searchParams = useSearchParams();
  const [sites, setSites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OAuth result toast
  const [oauthToast, setOauthToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Blog picker (after OAuth)
  const [blogPickerOpen, setBlogPickerOpen] = useState(false);
  const [oauthPayload, setOauthPayload]     = useState<{ access_token: string; refresh_token: string | null; blogs: any[] } | null>(null);
  const [pickedBlog, setPickedBlog]         = useState<any>(null);
  const [blogNickname, setBlogNickname]     = useState('');
  const [isSavingBlog, setIsSavingBlog]     = useState(false);

  useEffect(() => {
    const status = searchParams.get('blogger_oauth');
    if (!status) return;
    window.history.replaceState({}, '', '/sites');

    if (status === 'pick') {
      try {
        const raw = searchParams.get('data') || '';
        const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        setOauthPayload(decoded);
        if (decoded.blogs?.length === 1) {
          setPickedBlog(decoded.blogs[0]);
          setBlogNickname(decoded.blogs[0].name);
        }
        setBlogPickerOpen(true);
      } catch {
        setOauthToast({ type: 'error', message: 'Failed to parse blog data from Google.' });
      }
    } else if (status === 'success') {
      setOauthToast({ type: 'success', message: 'Blogger site connected successfully!' });
      fetchSites();
    } else {
      const reason = searchParams.get('reason') || 'Unknown error';
      setOauthToast({ type: 'error', message: `OAuth failed: ${reason}` });
    }

    const timer = setTimeout(() => setOauthToast(null), 7000);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const saveBloggerSite = async () => {
    if (!oauthPayload || !pickedBlog) return;
    setIsSavingBlog(true);
    try {
      await apiClient.post('/sites', {
        name: blogNickname || pickedBlog.name,
        type: 'blogger',
        api_url: pickedBlog.url,
        credentials: {
          blog_id:       pickedBlog.id,
          access_token:  oauthPayload.access_token,
          refresh_token: oauthPayload.refresh_token || '',
          client_id:     '',
          client_secret: '',
        },
      });
      setBlogPickerOpen(false);
      setOauthPayload(null);
      setPickedBlog(null);
      setBlogNickname('');
      setOauthToast({ type: 'success', message: `"${blogNickname || pickedBlog.name}" connected to Blogger!` });
      fetchSites();
    } catch (err: any) {
      setOauthToast({ type: 'error', message: err.response?.data?.error || 'Failed to save site.' });
    } finally {
      setIsSavingBlog(false);
    }
  };
  
  // Diagnostics State
  const [isDiagOpen, setIsDiagOpen] = useState(false);
  const [isFetchingDiag, setIsFetchingDiag] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<any>(null);

  // Per-site connection test state
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Per-site post publishing test state
  const [postTests, setPostTests] = useState<Record<string, PostTestState>>({});

  const setPostTest = (id: string, update: Partial<PostTestState>) =>
    setPostTests(prev => ({ ...prev, [id]: { ...(prev[id] || { phase: 'idle' }), ...update } }));

  const [formData, setFormData] = useState({
    name: '',
    type: 'wordpress',
    api_url: '',
    gsc_service_account: '',
    ga4_property_id: '',
    credentials: {
      username: '',
      app_password: '',
      blog_id: '',
      access_token: '',
      refresh_token: '',
      client_id: '',
      client_secret: '',
    }
  });

  const [editingSite, setEditingSite] = useState<any>(null);

  const fetchSites = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get('/sites');
      setSites(data);
    } catch (err) {
      console.error('Failed to fetch sites:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const openDiagnostics = async (site: any) => {
    setSelectedSite(site);
    setIsDiagOpen(true);
    setIsFetchingDiag(true);
    setDiagnostics(null);
    try {
      const { data } = await apiClient.get(`/sites/${site.id}/diagnostics`);
      setDiagnostics(data);
    } catch (err: any) {
      console.error('Failed to fetch diagnostics:', err);
      setDiagnostics({ error: err.response?.data?.error || 'Failed to connect to WordPress REST API.' });
    } finally {
      setIsFetchingDiag(false);
    }
  };

  const openEditModal = async (site: any) => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get(`/sites/${site.id}`);
      setEditingSite(data);
      setFormData({
        name: data.name,
        type: data.type,
        api_url: data.api_url,
        gsc_service_account: data.gsc_service_account || '',
        ga4_property_id: data.ga4_property_id || '',
        credentials: {
          username:      data.credentials?.username      || '',
          app_password:  data.credentials?.app_password  || '',
          blog_id:       data.credentials?.blog_id       || '',
          access_token:  data.credentials?.access_token  || '',
          refresh_token: data.credentials?.refresh_token || '',
          client_id:     data.credentials?.client_id     || '',
          client_secret: data.credentials?.client_secret || '',
        }
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch site details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSite(null);
    setFormData({
      name: '', type: 'wordpress', api_url: '',
      gsc_service_account: '', ga4_property_id: '',
      credentials: { username: '', app_password: '', blog_id: '', access_token: '', refresh_token: '', client_id: '', client_secret: '' }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const creds: any = {};
      if (formData.type === 'wordpress') {
        if (formData.credentials.username) creds.username = formData.credentials.username;
        if (formData.credentials.app_password) creds.app_password = formData.credentials.app_password;
      } else {
        if (formData.credentials.blog_id) creds.blog_id = formData.credentials.blog_id;
        if (formData.credentials.access_token) creds.access_token = formData.credentials.access_token;
        if (formData.credentials.refresh_token) creds.refresh_token = formData.credentials.refresh_token;
        if (formData.credentials.client_id) creds.client_id = formData.credentials.client_id;
        if (formData.credentials.client_secret) creds.client_secret = formData.credentials.client_secret;
      }
      
      const payload: any = { 
        name: formData.name,
        type: formData.type,
        api_url: formData.api_url,
        gsc_service_account: formData.gsc_service_account,
        ga4_property_id: formData.ga4_property_id
      };
      if (Object.keys(creds).length > 0) payload.credentials = creds;

      if (editingSite) {
        await apiClient.put(`/sites/${editingSite.id}`, payload);
      } else {
        await apiClient.post('/sites', payload);
      }
      
      handleCloseModal();
      fetchSites();
    } catch (err) {
      console.error('Failed to save site:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await apiClient.delete(`/sites/${id}`);
      fetchSites();
    } catch (err) {
      console.error('Failed to delete site:', err);
    }
  };

  const testConnection = async (id: string) => {
    setTestingIds(prev => new Set(prev).add(id));
    setTestResults(prev => { const n = {...prev}; delete n[id]; return n; });
    try {
      const { data } = await apiClient.post(`/sites/${id}/test`);
      if (data.success) {
        // Blogger returns blog_name/blog_url; WordPress returns user/role
        const msg = data.blog_name
          ? `Blog: ${data.blog_name} · ${data.posts_total ?? 0} posts · ${data.blog_url}`
          : `Connected as ${data.user}${data.role ? ` · ${data.role}` : ''}`;
        setTestResults(prev => ({ ...prev, [id]: { success: true, message: msg } }));
      } else {
        setTestResults(prev => ({ ...prev, [id]: { success: false, message: data.error || 'Connection failed' } }));
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Unable to reach the site.';
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: msg } }));
    } finally {
      setTestingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const publishTestPost = async (siteId: string) => {
    setPostTest(siteId, { phase: 'publishing', error: undefined });
    try {
      const { data } = await apiClient.post(`/sites/${siteId}/test-post`);
      if (data.success) {
        setPostTest(siteId, { phase: 'live', wp_id: data.wp_id, blogger_id: data.blogger_id, url: data.url });
      } else {
        setPostTest(siteId, { phase: 'idle', error: data.error || 'Failed to publish test post.' });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Publish test failed.';
      setPostTest(siteId, { phase: 'idle', error: msg });
    }
  };

  const deleteTestPost = async (siteId: string, wpId?: number, bloggerId?: string) => {
    setPostTest(siteId, { phase: 'deleting' });
    try {
      const payload = bloggerId ? { blogger_id: bloggerId } : { wp_id: wpId };
      await apiClient.delete(`/sites/${siteId}/test-post`, { data: payload });
      setPostTest(siteId, { phase: 'deleted' });
      setTimeout(() => setPostTests(prev => { const n = {...prev}; delete n[siteId]; return n; }), 3000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Delete failed.';
      setPostTest(siteId, { phase: 'live', error: msg });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* OAuth result toast */}
      {oauthToast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium animate-in slide-in-from-top-2 duration-300 ${
          oauthToast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600'
            : 'bg-rose-500/10 border-rose-500/25 text-rose-500'
        }`}>
          {oauthToast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{oauthToast.message}</span>
          <button onClick={() => setOauthToast(null)} className="opacity-50 hover:opacity-100 transition-opacity">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/50">
            Connected Sites
          </h1>
          <p className="text-muted-foreground mt-2 text-base sm:text-lg">Manage your WordPress and Blogger publishing destinations.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <a href="/auth/google/start" className="flex-1 sm:flex-none">
            <Button className="w-full flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 border-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" opacity=".9"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".9"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff" opacity=".9"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
              </svg>
              Connect Blogger
            </Button>
          </a>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 shadow-lg shadow-primary/20 flex-1 sm:flex-none justify-center">
            <Plus className="w-4 h-4" />
            Add WordPress
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
           <div className="col-span-full py-20 text-center text-muted-foreground animate-pulse">Loading sites...</div>
        ) : sites.length === 0 ? (
           <div className="col-span-full py-20 bg-secondary/20 rounded-3xl border border-dashed border-border text-center text-muted-foreground">
             <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
             <p className="font-bold">No sites connected yet.</p>
             <p className="text-sm">Click "Add Site" to wire up your first blog.</p>
           </div>
        ) : sites.map((site) => (
          <div key={site.id} className="card-premium grainy group relative transition-all flex flex-col">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center border border-border group-hover:bg-primary/5 transition-colors overflow-hidden">
                     {(() => {
                       try {
                         const domain = new URL(site.api_url).hostname;
                         return (
                           <img 
                             src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} 
                             alt={site.name}
                             className="w-7 h-7 object-contain grayscale-[0.5] group-hover:grayscale-0 transition-all"
                             onError={(e) => (e.currentTarget.style.display = 'none')}
                           />
                         );
                       } catch { return null; }
                     })()}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{site.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {site.type}
                      </span>
                    </div>
                  </div>
               </div>
               <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                  onClick={() => handleDelete(site.id, site.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            <div className="space-y-4 flex-1">
               <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Endpoint Address</span>
                  <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-xl border border-border/50">
                    <span className="text-xs text-foreground/70 truncate font-mono flex-1">{site.api_url}</span>
                    <a href={site.api_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                       <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
               </div>
            </div>

            {/* Test Connection Result Banner */}
            {testResults[site.id] && (
              <div className={`mt-4 px-3 py-2.5 rounded-2xl flex items-start gap-2.5 text-xs font-medium border animate-in slide-in-from-bottom-2 duration-300 ${
                testResults[site.id].success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {testResults[site.id].success
                  ? <Wifi className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  : <WifiOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                }
                <span className="leading-snug">{testResults[site.id].message}</span>
                <button
                  onClick={() => setTestResults(prev => { const n = {...prev}; delete n[site.id]; return n; })}
                  className="ml-auto shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Post Publishing Test Panel */}
            {(() => {
              const pt = postTests[site.id];
              if (!pt || (pt.phase === 'idle' && !pt.error)) return null;
              return (
                <div className="mt-4 rounded-2xl border border-border overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                  <div className="px-3 py-2 bg-secondary/50 border-b border-border flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Post Publish Test</span>
                    {pt.phase !== 'deleted' && (
                      <button
                        onClick={() => setPostTests(prev => { const n = {...prev}; delete n[site.id]; return n; })}
                        className="ml-auto opacity-40 hover:opacity-100 transition-opacity"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="p-3 space-y-3">

                    {/* Publishing spinner */}
                    {pt.phase === 'publishing' && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                        <div>
                          <p className="font-bold text-foreground">Publishing test post...</p>
                          <p className="opacity-60 mt-0.5">Creating a private draft on your WordPress site.</p>
                        </div>
                      </div>
                    )}

                    {/* Live: show link + delete */}
                    {pt.phase === 'live' && pt.wp_id && (
                      <>
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-emerald-500">Test post published! (Draft)</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {pt.blogger_id ? `Blogger ID: ${pt.blogger_id}` : `WP ID: #${pt.wp_id}`}
                            </p>
                          </div>
                        </div>
                        <a
                          href={pt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary font-bold hover:bg-primary/10 transition-colors group/link"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate flex-1">View Live Post</span>
                          <span className="text-[9px] opacity-50 group-hover/link:opacity-100 transition-opacity">↗</span>
                        </a>
                        {pt.error && (
                          <p className="text-[10px] text-rose-400 px-1">{pt.error}</p>
                        )}
                        <button
                          onClick={() => deleteTestPost(site.id, pt.wp_id, pt.blogger_id)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-bold hover:bg-rose-500/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Test Post
                        </button>
                      </>
                    )}

                    {/* Deleting spinner */}
                    {pt.phase === 'deleting' && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-rose-400 shrink-0" />
                        <div>
                          <p className="font-bold text-foreground">Deleting test post...</p>
                          <p className="opacity-60 mt-0.5">
                            {pt.blogger_id ? `Removing post ${pt.blogger_id} from Blogger.` : `Permanently removing post #${pt.wp_id} from WordPress.`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Deleted success */}
                    {pt.phase === 'deleted' && (
                      <div className="flex items-center gap-3 py-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-emerald-500">Test post deleted ✓</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Full round-trip test passed. Publishing works.</p>
                        </div>
                      </div>
                    )}

                    {/* Error on idle */}
                    {(pt.phase as string) === 'idle' && pt.error && (
                      <div className="flex items-start gap-2 text-rose-400">
                        <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <p className="text-xs leading-snug">{pt.error}</p>
                      </div>
                    )}

                  </div>
                </div>
              );
            })()}

            {/* Blogger: Connect Google Account button */}
            {site.type === 'blogger' && (
              <div className="mt-4">
                <a href={`/auth/google/start?site_id=${site.id}`}>
                  <Button
                    variant="outline"
                    className="w-full text-xs flex items-center justify-center gap-2 border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Connect Google Account (OAuth)
                  </Button>
                </a>
                <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
                  Saves access + refresh token automatically. Requires client_id &amp; client_secret saved first.
                </p>
              </div>
            )}

            <div className="mt-4 pt-5 grid grid-cols-4 gap-2 border-t border-border">
                {/* Test Auth */}
                <Button
                  variant="outline"
                  className={`text-xs border-border flex items-center justify-center gap-1 col-span-1 px-1 ${
                    testingIds.has(site.id) ? 'opacity-70 pointer-events-none' : ''
                  }`}
                  onClick={() => testConnection(site.id)}
                  title="Test authentication only (fast)"
                >
                  {testingIds.has(site.id)
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Zap className="w-3.5 h-3.5" />
                  }
                  <span className="hidden sm:inline">{testingIds.has(site.id) ? '...' : 'Auth'}</span>
                </Button>

                {/* Test Post */}
                <Button
                  variant="outline"
                  className={`text-xs border-border flex items-center justify-center gap-1 col-span-1 px-1 ${
                    postTests[site.id]?.phase === 'publishing' ? 'opacity-70 pointer-events-none' : ''
                  } ${
                    postTests[site.id]?.phase === 'live' || postTests[site.id]?.phase === 'deleted'
                      ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                      : ''
                  }`}
                  onClick={() => {
                    const pt = postTests[site.id];
                    if (!pt || pt.phase === 'idle') publishTestPost(site.id);
                  }}
                  title="Publish a real test post, view it live, then delete it"
                >
                  {postTests[site.id]?.phase === 'publishing'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />
                  }
                  <span className="hidden sm:inline">
                    {postTests[site.id]?.phase === 'live' ? 'Live ✓' : postTests[site.id]?.phase === 'publishing' ? '...' : 'Post'}
                  </span>
                </Button>

                {/* Audit */}
                <Button
                  variant="outline"
                  className="text-xs border-border flex items-center justify-center gap-1 col-span-1 px-1"
                  onClick={() => openDiagnostics(site)}
                  title="Deep audit: plugins, themes, site info"
                >
                  <Search className="w-3 h-3" />
                  <span className="hidden sm:inline">Audit</span>
                </Button>

                {/* Edit */}
                <Button
                  variant="ghost"
                  className="text-xs flex items-center justify-center gap-1 col-span-1 px-1"
                  onClick={() => openEditModal(site)}
                  title="Edit site settings"
                >
                  <Settings2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Site Diagnostics Drawer-like Modal */}
      <Modal
        isOpen={isDiagOpen}
        onClose={() => setIsDiagOpen(false)}
        title={selectedSite ? `Site Audit: ${selectedSite.name}` : "Audit"}
        maxWidth="max-w-5xl w-full"
      >
        <div className="space-y-8 py-2">
          {isFetchingDiag || !diagnostics ? (
            <div className="h-96 flex flex-col items-center justify-center text-muted-foreground animate-pulse">
              <Loader2 className="w-12 h-12 animate-spin text-primary/30 mb-4" />
              <p className="font-bold text-lg">Querying WordPress REST API...</p>
              <p className="text-sm mt-1">Fetching active plugins and themes.</p>
            </div>
          ) : diagnostics?.error ? (
            <div className="h-96 flex flex-col items-center justify-center text-rose-500 text-center p-8 bg-rose-500/5 rounded-3xl border border-rose-500/20 grainy">
              <ShieldAlert className="w-16 h-16 mb-6 opacity-30" />
              <p className="text-xl font-black tracking-tight">Access Denied or Connection Failed</p>
              <p className="text-sm text-rose-500/80 mt-2 max-w-md">{diagnostics.error}</p>
              <Button variant="outline" className="mt-8 border-rose-500/30 font-bold" onClick={() => openDiagnostics(selectedSite)}>Retry Connection</Button>
            </div>
          ) : (
            <>
              {/* Site Info Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-premium grainy p-4 rounded-2xl border border-border">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Site Title</p>
                  <p className="text-lg font-black truncate">{diagnostics.site_info?.title || 'WordPress Site'}</p>
                </div>
                <div className="glass-premium grainy p-4 rounded-2xl border border-border">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Timezone</p>
                  <p className="text-lg font-black">{diagnostics.site_info?.timezone || 'UTC'}</p>
                </div>
                <div className="glass-premium grainy p-4 rounded-2xl border border-border">
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Health Status</p>
                  <p className="text-lg font-black text-emerald-500 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Operational
                  </p>
                </div>
              </div>

              {/* Plugins and Themes Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* PLUGINS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <Box className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-black tracking-tight">Active Plugins</h3>
                    <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {diagnostics.plugins.length}
                    </span>
                  </div>
                  <div className="glass rounded-3xl border border-border overflow-hidden">
                    <div className="max-h-[400px] overflow-x-auto overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-sm border-separate border-spacing-0 min-w-[500px]">
                        <thead className="sticky top-0 bg-secondary backdrop-blur-md z-10 border-b border-border text-foreground">
                          <tr>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plugin Name</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Version</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {diagnostics.plugins.map((p: any, idx: number) => (
                            <tr key={idx} className="hover:bg-primary/5 transition-colors">
                              <td className="px-4 py-3 align-top">
                                <p className="font-bold text-foreground leading-snug">{p.name}</p>
                                <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1 opacity-60" dangerouslySetInnerHTML={{__html: p.description}} />
                              </td>
                              <td className="px-4 py-3 align-top whitespace-nowrap">
                                <span className="text-[11px] font-mono bg-secondary px-2 py-0.5 rounded border border-border">{p.version}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* THEMES */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2">
                    <Layout className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-black tracking-tight">Active Theme</h3>
                  </div>
                  <div className="glass rounded-3xl border border-border overflow-hidden p-6 space-y-6">
                    {diagnostics.themes.filter((t: any) => t.status === 'active').map((t: any, idx: number) => (
                      <div key={idx} className="flex gap-6">
                        <div className="w-40 h-28 shrink-0 bg-secondary rounded-2xl border border-border overflow-hidden relative group">
                          {t.screenshot ? (
                            <img src={t.screenshot} alt={t.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Layout className="w-10 h-10 opacity-10" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Selected Style</p>
                            <h4 className="text-2xl font-black text-foreground mt-1">{t.name}</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-muted-foreground">Version {t.version}</span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Active</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">Other Installed Themes</p>
                      <div className="grid grid-cols-2 gap-3">
                        {diagnostics.themes.filter((t: any) => t.status !== 'active').map((t: any, idx: number) => (
                          <div key={idx} className="p-3 bg-secondary/30 rounded-xl border border-border flex items-center justify-between">
                            <span className="text-xs font-bold truncate pr-2">{t.name}</span>
                            <span className="text-[9px] font-mono opacity-50">{t.version}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <Button className="px-10" onClick={() => setIsDiagOpen(false)}>Close Audit</Button>
          </div>
        </div>
      </Modal>

      {/* Existing Connection Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingSite ? `Edit Site: ${editingSite.name}` : "Connect New Site"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Site Nickname</label>
            <input 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Hiking Adventure Blog"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Platform</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2 text-foreground focus:outline-none"
            >
              <option value="wordpress">WordPress</option>
              <option value="blogger">Blogger</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {formData.type === 'wordpress' ? 'WordPress Site URL' : 'Blogger API URL (Base)'}
            </label>
            <input 
              required
              type="url"
              value={formData.api_url}
              onChange={e => setFormData({...formData, api_url: e.target.value})}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-sm"
              placeholder={formData.type === 'wordpress' ? 'https://yourblog.com' : 'https://myblog.blogspot.com'}
            />
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-primary uppercase tracking-widest">Authentication</h4>
                {formData.type === 'wordpress' && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-black uppercase text-primary">Secure Rest API</span>
                  </div>
                )}
             </div>

             {formData.type === 'wordpress' ? (
                <>
                  <div className="p-3 bg-white/50 border border-primary/10 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-foreground flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-primary" />
                      How to get an App Password?
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Go to your WordPress Admin → <strong>Users</strong> → <strong>Profile</strong>. Scroll to the bottom, enter a name (e.g., "SEO Engine") and click <strong>Add New Application Password</strong>. 
                      <span className="block mt-1 text-primary italic font-medium">Note: Your normal login password will NOT work.</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">WP Username</label>
                      <input 
                        required
                        value={formData.credentials.username}
                        onChange={e => setFormData({...formData, credentials: {...formData.credentials, username: e.target.value}})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                        placeholder="admin"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">App Password</label>
                      <input 
                        required
                        type={editingSite ? "text" : "password"}
                        value={formData.credentials.app_password}
                        onChange={e => setFormData({...formData, credentials: {...formData.credentials, app_password: e.target.value}})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono"
                        placeholder="xxxx xxxx xxxx xxxx"
                      />
                    </div>
                  </div>
                </>
             ) : (
                <>
                  <div className="p-3 bg-white/50 border border-primary/10 rounded-xl space-y-1">
                    <p className="text-[11px] font-bold text-foreground flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-primary" />
                      How to get Blogger credentials?
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Go to <strong>Google Cloud Console</strong> → APIs &amp; Services → Credentials → Create OAuth 2.0 Client ID. Enable the Blogger API. Use the Blog ID from your Blogger dashboard URL (e.g. <code>1234567890</code>).
                      <span className="block mt-1 text-primary italic font-medium">Tip: Add a refresh_token + client_id + client_secret for auto-renewal so tokens never expire.</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Blog ID <span className="text-rose-400">*</span></label>
                      <input
                        required
                        value={formData.credentials.blog_id}
                        onChange={e => setFormData({...formData, credentials: {...formData.credentials, blog_id: e.target.value}})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono"
                        placeholder="1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Client ID (optional)</label>
                      <input
                        value={formData.credentials.client_id}
                        onChange={e => setFormData({...formData, credentials: {...formData.credentials, client_id: e.target.value}})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono"
                        placeholder="*.apps.googleusercontent.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">OAuth Access Token <span className="text-rose-400">*</span></label>
                    <textarea
                      required
                      value={formData.credentials.access_token}
                      onChange={e => setFormData({...formData, credentials: {...formData.credentials, access_token: e.target.value}})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm h-16 font-mono"
                      placeholder="ya29...."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Refresh Token (optional)</label>
                      <input
                        type={editingSite ? "text" : "password"}
                        value={formData.credentials.refresh_token}
                        onChange={e => setFormData({...formData, credentials: {...formData.credentials, refresh_token: e.target.value}})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono"
                        placeholder="1//0g..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Client Secret (optional)</label>
                      <input
                        type={editingSite ? "text" : "password"}
                        value={formData.credentials.client_secret}
                        onChange={e => setFormData({...formData, credentials: {...formData.credentials, client_secret: e.target.value}})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono"
                        placeholder="GOCSPX-..."
                      />
                    </div>
                  </div>
                </>
             )}
          </div>

          <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-4">
             <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
               <TrendingUp className="w-3.5 h-3.5" /> Analytics Configuration
             </h4>
             <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">GA4 Property ID (Optional)</label>
                  <input 
                    value={formData.ga4_property_id}
                    onChange={e => setFormData({...formData, ga4_property_id: e.target.value})}
                    placeholder="e.g. 456841312"
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">GSC Service Account JSON (Optional)</label>
                  <textarea 
                    value={formData.gsc_service_account}
                    onChange={e => setFormData({...formData, gsc_service_account: e.target.value})}
                    placeholder='{"type": "service_account", ...}'
                    className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono h-24 custom-scrollbar"
                  />
                  <p className="text-[9px] text-muted-foreground mt-1">Leave empty to use the system default credentials.</p>
                </div>
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting} className="shadow-lg shadow-primary/20">
              {editingSite ? 'Save Changes' : 'Connect Site'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Blog Picker Modal (after Google OAuth) ──────────────────────────── */}
      <Modal
        isOpen={blogPickerOpen}
        onClose={() => setBlogPickerOpen(false)}
        title="Choose Your Blogger Blog"
      >
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Google sign-in successful. Pick the blog to connect, give it a nickname, and save.
          </p>

          {/* Blog list */}
          <div className="space-y-2">
            {(oauthPayload?.blogs || []).map((blog: any) => (
              <button
                key={blog.id}
                type="button"
                onClick={() => { setPickedBlog(blog); setBlogNickname(blog.name); }}
                className={`w-full text-left px-4 py-3 rounded-2xl border transition-all ${
                  pickedBlog?.id === blog.id
                    ? 'border-orange-500/50 bg-orange-500/8 shadow-sm'
                    : 'border-border hover:border-orange-500/30 hover:bg-orange-500/5'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{blog.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">{blog.url}</p>
                    {blog.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 opacity-70">{blog.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-muted-foreground">{blog.posts} posts</p>
                    {pickedBlog?.id === blog.id && (
                      <CheckCircle2 className="w-4 h-4 text-orange-500 mt-1 ml-auto" />
                    )}
                  </div>
                </div>
              </button>
            ))}

            {!oauthPayload?.blogs?.length && (
              <div className="py-8 text-center text-muted-foreground">
                <p className="font-bold">No Blogger blogs found on this Google account.</p>
                <p className="text-sm mt-1">Create a blog at blogger.com first, then reconnect.</p>
              </div>
            )}
          </div>

          {/* Nickname input */}
          {pickedBlog && (
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                Site Nickname
              </label>
              <input
                value={blogNickname}
                onChange={e => setBlogNickname(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g. Travel Blog"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Blog ID: <code className="font-mono">{pickedBlog.id}</code> — tokens saved automatically.
              </p>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setBlogPickerOpen(false)}>Cancel</Button>
            <Button
              onClick={saveBloggerSite}
              isLoading={isSavingBlog}
              disabled={!pickedBlog}
              className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/25"
            >
              Connect This Blog
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function SitesPage() {
  return (
    <Suspense fallback={null}>
      <SitesPageInner />
    </Suspense>
  );
}
