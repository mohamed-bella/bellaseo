'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, LayoutGrid, Search, Trash2, ArrowLeft, MoreHorizontal, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import apiClient from '@/services/apiClient';

export default function ClustersPage() {
  const { id: campaignId } = useParams();
  const [clusters, setClusters] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [clustRes, keyRes] = await Promise.all([
        apiClient.get(`/clusters?campaign_id=${campaignId}`),
        apiClient.get(`/keywords?campaign_id=${campaignId}`)
      ]);
      setClusters(clustRes.data);
      setKeywords(keyRes.data);
    } catch (err) {
      console.error('Failed to fetch clusters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/clusters', { ...formData, campaign_id: campaignId });
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      fetchData();
    } catch (err) {
      console.error('Failed to create cluster:', err);
    }
  };

  const assignToCluster = async (keywordId: string, clusterId: string | null) => {
    try {
      await apiClient.put(`/keywords/${keywordId}`, { cluster_id: clusterId });
      fetchData();
    } catch (err) {
      console.error('Assignment failed:', err);
    }
  };

  const setAsPillar = async (keywordId: string, isPillar: boolean) => {
    try {
      await apiClient.put(`/keywords/${keywordId}`, { is_pillar: isPillar });
      fetchData();
    } catch (err) {
      console.error('Pillar set failed:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => window.location.href='/campaigns'}>
              <ArrowLeft className="w-5 h-5" />
           </Button>
           <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Silos & Clusters</h1>
              <p className="text-muted-foreground mt-1">Organize keywords into topical authority silos.</p>
           </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Cluster
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clusters List */}
        <div className="md:col-span-1 space-y-4">
           <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" /> Clusters
           </h2>
           {clusters.map(cluster => (
              <div key={cluster.id} className="glass p-4 rounded-xl border border-border hover:border-primary/30 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                     <h3 className="font-bold text-foreground">{cluster.name}</h3>
                     <span className="text-[10px] bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                        {keywords.filter(k => k.cluster_id === cluster.id).length} items
                     </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{cluster.description}</p>
              </div>
           ))}
           {clusters.length === 0 && (
              <div className="text-center py-12 glass rounded-xl border border-dashed border-border">
                 <p className="text-xs text-muted-foreground">No clusters created yet.</p>
              </div>
           )}
        </div>

        {/* Keywords Table for Silo Mapping */}
        <div className="md:col-span-2 space-y-4">
           <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4" /> Keyword Silo Mapping
           </h2>
           <div className="glass rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-secondary/50 text-[10px] font-bold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Keyword</th>
                    <th className="px-4 py-3 text-center">Pillar</th>
                    <th className="px-4 py-3">Cluster Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {keywords.map(k => (
                    <tr key={k.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">{k.main_keyword}</td>
                      <td className="px-4 py-3 text-center">
                         <button 
                           onClick={() => setAsPillar(k.id, !k.is_pillar)}
                           className={`p-1 rounded transition-all ${k.is_pillar ? 'text-primary bg-primary/10' : 'text-muted-foreground grayscale opacity-30 hover:opacity-100 hover:grayscale-0'}`}
                         >
                            <Zap className="w-4 h-4" />
                         </button>
                      </td>
                      <td className="px-4 py-3">
                         <select 
                           value={k.cluster_id || ''}
                           onChange={(e) => assignToCluster(k.id, e.target.value || null)}
                           className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground outline-none w-full"
                         >
                            <option value="">Unassigned</option>
                            {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                      </td>
                    </tr>
                  ))}
                  {keywords.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground italic">No keywords in this campaign.</td></tr>
                  )}
                </tbody>
              </table>
           </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Topical Cluster">
         <form onSubmit={handleSubmit} className="space-y-4">
            <div>
               <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Cluster Name</label>
               <input 
                 required
                 value={formData.name}
                 onChange={e => setFormData({...formData, name: e.target.value})}
                 className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
                 placeholder="e.g. Technical SEO Tips"
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Description</label>
               <textarea 
                 value={formData.description}
                 onChange={e => setFormData({...formData, description: e.target.value})}
                 className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary h-24"
                 placeholder="Main topic objective for this cluster..."
               />
            </div>
            <div className="flex justify-end gap-3 pt-4">
               <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
               <Button type="submit">Create Cluster</Button>
            </div>
         </form>
      </Modal>
    </div>
  );
}
