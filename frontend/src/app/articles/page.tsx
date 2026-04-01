'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Search, BookOpen, CheckCircle2, ExternalLink,
  RefreshCw, Trash2, Eye, Clock, Tag, Rocket,
  XCircle, Sparkles, ImageOff, AlertTriangle,
  FileEdit, Globe, Ban, ChevronDown, Filter,
  MoreVertical, CheckSquare, Square, Loader2,
  Activity
} from 'lucide-react';
import { FcOpenedFolder } from 'react-icons/fc';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ArticleEditor from '@/components/articles/ArticleEditor';
import apiClient from '@/services/apiClient';
import { getSocket } from '@/services/websocketClient';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Article {
  id: string;
  title: string;
  slug: string;
  meta_description: string;
  content: string;
  word_count: number;
  status: string;
  published_url?: string;
  featured_image_url?: string;
  created_at: string;
  keywords?: { 
    main_keyword: string;
    campaign_id: string;
    campaigns?: { name: string };
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function readingTime(wordCount: number) {
  const mins = Math.ceil((wordCount || 0) / 200);
  return `${mins} min read`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLING: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Draft', bg: 'bg-secondary', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  review: { label: 'Review', bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
  approved: { label: 'Approved', bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
  published: { label: 'Live', bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', bg: 'bg-rose-500/10', text: 'text-rose-500', dot: 'bg-rose-500' },
  failed: { label: 'Failed', bg: 'bg-rose-500/10', text: 'text-rose-500', dot: 'bg-rose-500' },
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  
  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        apiClient.get('/articles'),
        apiClient.get('/campaigns')
      ]);
      setArticles(aRes.data);
      setCampaigns(cRes.data);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    const socket = getSocket();
    const refresh = () => fetchArticles();
    socket.on('article:statusChanged', refresh);
    socket.on('article:created', refresh);
    socket.on('articles:bulkStatusChanged', refresh);
    return () => {
      socket.off('article:statusChanged');
      socket.off('article:created');
      socket.off('articles:bulkStatusChanged');
    };
  }, []);

  const filtered = useMemo(() =>
    articles.filter(a => {
      const q = searchQuery.toLowerCase();
      const statusMatch = !statusFilter || a.status === statusFilter;
      const projectMatch = !projectFilter || a.keywords?.campaign_id === projectFilter;
      const queryMatch = !q || a.title.toLowerCase().includes(q) || (a.keywords?.main_keyword || '').toLowerCase().includes(q);
      return statusMatch && projectMatch && queryMatch;
    }),
    [articles, statusFilter, projectFilter, searchQuery]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, projectFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(a => a.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedIds.size} articles?`)) return;
    setIsBulkActing(true);
    try {
      await apiClient.post('/articles/bulk/delete', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      fetchArticles();
    } catch (err) { console.error('Bulk delete failed', err); }
    finally { setIsBulkActing(false); }
  };

  const handleBulkStatus = async (status: string) => {
    setIsBulkActing(true);
    try {
      await apiClient.post('/articles/bulk/status', { ids: Array.from(selectedIds), status });
      setSelectedIds(new Set());
      fetchArticles();
    } catch (err) { console.error('Bulk status update failed', err); }
    finally { setIsBulkActing(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/50">
            Content Library
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Manage, review, and bulk-publish your AI-generated articles.</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="glass rounded-3xl p-4 border border-border flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search articles..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-2xl pl-11 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-12"
          />
        </div>
        <div className="flex flex-wrap gap-2">
           <div className="relative group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <select 
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="bg-secondary/50 border border-border rounded-xl pl-9 pr-6 py-2 text-xs font-bold uppercase tracking-widest focus:outline-none appearance-none h-12 min-w-[160px]"
              >
                <option value="">All Projects</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
           </div>
           
           <div className="relative group">
              <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-secondary/50 border border-border rounded-xl pl-9 pr-8 py-2 text-xs font-bold uppercase tracking-widest focus:outline-none appearance-none h-12 min-w-[140px]"
              >
                <option value="">All Statuses</option>
                <option value="review">Review</option>
                <option value="approved">Approved</option>
                <option value="published">Live</option>
                <option value="draft">Draft</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
           </div>
        </div>
      </div>

      {/* BULK ACTION BAR (Conditional) */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
           <div className="flex items-center gap-4">
              <span className="text-sm font-black text-primary px-3 py-1 bg-primary/20 rounded-full">
                {selectedIds.size} Selected
              </span>
              <div className="h-4 w-px bg-primary/20" />
              <div className="flex gap-2">
                <Button variant="ghost" className="text-xs h-9 bg-white dark:bg-black/20" onClick={() => handleBulkStatus('approved')}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve All
                </Button>
                <Button variant="ghost" className="text-xs h-9 bg-white dark:bg-black/20" onClick={() => handleBulkStatus('draft')}>
                   Back to Draft
                </Button>
              </div>
           </div>
           <Button variant="outline" className="text-xs text-rose-500 border-rose-500/20 h-9 bg-rose-500/5 hover:bg-rose-500/10" onClick={handleBulkDelete} isLoading={isBulkActing}>
             <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Selected
           </Button>
        </div>
      )}

      {/* MAIN DATA TABLE */}
      <div className="bg-transparent border-t border-border overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-secondary/50">
                <th className="p-5 w-10">
                   <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-primary transition-colors">
                     {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                   </button>
                </th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Article Title & Project</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Metrics</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                     <td className="p-5"><div className="w-5 h-5 bg-secondary rounded" /></td>
                     <td className="p-5"><div className="h-4 bg-secondary rounded w-2/3" /><div className="h-2 bg-secondary rounded w-1/4 mt-2" /></td>
                     <td className="p-5"><div className="h-3 bg-secondary rounded w-1/2" /></td>
                     <td className="p-5"><div className="h-6 bg-secondary rounded-full w-20" /></td>
                     <td className="p-5"><div className="h-8 bg-secondary rounded-lg w-10 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-bold">No articles found matching filters.</p>
                  </td>
                </tr>
              ) : paginatedList.map(art => {
                const style = STATUS_STYLING[art.status] || STATUS_STYLING.draft;
                return (
                  <tr key={art.id} className={`group hover:bg-secondary/20 transition-colors ${selectedIds.has(art.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-5">
                       <button onClick={() => toggleSelect(art.id)} className="text-muted-foreground hover:text-primary transition-colors">
                         {selectedIds.has(art.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                       </button>
                    </td>
                    <td className="p-5 max-w-md">
                       <div className="flex items-start gap-3">
                          <FcOpenedFolder className="w-6 h-6 shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                             <button 
                               onClick={() => { setSelectedArticle(art); setIsModalOpen(true); }}
                               className="font-bold text-foreground text-sm hover:text-primary transition-colors text-left line-clamp-1 leading-tight"
                             >
                               {art.title}
                             </button>
                             <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                                <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">
                                  {art.keywords?.campaigns?.name || 'Unassigned Project'}
                                </span>
                             </div>
                          </div>
                       </div>
                    </td>
                    <td className="p-5 hidden lg:table-cell">
                       <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {readingTime(art.word_count)}</span>
                          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> {art.word_count} W</span>
                       </div>
                    </td>
                    <td className="p-5">
                       <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${style.bg} ${style.text} border border-border/20`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                       </div>
                    </td>
                    <td className="p-5 text-right">
                       <div className="flex items-center justify-end gap-2">
                          {art.status === 'published' && art.published_url && (
                             <a href={art.published_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all">
                                <ExternalLink className="w-4 h-4" />
                             </a>
                          )}
                          <button 
                            onClick={() => { setSelectedArticle(art); setIsModalOpen(true); }}
                            className="p-2 rounded-xl bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                          >
                             <Eye className="w-4 h-4" />
                          </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-secondary/10 text-sm border-t border-border">
            <Button 
              variant="outline" 
              className="h-8 px-3 text-xs bg-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              className="h-8 px-3 text-xs bg-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* FOOTER STATS */}
      {!isLoading && filtered.length > 0 && (
         <div className="flex items-center justify-between px-6 text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
            <p>Showing {filtered.length} of {articles.length} Articles</p>
            <p className="flex items-center gap-4">
               <span>Drafts: {articles.filter(a => a.status === 'draft').length}</span>
               <span>Review: {articles.filter(a => a.status === 'review').length}</span>
               <span>Live: {articles.filter(a => a.status === 'published').length}</span>
            </p>
         </div>
      )}

      {/* Editor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Article Editor"
        maxWidth="max-w-7xl w-full"
      >
        {selectedArticle && (
          <ArticleEditor
            article={selectedArticle}
            onUpdate={() => {
              setIsModalOpen(false);
              fetchArticles();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
