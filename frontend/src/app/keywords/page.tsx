'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Key, Filter, MoreHorizontal, Edit, Trash2, Zap, LayoutGrid, Trash, Radar, TrendingUp, Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import apiClient from '@/services/apiClient';
import { KEYWORD_STATUS } from '@/lib/constants';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-500 bg-amber-500/10 border-amber-500/10',
  in_progress: 'text-primary bg-primary/10 border-primary/10',
  done: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/10',
  failed: 'text-rose-500 bg-rose-500/10 border-rose-500/10',
};

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [activeResearch, setActiveResearch] = useState<any>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    campaign_id: '',
    cluster_id: '',
    main_keyword: '',
    secondary_keywords: '',
    intent: 'informational',
    difficulty: 'medium',
    is_pillar: false
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: kData }, { data: cData }, { data: clData }] = await Promise.all([
        apiClient.get('/keywords'),
        apiClient.get('/campaigns'),
        apiClient.get('/clusters')
      ]);
      setKeywords(kData);
      setCampaigns(cData);
      setClusters(clData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL keywords? This cannot be undone.')) return;
    try {
      await apiClient.delete('/keywords/bulk/clear');
      fetchData();
    } catch (err) {
      console.error('Failed to clear keywords:', err);
    }
  };
  const openModal = (keyword: any = null) => {
    if (keyword) {
      setEditingKeyword(keyword);
      setFormData({
        campaign_id: keyword.campaign_id,
        cluster_id: keyword.cluster_id || '',
        main_keyword: keyword.main_keyword,
        secondary_keywords: Array.isArray(keyword.secondary_keywords) ? keyword.secondary_keywords.join(', ') : (keyword.secondary_keywords || ''),
        intent: keyword.intent || 'informational',
        difficulty: keyword.difficulty || 'medium',
        is_pillar: keyword.is_pillar || false
      });
    } else {
      setEditingKeyword(null);
      setFormData({ 
        campaign_id: '', cluster_id: '', main_keyword: '', 
        secondary_keywords: '', intent: 'informational', difficulty: 'medium', is_pillar: false 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        secondary_keywords: formData.secondary_keywords.split(',').map(s => s.trim()).filter(s => s)
      };
      
      if (editingKeyword) {
        await apiClient.put(`/keywords/${editingKeyword.id}`, payload);
      } else {
        await apiClient.post('/keywords', payload);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save keyword:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const runQuickResearch = async (k: any) => {
    setResearchLoading(true);
    setIsResearchModalOpen(true);
    setActiveResearch({ keyword: k.main_keyword, id: k.id });
    try {
      const { data } = await apiClient.post('/keywords/research', { keyword: k.main_keyword });
      setActiveResearch({ ...data, id: k.id });
    } catch (err) {
      console.error('Research failed:', err);
      toast.error('Failed to analyze keyword');
      setIsResearchModalOpen(false);
    } finally {
      setResearchLoading(false);
    }
  };

  const saveResearchToKeyword = async () => {
    if (!activeResearch?.id) return;
    try {
      await apiClient.put(`/keywords/${activeResearch.id}`, {
        volume_score: activeResearch.volume_score,
        kd: activeResearch.kd,
      });
      fetchData();
      setIsResearchModalOpen(false);
      toast.success('Metrics saved to database!');
    } catch (err) {
      console.error('Failed to save metrics:', err);
      toast.error('Failed to save metrics');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete any generated articles.`)) return;
    try {
      await apiClient.delete(`/keywords/${id}`);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const filteredKeywords = keywords.filter(k => {
    const matchesSearch = k.main_keyword.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCampaign = !selectedCampaign || k.campaign_id === selectedCampaign;
    return matchesSearch && matchesCampaign;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight text-shadow-sm">Keywords</h1>
          <p className="text-muted-foreground mt-1 text-lg">Build and track your topical authority clusters.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <Button variant="outline" className="px-4 border-primary/20 text-primary hover:bg-primary/5 flex-1 sm:flex-none justify-start sm:justify-center" onClick={() => window.location.href='/keyword-research'}>
            <Radar className="w-4 h-4 mr-2" /> Global Engine
          </Button>
          <Button variant="outline" className="flex items-center gap-2 border-rose-500/20 text-rose-500 hover:bg-rose-500/10 flex-1 sm:flex-none justify-start sm:justify-center" onClick={handleClearAll}>
            <Trash className="w-4 h-4" /> Clear MasterDB
          </Button>
          <Button onClick={() => openModal()} className="flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex-1 sm:flex-none justify-start sm:justify-center">
            <Plus className="w-4 h-4" /> Add Keyword
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between glass p-4 rounded-xl border border-white/5 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search keywords..." 
              className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-foreground"
            />
          </div>
          <select 
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
            className="bg-secondary/50 border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all"
          >
            <option value="">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-1 rounded border border-border">
               {filteredKeywords.length} results
            </span>
        </div>
      </div>

      <div className="glass rounded-xl border border-border overflow-x-auto custom-scrollbar shadow-2xl">
        <table className="w-full text-left min-w-[900px]">
          <thead className="bg-secondary/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
            <tr>
              <th className="px-6 py-4">Main Keyword</th>
              <th className="px-6 py-4">Campaign / Cluster</th>
              <th className="px-6 py-4">Metrics (AI)</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
               <tr><td colSpan={5} className="px-6 py-20 text-center text-muted-foreground animate-pulse italic">Gathering intelligence...</td></tr>
            ) : filteredKeywords.length === 0 ? (
               <tr><td colSpan={5} className="px-6 py-20 text-center text-muted-foreground italic">No matches found in your keyword list.</td></tr>
            ) : filteredKeywords.map((k) => (
              <tr key={k.id} className="hover:bg-secondary/20 transition-colors group">
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{k.main_keyword}</span>
                      {k.is_pillar && (
                        <span title="Topical Pillar">
                          <Zap className="w-3 h-3 text-primary" />
                        </span>
                      )}
                   </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                     <span className="text-xs text-foreground/70">{campaigns.find(c => c.id === k.campaign_id)?.name || 'N/A'}</span>
                     {k.cluster_id && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                           <LayoutGrid className="w-2.5 h-2.5" />
                           {clusters.find(cl => cl.id === k.cluster_id)?.name}
                        </span>
                     )}
                  </div>
                </td>
                 <td className="px-6 py-4">
                   <div className="flex items-center gap-4">
                      {k.volume_score !== undefined ? (
                         <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Volume</span>
                            <span className="text-xs text-foreground font-mono">{k.volume_score}</span>
                         </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> No Data
                        </div>
                      )}
                      
                      {k.kd !== undefined && (
                        <div className="flex flex-col border-l border-border pl-3">
                           <span className="text-[10px] uppercase font-bold text-muted-foreground">KD</span>
                           <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${k.kd > 60 ? 'bg-rose-500' : k.kd > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              <span className="text-xs text-foreground/70 font-mono">{k.kd}</span>
                           </div>
                        </div>
                      )}

                      {!k.volume_score && (
                        <button 
                          onClick={() => runQuickResearch(k)} 
                          className="text-[9px] font-black uppercase text-primary hover:underline"
                        >
                          Run AI Audit
                        </button>
                      )}
                   </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[k.status] || ''}`}>
                    {k.status.replace('_', ' ')}
                  </span>
                </td>
                 <td className="px-6 py-4 text-right">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => runQuickResearch(k)} title="Live Audit" className="h-9 w-9">
                         <Radar className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openModal(k)} title="Edit Keyword" className="h-9 w-9">
                         <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="group/del h-9 w-9" onClick={() => handleDelete(k.id, k.main_keyword)} title="Delete Keyword">
                         <Trash2 className="w-4 h-4 text-muted-foreground group-hover/del:text-rose-500" />
                      </Button>
                    </div>
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingKeyword ? `Edit: ${editingKeyword.main_keyword}` : "Add New SEO Keyword"}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Target Campaign</label>
               <select 
                 required
                 value={formData.campaign_id}
                 onChange={e => setFormData({...formData, campaign_id: e.target.value})}
                 className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
               >
                 <option value="">Select a campaign</option>
                 {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Topical Cluster</label>
               <select 
                 value={formData.cluster_id}
                 onChange={e => setFormData({...formData, cluster_id: e.target.value})}
                 className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
               >
                 <option value="">No Cluster (Loose)</option>
                 {clusters.filter(cl => !formData.campaign_id || cl.campaign_id === formData.campaign_id).map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.name}</option>
                 ))}
               </select>
             </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Primary Keyword</label>
            <input 
              required
              value={formData.main_keyword}
              onChange={e => setFormData({...formData, main_keyword: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. best hiking boots 2024"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Secondary Keywords (LSI / Semantic)</label>
            <textarea 
              value={formData.secondary_keywords}
              onChange={e => setFormData({...formData, secondary_keywords: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-20"
              placeholder="e.g. durable footwear, outdoor gear review, waterproof boots..."
            />
            <p className="text-[10px] text-muted-foreground mt-1 italic">Separate keywords with commas.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Search Intent</label>
              <select 
                value={formData.intent}
                onChange={e => setFormData({...formData, intent: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="informational">Informational</option>
                <option value="commercial">Commercial</option>
                <option value="transactional">Transactional</option>
                <option value="navigational">Navigational</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">KD / Priority</label>
              <select 
                value={formData.difficulty}
                onChange={e => setFormData({...formData, difficulty: e.target.value})}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="easy">Easy (Quick Win)</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard (Pillar)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border">
             <input 
               type="checkbox"
               id="is_pillar"
               checked={formData.is_pillar}
               onChange={e => setFormData({...formData, is_pillar: e.target.checked})}
               className="w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary"
             />
             <label htmlFor="is_pillar" className="text-xs font-bold text-foreground cursor-pointer select-none">
                Designate as Pillar (Cornerstone Content)
             </label>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>{editingKeyword ? "Save Changes" : "Create Keyword"}</Button>
          </div>
        </form>
      </Modal>

      {/* Research Results Modal */}
      <Modal 
        isOpen={isResearchModalOpen} 
        onClose={() => setIsResearchModalOpen(false)} 
        title={`AI Analysis: ${activeResearch?.keyword}`}
      >
        <div className="space-y-6">
          {researchLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-muted-foreground animate-pulse">Running Deep SERP Analysis...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-secondary/50 border border-border text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Estimated Volume</p>
                  <p className="text-3xl font-black text-foreground">{activeResearch?.volume_score}</p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/50 border border-border text-center">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Difficulty (KD)</p>
                  <p className={`text-3xl font-black ${activeResearch?.kd > 60 ? 'text-rose-500' : activeResearch?.kd > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {activeResearch?.kd}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Topical Opportunity</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Targeting <span className="font-bold text-foreground">"{activeResearch?.keyword}"</span> is highly 
                  {activeResearch?.kd < 40 ? ' recommended for quick organic traffic wins.' : ' competitive but essential for topical authority.'}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setIsResearchModalOpen(false)}>Close</Button>
                <Button onClick={saveResearchToKeyword} className="flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Save Metrics to MasterDB
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
