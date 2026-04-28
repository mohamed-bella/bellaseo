'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Zap, LayoutGrid, List, Play, Pause, Trash, FolderKanban, Rocket } from 'lucide-react';
import { FcFolder } from 'react-icons/fc';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import apiClient from '@/services/apiClient';

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  paused: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  completed: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  archived: 'text-muted-foreground bg-secondary border-border',
};

const STATUS_LABELS: Record<string, string> = {
  active: '▶ Active',
  paused: '⏸ Paused',
  completed: '✓ Completed',
  archived: 'Archived',
};

const PROMPT_TEMPLATES = [
  {
    name: '🏆 SEO Pillar Post (Comprehensive)',
    template: `# Ultimate Guide to {{keyword}}\n\n## Overview\n[Briefly introduce {{keyword}} and why it matters in 2024]\n\n## Core Concepts\n[Explain the fundamental principles of {{keyword}}]\n\n## Step-by-Step Implementation\n[Detailed guide on how to master {{keyword}}]\n\n## Common Pitfalls to Avoid\n[Expert advice on what to watch out for]\n\n## Conclusion\n[Final thoughts and next steps]`
  },
  {
    name: '⚖️ Product Comparison (A vs B)',
    template: `# {{keyword}}: Which One Wins?\n\n## Introduction\n[Set the stage for the comparison between the top contenders]\n\n## Feature Breakdown\n- **Ease of Use**: [Compare user experience]\n- **Pricing**: [Value for money analysis]\n- **Performance**: [Speed and reliability check]\n\n## Pros & Cons\n[Highlight the strengths and weaknesses of each]\n\n## Final Verdict\n[Recommend the best option for different user types]`
  },
  {
    name: '🛠 Technical "How-To" Guide',
    template: `# How to Successfully {{keyword}}\n\n## Prerequisites\n[What you need before you start]\n\n## Step 1: Preparation\n[Detailed setup instructions]\n\n## Step 2: Implementation\n[The core process of {{keyword}} with code/technical details]\n\n## Step 3: Verification\n[How to check if it worked]\n\n## Summary\n[Quick recap and troubleshooting tips]`
  }
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [postTypes, setPostTypes] = useState<any[]>([
    { slug: 'post', name: 'Posts' },
    { slug: 'page', name: 'Pages' },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [triggerMessage, setTriggerMessage] = useState<{ id: string; msg: string; isError: boolean } | null>(null);

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
    language: 'english',
    tone: 'professional'
  });

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const [campRes, siteRes] = await Promise.all([
        apiClient.get('/campaigns'),
        apiClient.get('/sites'),
      ]);
      setCampaigns(campRes.data);
      setSites(siteRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL projects? This cannot be undone.')) return;
    try {
      await apiClient.delete('/campaigns/bulk/clear');
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to clear projects:', err);
    }
  };

  useEffect(() => {
    if (formData.target_site_id) {
      const selectedSite = sites.find((s) => s.id === formData.target_site_id);
      if (selectedSite?.type === 'wordpress') {
        apiClient
          .get(`/sites/${formData.target_site_id}/post-types`)
          .then((res) => {
            const types = res.data;
            setPostTypes(types);
            
            // Validate current target_cpt against new types
            if (formData.target_cpt !== 'post' && formData.target_cpt !== 'page') {
              const stillExists = types.some((t: any) => t.slug === formData.target_cpt);
              if (!stillExists) {
                console.warn(`Post type ${formData.target_cpt} not found on new site. Resetting to 'post'.`);
                setFormData(prev => ({ ...prev, target_cpt: 'post' }));
              }
            }
          })
          .catch(() => setPostTypes([{ slug: 'post', name: 'Posts' }, { slug: 'page', name: 'Pages' }]));
      } else {
        setPostTypes([{ slug: 'post', name: 'Posts' }]);
        if (formData.target_cpt !== 'post') setFormData(prev => ({ ...prev, target_cpt: 'post' }));
      }
    } else {
      setPostTypes([{ slug: 'post', name: 'Posts' }, { slug: 'page', name: 'Pages' }]);
    }
  }, [formData.target_site_id, sites]);

  const openModal = (campaign: any = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name,
        niche: campaign.niche,
        schedule_type: campaign.schedule_type,
        target_word_count: campaign.target_word_count || 1500,
        article_style: campaign.article_style || 'informative',
        prompt_template: campaign.prompt_template || '',
        target_site_id: campaign.target_site_id || '',
        target_cpt: campaign.target_cpt || 'post',
        cron_time: campaign.cron_time || '09:00',
        cron_timezone: campaign.cron_timezone || 'Africa/Casablanca',
        posts_per_run: campaign.posts_per_run || 1,
        language: campaign.language || 'english',
        tone: campaign.tone || 'professional',
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '', niche: '', schedule_type: 'manual',
        target_word_count: 1500, article_style: 'informative',
        prompt_template: '', target_site_id: '', target_cpt: 'post',
        cron_time: '09:00', cron_timezone: 'Africa/Casablanca', posts_per_run: 1,
        language: 'english', tone: 'professional'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingCampaign(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCampaign) {
        await apiClient.put(`/campaigns/${editingCampaign.id}`, formData);
      } else {
        await apiClient.post('/campaigns', formData);
      }
      handleCloseModal();
      fetchCampaigns();
    } catch (err) {
      console.error('Failed to save project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"? All associated keywords will be lost.`)) return;
    try {
      await apiClient.delete(`/campaigns/${id}`);
      fetchCampaigns();
    } catch (err) { console.error('Delete failed:', err); }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await apiClient.put(`/campaigns/${id}`, { status: newStatus });
      fetchCampaigns();
    } catch (err) { console.error('Failed to update status:', err); }
  };

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkJson, setBulkJson] = useState('');

  const loadDemoJson = () => {
    const demo = {
      campaign: { name: 'Semrush Tech Project', niche: 'AI & Technology', target_word_count: 2000, article_style: 'informative' },
      clusters: [
        { name: 'AI Frameworks', description: 'Analysis of modern AI libraries', keywords: [{ main_keyword: 'best machine learning frameworks', difficulty: 'hard', is_pillar: true }, { main_keyword: 'tensorflow vs pytorch 2024', difficulty: 'medium' }] },
        { name: 'Edge Computing', keywords: [{ main_keyword: 'benefits of edge computing', difficulty: 'medium', is_pillar: true }] },
      ],
    };
    setBulkJson(JSON.stringify(demo, null, 2));
  };

  const handleBulkImport = async () => {
    try {
      const data = JSON.parse(bulkJson);
      setIsSubmitting(true);
      await apiClient.post('/campaigns/bulk', data);
      setIsBulkModalOpen(false);
      setBulkJson('');
      fetchCampaigns();
      alert('Import complete! Your project and topics are ready.');
    } catch (err: any) {
      alert('Import failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerWorkflow = async (id: string) => {
    setTriggeringId(id);
    setTriggerMessage(null);
    try {
      await apiClient.post('/workflows/trigger', { campaign_id: id, type: 'article_generation' });
      setTriggerMessage({ id, msg: '✍️ AI is now writing articles! Check the Automation Engine for live status.', isError: false });
    } catch (err: any) {
      setTriggerMessage({ id, msg: err.response?.data?.error || 'Failed to start. Please try again.', isError: true });
    } finally {
      setTriggeringId(null);
      setTimeout(() => setTriggerMessage(null), 6000);
    }
  };

  const filtered = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.niche || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto py-8 px-4 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-[#E5E8EB] pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#1A1D23] tracking-tighter flex items-center gap-3">
            <FolderKanban className="w-8 h-8 text-[#FF642D]" />
            Project Hub
          </h1>
          <p className="text-[#6B7280] font-medium mt-1 text-sm">
            Central repository for your SEO clusters. Add topics, then deploy the AI automation engine.
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex items-center gap-2 text-sm border-[#E5E8EB] text-[#1A1D23] hover:bg-[#F9FAFB] font-bold px-6 py-6 rounded-xl transition-all"
            onClick={() => setIsBulkModalOpen(true)}
          >
            Import JSON
          </Button>
          <Button onClick={() => openModal()} className="flex items-center gap-2 text-sm font-bold px-6 py-6 rounded-xl bg-[#1A1D23] hover:bg-[#FF642D] transition-all group">
            <Plus className="w-4 h-4 text-[#FF642D] group-hover:text-white transition-colors" />
            Deploy Project
          </Button>
        </div>
      </div>

      {/* Inline trigger message */}
      {triggerMessage && (
        <div className={`px-4 py-3 rounded-xl border text-sm font-medium animate-in fade-in duration-300 ${triggerMessage.isError ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          {triggerMessage.msg}
        </div>
      )}

      {/* Bulk Import Modal */}
      <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="Import Project from JSON">
        <div className="space-y-4">
          <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl text-xs text-muted-foreground leading-relaxed">
            Paste a JSON object describing your campaign structure, including keyword clusters. This lets you set up a full project in one go.
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Paste Your JSON</p>
            <button onClick={loadDemoJson} className="text-[10px] text-primary hover:underline font-bold uppercase">
              Load Example
            </button>
          </div>
          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            className="w-full h-80 bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-emerald-400 focus:ring-1 focus:ring-primary outline-none custom-scrollbar"
            placeholder='{ "campaign": { ... }, "clusters": [ ... ] }'
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsBulkModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkImport} isLoading={isSubmitting}>Import & Save Project</Button>
          </div>
        </div>
      </Modal>

      {/* Search & View Controls */}
      <div className="flex items-center justify-between bg-white border border-[#E5E8EB] p-3 rounded-2xl shadow-sm">
        <div className="relative w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deployed projects..."
            className="w-full bg-[#F3F4F6] border-none rounded-xl pl-11 pr-4 py-3 text-sm text-[#1A1D23] focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 transition-all font-medium placeholder:text-[#9CA3AF]"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-[#9CA3AF] hover:text-[#1A1D23] bg-[#F9FAFB] border border-[#E5E8EB]"><LayoutGrid className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="bg-[#1A1D23] text-white hover:bg-[#FF642D]"><List className="w-4 h-4" /></Button>
          <div className="w-px h-8 bg-[#E5E8EB] mx-2" />
          <Button
            variant="outline"
            className="flex items-center gap-1.5 text-rose-500 border-rose-100 hover:bg-rose-50 font-bold px-4 rounded-xl"
            onClick={handleClearAll}
          >
            <Trash className="w-4 h-4" />
            Nuke All Projects
          </Button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white border border-[#E5E8EB] rounded-2xl mt-6 overflow-hidden shadow-sm">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-[#F9FAFB] text-[11px] font-black uppercase tracking-widest text-[#9CA3AF] border-b border-[#E5E8EB]">
            <tr>
              <th className="px-6 py-5">Project Matrix</th>
              <th className="px-6 py-5">Target Niche</th>
              <th className="px-6 py-5">Engine Status</th>
              <th className="px-6 py-5 text-right">Commands</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E8EB]">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-[#9CA3AF] font-bold border-none">Syncing database...</td></tr>
            ) : filtered.length === 0 && campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} className="border-none">
                  <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                    <div className="w-16 h-16 rounded-[20px] bg-[#FFF5F0] border border-[#FF642D]/20 flex items-center justify-center mb-6">
                      <FolderKanban className="w-8 h-8 text-[#FF642D]" />
                    </div>
                    <p className="text-xl font-black text-[#1A1D23] mb-2 tracking-tight">No Active Projects</p>
                    <p className="text-sm font-medium text-[#6B7280] mb-8 max-w-sm">
                      Initialize your first SEO project to begin generating massive organic traffic.
                    </p>
                    <Button onClick={() => openModal()} className="flex items-center gap-2 bg-[#1A1D23] hover:bg-[#FF642D] px-8 py-6 rounded-xl font-bold transition-all shadow-lg text-white">
                      <Plus className="w-4 h-4" />
                      Initialize First Project
                    </Button>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-[#9CA3AF] font-bold border-none">No intelligence matches your query.</td></tr>
            ) : (
              filtered.map((c) => (
                <tr 
                  key={c.id} 
                  className="hover:bg-[#F9FAFB] transition-colors group cursor-pointer"
                  onClick={() => window.location.href = `/campaigns/${c.id}`}
                  title="Open Project Database"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E8EB] flex items-center justify-center shadow-sm group-hover:border-[#FF642D] transition-colors">
                        <FcFolder className="w-5 h-5 flex-shrink-0" />
                      </div>
                      <span className="font-black text-[#1A1D23] group-hover:text-[#FF642D] transition-colors text-[15px]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[#6B7280] text-sm font-semibold max-w-[250px] truncate">{c.niche}</td>
                  <td className="px-6 py-5">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${STATUS_COLORS[c.status] || ''}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Main CTA: Open Hub */}
                      <Button
                        className="flex items-center justify-center gap-2 text-xs font-bold bg-[#F9FAFB] hover:bg-[#FF642D] text-[#1A1D23] hover:text-white border border-[#E5E8EB] hover:border-[#FF642D] px-4 py-2 rounded-xl transition-all w-full sm:w-auto"
                        onClick={() => window.location.href = `/campaigns/${c.id}`}
                      >
                        <span className="hidden sm:inline">Open Workspace</span>
                        <span className="sm:hidden">Workspace</span>
                        <Rocket className="w-3.5 h-3.5" />
                      </Button>

                      <div className="w-px h-6 bg-[#E5E8EB] mx-2 hidden sm:block" />

                      <div className="flex items-center gap-1 justify-end">
                        {/* Pause / Resume */}
                        <button
                          title={c.status === 'active' ? 'Pause auto-posting' : 'Resume auto-posting'}
                          onClick={() => handleToggleStatus(c.id, c.status)}
                          className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-[#F3F4F6] transition-colors"
                        >
                          {c.status === 'active'
                            ? <Pause className="w-4 h-4 text-amber-500" />
                            : <Play className="w-4 h-4 text-emerald-500" />}
                        </button>

                        {/* Edit: Redirect to Studio */}
                        <button onClick={() => window.location.href = `/campaigns/${c.id}/edit`} title="Open Project Studio" className="flex items-center justify-center w-9 h-9 rounded-xl text-[#9CA3AF] hover:text-[#1A1D23] hover:bg-[#F3F4F6] transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          className="flex items-center justify-center w-9 h-9 rounded-xl text-[#9CA3AF] hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          onClick={() => handleDelete(c.id, c.name)}
                          title="Delete this project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create New Project"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[11px] font-black text-[#9CA3AF] uppercase mb-2 tracking-widest">
                Project Name
              </label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#F9FAFB] border border-[#E5E8EB] hover:border-[#D1D5DB] rounded-xl px-4 py-3 text-[13px] text-[#1A1D23] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D] transition-all"
                placeholder="e.g. Travel Blog 2024"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[11px] font-black text-[#9CA3AF] uppercase mb-2 tracking-widest">
                What is this project about? (Niche/Topic)
              </label>
              <textarea
                required
                rows={2}
                value={formData.niche}
                onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                className="w-full bg-[#F9FAFB] border border-[#E5E8EB] hover:border-[#D1D5DB] rounded-xl px-4 py-3 text-[13px] text-[#1A1D23] font-medium focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D] transition-all custom-scrollbar"
                placeholder="e.g. Sustainable Travel in North Africa, focusing on eco-friendly hotels and local culture."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-[#9CA3AF] uppercase mb-2 tracking-widest">
                When should the AI run?
              </label>
              <select
                value={formData.schedule_type}
                onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                className="w-full bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl px-4 py-3 text-[13px] text-[#1A1D23] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D] transition-all appearance-none"
              >
                <option value="manual">Manual (I&apos;ll trigger it myself)</option>
                <option value="hourly">Automatically — Every Hour</option>
                <option value="daily">Automatically — Once a Day</option>
                <option value="weekly">Automatically — Once a Week</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-[#9CA3AF] uppercase mb-2 tracking-widest">
                Which website should it post to?
              </label>
              <select
                value={formData.target_site_id}
                onChange={(e) => setFormData({ ...formData, target_site_id: e.target.value })}
                className="w-full bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl px-4 py-3 text-[13px] text-[#1A1D23] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D] transition-all appearance-none"
              >
                <option value="">No site selected yet</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                ))}
              </select>
              {sites.length === 0 && (
                <p className="text-[10px] text-amber-500 mt-1">
                  ⚠ No sites connected yet.{' '}
                  <a href="/sites" className="underline">Connect one first →</a>
                </p>
              )}
            </div>
          </div>

          {formData.schedule_type !== 'manual' && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-xl border border-border">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Run Time</label>
                <input
                  type="time"
                  value={formData.cron_time}
                  onChange={(e) => setFormData({ ...formData, cron_time: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Timezone</label>
                <select
                  value={formData.cron_timezone}
                  onChange={(e) => setFormData({ ...formData, cron_timezone: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="Africa/Casablanca">Africa/Casablanca</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Articles per Run</label>
                <input
                  type="number"
                  min={1} max={50}
                  value={formData.posts_per_run}
                  onChange={(e) => setFormData({ ...formData, posts_per_run: parseInt(e.target.value) })}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div className="p-5 bg-white border items-center border-[#E5E8EB] rounded-2xl space-y-5 shadow-sm mt-4">
            <h4 className="text-[11px] font-black text-[#1A1D23] uppercase tracking-widest flex items-center gap-2 border-b border-[#E5E8EB] pb-3">
              <Zap className="w-4 h-4 text-[#FF642D]" /> AI Writing Settings
            </h4>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] uppercase font-black text-[#9CA3AF] mb-2 tracking-wide">
                  How long should each article be? (words)
                </label>
                <input
                  type="number"
                  value={formData.target_word_count}
                  onChange={(e) => setFormData({ ...formData, target_word_count: parseInt(e.target.value) })}
                  className="w-full bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl px-4 py-3 text-[13px] text-[#1A1D23] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-black text-[#9CA3AF] mb-2 tracking-wide">
                  Writing Style
                </label>
                <select
                  value={formData.article_style}
                  onChange={(e) => setFormData({ ...formData, article_style: e.target.value })}
                  className="w-full bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl px-4 py-3 text-[13px] text-[#1A1D23] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 appearance-none"
                >
                  <option value="informative">Informative / Wiki-style</option>
                  <option value="conversational">Conversational / Blog-style</option>
                  <option value="technical">Technical / How-to Guide</option>
                  <option value="creative">Creative / Storytelling</option>
                  <option value="professional">Professional / News-style</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 mt-4">
              <div>
                <label className="block text-[11px] uppercase font-black text-[#9CA3AF] mb-2 tracking-wide">
                  Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl px-4 py-3 text-[13px] text-[#1A1D23] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 appearance-none"
                >
                  <option value="english">English (US)</option>
                  <option value="uk_english">English (UK)</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                  <option value="arabic">Arabic</option>
                  <option value="italian">Italian</option>
                  <option value="dutch">Dutch</option>
                  <option value="portuguese">Portuguese</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase font-black text-[#9CA3AF] mb-2 tracking-wide">
                  Tone
                </label>
                <select
                  value={formData.tone}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl px-4 py-3 text-[13px] text-[#1A1D23] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 appearance-none"
                >
                  <option value="professional">Professional & Authoritative</option>
                  <option value="casual">Casual & Friendly</option>
                  <option value="enthusiastic">Enthusiastic & Excited</option>
                  <option value="empathetic">Empathetic & Caring</option>
                  <option value="luxury">Luxury & Premium</option>
                  <option value="urgent">Urgent & Direct (Salesy)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-[#9CA3AF] uppercase mb-2 tracking-widest flex items-center justify-between">
                <span>Prompt Configuration (Markdown Support OK)</span>
                <div className="flex items-center gap-2">
                  <select 
                    id="template-selector"
                    className="bg-[#1A1D23] border border-[#333] text-[10px] px-2 py-1 rounded text-gray-400 outline-none focus:border-[#FF642D] transition-colors"
                    onChange={(e) => {
                      if (e.target.value) {
                        setFormData({ ...formData, prompt_template: e.target.value });
                        // Reset selector
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Load Blueprint...</option>
                    {PROMPT_TEMPLATES.map(t => (
                      <option key={t.name} value={t.template}>{t.name}</option>
                    ))}
                  </select>
                  <span className="text-[#FF642D] normal-case font-bold italic">Tip: Use {"{{keyword}}"}</span>
                </div>
              </label>
              <textarea
                value={formData.prompt_template}
                onChange={(e) => setFormData({ ...formData, prompt_template: e.target.value })}
                placeholder="Use this for extra AI instructions... OR paste a full Markdown Master Template here (must include {{keyword}})."
                className="w-full bg-[#1A1D23] border border-[#000] rounded-xl px-4 py-4 text-[13px] font-mono text-[#10B981] h-64 outline-none focus:ring-2 focus:ring-[#FF642D]/50 custom-scrollbar leading-relaxed placeholder:text-gray-600 shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-[#9CA3AF] uppercase mb-2 tracking-widest">
                WordPress Post Type (if applicable)
              </label>
              <select
                value={formData.target_cpt}
                onChange={(e) => setFormData({ ...formData, target_cpt: e.target.value })}
                className="w-full bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl px-4 py-3 text-[13px] text-[#1A1D23] font-bold focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 appearance-none"
              >
                {postTypes.map((pt) => <option key={pt.slug} value={pt.slug}>{pt.name}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-[#E5E8EB] mt-4">
            <Button variant="outline" className="px-6 py-6 border-[#E5E8EB] text-[#1A1D23] font-bold rounded-xl shadow-sm hover:bg-[#F9FAFB]" type="button" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting} className="px-6 py-6 bg-[#1A1D23] hover:bg-[#FF642D] text-white font-bold rounded-xl shadow-sm transition-all">
              {editingCampaign ? 'Save Changes' : 'Initialize Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
