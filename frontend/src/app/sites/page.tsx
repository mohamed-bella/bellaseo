'use client';

import { useEffect, useState } from 'react';
import { 
  Globe, Plus, Trash2, ShieldCheck, ShieldAlert, 
  ExternalLink, Settings2, Activity, Box, Layout, 
  Info, Loader2, Search, CheckCircle2, XCircle, TrendingUp
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import apiClient from '@/services/apiClient';

export default function SitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Diagnostics State
  const [isDiagOpen, setIsDiagOpen] = useState(false);
  const [isFetchingDiag, setIsFetchingDiag] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [selectedSite, setSelectedSite] = useState<any>(null);

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
          username: data.credentials?.username || '',
          app_password: data.credentials?.app_password || '',
          blog_id: data.credentials?.blog_id || '',
          access_token: data.credentials?.access_token || '',
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
       credentials: { username: '', app_password: '', blog_id: '', access_token: '' } 
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
    try {
      const { data } = await apiClient.get(`/sites/${id}/test`);
      if (data.success) alert(`Connected! Authorized as: ${data.user || 'Site Admin'}`);
      else alert(`Connection failed: ${data.error}`);
    } catch (err) {
      alert('Connection test error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/50">
            Connected Sites
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Manage your WordPress and Blogger publishing destinations.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          Add Site
        </Button>
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

            <div className="mt-8 pt-6 grid grid-cols-2 gap-3 border-t border-border">
                <Button 
                  variant="outline" 
                  className="text-xs border-border flex items-center justify-center gap-2"
                  onClick={() => openDiagnostics(site)}
                >
                  <Search className="w-3.5 h-3.5" /> Deep Audit
                </Button>
                <Button 
                  variant="ghost" 
                  className="text-xs flex items-center justify-center gap-2"
                  onClick={() => openEditModal(site)}
                >
                   <Settings2 className="w-3.5 h-3.5" /> Settings
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
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-sm border-separate border-spacing-0">
                        <thead className="sticky top-0 bg-secondary/80 backdrop-blur-md z-10 border-b border-border">
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
              placeholder={formData.type === 'wordpress' ? 'https://yourblog.com' : 'https://www.googleapis.com/blogger/v3'}
            />
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
             <h4 className="text-xs font-black text-primary uppercase tracking-widest">Authentication</h4>
             {formData.type === 'wordpress' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Username</label>
                      <input 
                        required
                        value={formData.credentials.username}
                        onChange={e => setFormData({...formData, credentials: {...formData.credentials, username: e.target.value}})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">App Password</label>
                      <input 
                        required
                        type={editingSite ? "text" : "password"}
                        value={formData.credentials.app_password}
                        onChange={e => setFormData({...formData, credentials: {...formData.credentials, app_password: e.target.value}})}
                        className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                </>
             ) : (
                <>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Blog ID</label>
                    <input 
                      required
                      value={formData.credentials.blog_id}
                      onChange={e => setFormData({...formData, credentials: {...formData.credentials, blog_id: e.target.value}})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">OAuth Access Token</label>
                    <textarea 
                      required
                      value={formData.credentials.access_token}
                      onChange={e => setFormData({...formData, credentials: {...formData.credentials, access_token: e.target.value}})}
                      className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm h-20"
                    />
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
    </div>
  );
}
