'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search, FileText, CheckCircle2, ExternalLink,
  Trash2, Clock, Globe, LayoutGrid, List,
  TimerReset, Edit2, ChevronLeft, ChevronRight,
  Filter, XCircle, Zap,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ArticleEditor from '@/components/articles/ArticleEditor';
import apiClient from '@/services/apiClient';
import { getSocket } from '@/services/websocketClient';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────
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
    id?: string;
    main_keyword: string;
    campaign_id: string;
    secondary_keywords?: string[];
    campaigns?: { name: string };
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STALE_DAYS = 90;

function isStale(d: string) {
  return Date.now() - new Date(d).getTime() > STALE_DAYS * 86_400_000;
}
function daysOld(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}
function readingTime(w: number) {
  return `${Math.max(1, Math.ceil((w || 0) / 200))} min`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; bg: string; text: string; dot: string; color: string }> = {
  draft:     { label: 'Draft',    bg: 'bg-[#F3F4F6]',  text: 'text-[#6B7280]',   dot: 'bg-[#9CA3AF]', color: '#9CA3AF' },
  review:    { label: 'Review',   bg: 'bg-amber-50',    text: 'text-amber-600',   dot: 'bg-amber-400', color: '#F59E0B' },
  approved:  { label: 'Approved', bg: 'bg-blue-50',     text: 'text-blue-600',    dot: 'bg-blue-400',  color: '#3B82F6' },
  published: { label: 'Live',     bg: 'bg-emerald-50',  text: 'text-emerald-600', dot: 'bg-emerald-500',color: '#10B981' },
  rejected:  { label: 'Rejected', bg: 'bg-red-50',      text: 'text-red-600',     dot: 'bg-red-400',   color: '#EF4444' },
  failed:    { label: 'Failed',   bg: 'bg-red-50',      text: 'text-red-600',     dot: 'bg-red-400',   color: '#EF4444' },
};

// ── Article Card ──────────────────────────────────────────────────────────────
function ArticleCard({ article, isSelected, onSelect, onEdit }: {
  article: Article; isSelected: boolean; onSelect: (id: string) => void; onEdit: (a: Article) => void;
}) {
  const s = STATUS[article.status] || STATUS.draft;
  const stale = article.status === 'published' && isStale(article.created_at);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative bg-white rounded-2xl overflow-hidden transition-all flex flex-col ${
        isSelected ? 'ring-2 ring-[#FF642D] shadow-lg' : 'border border-[#E5E8EB] hover:shadow-md hover:border-[#D1D5DB]'
      }`}
    >
      {/* Select checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onSelect(article.id); }}
        className="absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
        style={{
          borderColor: isSelected ? '#FF642D' : '#D1D5DB',
          backgroundColor: isSelected ? '#FF642D' : 'white',
        }}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
          </svg>
        )}
      </button>

      {/* Thumbnail */}
      <div
        className="relative w-full h-28 overflow-hidden cursor-pointer bg-[#F9FAFB] flex items-center justify-center shrink-0"
        onClick={() => onEdit(article)}
      >
        {article.featured_image_url ? (
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6]">
            <FileText className="w-8 h-8 text-[#E5E8EB]" />
          </div>
        )}
        {stale && (
          <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
            {daysOld(article.created_at)}d old
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Status */}
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest self-start mb-2.5 ${s.bg} ${s.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </div>

        {/* Title */}
        <h3
          className="font-bold text-[#1A1D23] text-sm leading-snug mb-3 line-clamp-2 cursor-pointer hover:text-[#FF642D] transition-colors flex-1"
          onClick={() => onEdit(article)}
        >
          {article.title}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {article.keywords?.campaigns?.name && (
            <span className="text-[10px] font-semibold text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full max-w-[110px] truncate">
              {article.keywords.campaigns.name}
            </span>
          )}
          {article.keywords?.main_keyword && (
            <span className="text-[10px] font-semibold text-[#FF642D] bg-[#FFF5F0] px-2 py-0.5 rounded-full max-w-[120px] truncate" title={article.keywords.main_keyword}>
              {article.keywords.main_keyword}
            </span>
          )}
        </div>

        {/* Metrics */}
        <div className="flex items-center justify-between text-[10px] font-semibold text-[#9CA3AF] pt-2.5 border-t border-[#F3F4F6]">
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {(article.word_count || 0).toLocaleString()}w · {readingTime(article.word_count)}
          </span>
          <span>{fmtDate(article.created_at)}</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex border-t border-[#F9FAFB] shrink-0">
        <button
          onClick={() => onEdit(article)}
          className="flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider text-[#9CA3AF] hover:text-[#FF642D] hover:bg-[#FFF5F0] transition-all flex items-center justify-center gap-1.5"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </button>
        {article.published_url && (
          <a
            href={article.published_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider text-[#9CA3AF] hover:text-[#10B981] hover:bg-[#F0FDF4] transition-all flex items-center justify-center gap-1.5 border-l border-[#F9FAFB]"
            onClick={e => e.stopPropagation()}
          >
            <Globe className="w-3 h-3" /> Live
          </a>
        )}
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E5E8EB] rounded-2xl overflow-hidden animate-pulse">
      <div className="h-28 bg-[#F3F4F6]" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-[#F3F4F6] rounded-full w-16" />
        <div className="h-4 bg-[#F3F4F6] rounded-lg w-5/6" />
        <div className="h-4 bg-[#F3F4F6] rounded-lg w-3/4" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 bg-[#F3F4F6] rounded-full w-20" />
          <div className="h-5 bg-[#F3F4F6] rounded-full w-24" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [staleOnly, setStaleOnly] = useState(false);

  // Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);

  const PAGE_SIZE = viewMode === 'cards' ? 12 : 20;

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [aRes, cRes] = await Promise.all([
        apiClient.get('/articles'),
        apiClient.get('/campaigns'),
      ]);
      setArticles(aRes.data || []);
      setCampaigns(cRes.data || []);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const socket = getSocket();
    socket.on('article:statusChanged', fetchAll);
    socket.on('article:created', fetchAll);
    socket.on('articles:bulkStatusChanged', fetchAll);
    return () => {
      socket.off('article:statusChanged');
      socket.off('article:created');
      socket.off('articles:bulkStatusChanged');
    };
  }, [fetchAll]);

  // Stats
  const counts = useMemo(() => ({
    total:    articles.length,
    draft:    articles.filter(a => a.status === 'draft').length,
    review:   articles.filter(a => a.status === 'review').length,
    approved: articles.filter(a => a.status === 'approved').length,
    live:     articles.filter(a => a.status === 'published').length,
    rejected: articles.filter(a => a.status === 'rejected' || a.status === 'failed').length,
    stale:    articles.filter(a => a.status === 'published' && isStale(a.created_at)).length,
  }), [articles]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return articles.filter(a =>
      (!statusFilter || a.status === statusFilter) &&
      (!projectFilter || a.keywords?.campaign_id === projectFilter) &&
      (!q || a.title.toLowerCase().includes(q) || (a.keywords?.main_keyword || '').toLowerCase().includes(q)) &&
      (!staleOnly || (a.status === 'published' && isStale(a.created_at)))
    );
  }, [articles, statusFilter, projectFilter, search, staleOnly]);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, projectFilter, staleOnly]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const page = useMemo(() => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filtered, currentPage, PAGE_SIZE]);

  // Select
  const toggleSelect = (id: string) => {
    const n = new Set(selectedIds);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelectedIds(n);
  };
  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(a => a.id)));

  // Bulk ops
  const bulkStatus = async (status: string) => {
    setIsBulkActing(true);
    try {
      await apiClient.post('/articles/bulk/status', { ids: Array.from(selectedIds), status });
      setSelectedIds(new Set());
      fetchAll();
    } catch (e) { console.error(e); }
    finally { setIsBulkActing(false); }
  };

  const bulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedIds.size} article(s)?`)) return;
    setIsBulkActing(true);
    try {
      await apiClient.post('/articles/bulk/delete', { ids: Array.from(selectedIds) });
      setSelectedIds(new Set());
      fetchAll();
    } catch (e) { console.error(e); }
    finally { setIsBulkActing(false); }
  };

  const openEditor = (article: Article) => { setSelectedArticle(article); setIsModalOpen(true); };

  // Status chips for filter
  const chips = [
    { key: '', label: 'All', count: counts.total, color: '#1A1D23' },
    { key: 'review', label: 'Review', count: counts.review, color: '#F59E0B' },
    { key: 'approved', label: 'Approved', count: counts.approved, color: '#3B82F6' },
    { key: 'published', label: 'Live', count: counts.live, color: '#10B981' },
    { key: 'draft', label: 'Draft', count: counts.draft, color: '#9CA3AF' },
    ...(counts.rejected > 0 ? [{ key: 'rejected', label: 'Rejected', count: counts.rejected, color: '#EF4444' }] : []),
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto py-8 px-4 space-y-7">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF]">Content Library</span>
          </div>
          <h1 className="text-4xl font-black text-[#1A1D23] tracking-tighter">Articles</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-[#F3F4F6] rounded-xl p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-[#1A1D23]' : 'text-[#9CA3AF] hover:text-[#6B7280]'}`}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-[#1A1D23]' : 'text-[#9CA3AF] hover:text-[#6B7280]'}`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {chips.map(chip => {
          const active = statusFilter === chip.key && !staleOnly;
          return (
            <button
              key={chip.key}
              onClick={() => { setStatusFilter(chip.key); setStaleOnly(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                active ? 'text-white shadow-md' : 'bg-white border border-[#E5E8EB] text-[#6B7280] hover:border-[#D1D5DB] hover:text-[#1A1D23]'
              }`}
              style={active ? { backgroundColor: chip.color } : {}}
            >
              {chip.label}
              <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                {chip.count}
              </span>
            </button>
          );
        })}

        {counts.stale > 0 && (
          <button
            onClick={() => { setStaleOnly(v => !v); if (staleOnly) setStatusFilter(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              staleOnly ? 'bg-amber-500 text-white shadow-md' : 'bg-white border border-[#E5E8EB] text-[#6B7280] hover:border-amber-200 hover:text-amber-600'
            }`}
          >
            <TimerReset className="w-4 h-4" />
            Stale
            <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${staleOnly ? 'bg-white/25 text-white' : 'bg-amber-50 text-amber-600'}`}>
              {counts.stale}
            </span>
          </button>
        )}
      </div>

      {/* Search + project filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by title or keyword…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-[#E5E8EB] rounded-xl pl-11 pr-4 py-3 text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D]/40 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1A1D23]">
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="bg-white border border-[#E5E8EB] rounded-xl pl-10 pr-9 py-3 text-sm font-medium text-[#1A1D23] focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 appearance-none min-w-[180px] cursor-pointer"
          >
            <option value="">All Projects</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Stale banner */}
      {counts.stale > 0 && !staleOnly && !statusFilter && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <TimerReset className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-800">{counts.stale} article{counts.stale > 1 ? 's need' : ' needs'} a refresh</p>
              <p className="text-xs text-amber-600 mt-0.5">Content older than {STALE_DAYS} days may lose rankings.</p>
            </div>
          </div>
          <button
            onClick={() => setStaleOnly(true)}
            className="text-xs font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors whitespace-nowrap"
          >
            Review All →
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#1A1D23] rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-white bg-white/10 px-3 py-1 rounded-full">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2">
                <button onClick={() => bulkStatus('approved')} disabled={isBulkActing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button onClick={() => bulkStatus('review')} disabled={isBulkActing}
                  className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors">
                  Set Review
                </button>
                <button onClick={() => bulkStatus('draft')} disabled={isBulkActing}
                  className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors">
                  To Draft
                </button>
              </div>
            </div>
            <button onClick={bulkDelete} disabled={isBulkActing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cards view ── */}
      {viewMode === 'cards' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-[#F3F4F6] rounded-2xl flex items-center justify-center mb-4">
                <FileText className="w-7 h-7 text-[#D1D5DB]" />
              </div>
              <h3 className="font-black text-[#1A1D23] mb-1">No articles found</h3>
              <p className="text-sm text-[#9CA3AF]">
                {search || statusFilter || projectFilter || staleOnly ? 'Try adjusting your filters.' : 'Generate articles from a campaign to get started.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {page.map(art => (
                <ArticleCard
                  key={art.id}
                  article={art}
                  isSelected={selectedIds.has(art.id)}
                  onSelect={toggleSelect}
                  onEdit={openEditor}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Table view ── */}
      {viewMode === 'table' && (
        <div className="bg-white border border-[#E5E8EB] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F3F4F6]">
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-[#9CA3AF] hover:text-[#FF642D] transition-colors">
                    <div className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all ${
                      selectedIds.size > 0 && selectedIds.size === filtered.length
                        ? 'border-[#FF642D] bg-[#FF642D]'
                        : 'border-[#D1D5DB]'
                    }`}>
                      {selectedIds.size > 0 && selectedIds.size === filtered.length && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                          <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                        </svg>
                      )}
                    </div>
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Article</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] hidden lg:table-cell">Project</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] hidden md:table-cell">Metrics</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-[#F9FAFB] animate-pulse">
                    <td className="px-4 py-4"><div className="w-5 h-5 bg-[#F3F4F6] rounded-md" /></td>
                    <td className="px-4 py-4"><div className="h-4 bg-[#F3F4F6] rounded w-48" /><div className="h-3 bg-[#F3F4F6] rounded w-24 mt-2" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><div className="h-3 bg-[#F3F4F6] rounded w-20" /></td>
                    <td className="px-4 py-4"><div className="h-6 bg-[#F3F4F6] rounded-full w-16" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="h-3 bg-[#F3F4F6] rounded w-16" /></td>
                    <td className="px-4 py-4 text-right"><div className="h-8 bg-[#F3F4F6] rounded-xl w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-[#E5E8EB]" />
                    <p className="text-sm font-bold text-[#9CA3AF]">No articles match your filters</p>
                  </td>
                </tr>
              ) : page.map(art => {
                const s = STATUS[art.status] || STATUS.draft;
                const stale = art.status === 'published' && isStale(art.created_at);
                const sel = selectedIds.has(art.id);
                return (
                  <tr key={art.id} className={`border-b border-[#F9FAFB] hover:bg-[#FAFAFA] transition-colors ${sel ? 'bg-[#FFF5F0]' : ''}`}>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleSelect(art.id)}
                        className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all ${sel ? 'border-[#FF642D] bg-[#FF642D]' : 'border-[#D1D5DB] hover:border-[#FF642D]'}`}
                      >
                        {sel && <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor"><path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" /></svg>}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <button
                        onClick={() => openEditor(art)}
                        className="font-semibold text-[#1A1D23] hover:text-[#FF642D] transition-colors text-left line-clamp-1 text-sm block"
                      >
                        {art.title}
                      </button>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {art.keywords?.main_keyword && (
                          <span className="text-[10px] font-semibold text-[#FF642D] bg-[#FFF5F0] px-2 py-0.5 rounded-full max-w-[140px] truncate">
                            {art.keywords.main_keyword}
                          </span>
                        )}
                        {stale && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <TimerReset className="w-2.5 h-2.5" /> {daysOld(art.created_at)}d
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className="text-xs font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-1 rounded-lg">
                        {art.keywords?.campaigns?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.bg} ${s.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className="text-[11px] font-semibold text-[#9CA3AF]">
                        {(art.word_count || 0).toLocaleString()}w · {readingTime(art.word_count)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {art.published_url && (
                          <a href={art.published_url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-[#9CA3AF] hover:text-emerald-600 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => openEditor(art)}
                          className="px-3 py-1.5 rounded-xl bg-[#F3F4F6] hover:bg-[#FF642D] text-[#6B7280] hover:text-white text-[11px] font-black uppercase tracking-wider transition-all"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
            {filtered.length} articles · Page {currentPage}/{totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-xl border border-[#E5E8EB] flex items-center justify-center text-[#6B7280] hover:border-[#FF642D] hover:text-[#FF642D] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = currentPage <= 3 ? i + 1 : currentPage + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-xl text-sm font-bold transition-all ${
                    p === currentPage ? 'bg-[#1A1D23] text-white' : 'border border-[#E5E8EB] text-[#6B7280] hover:border-[#D1D5DB]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-xl border border-[#E5E8EB] flex items-center justify-center text-[#6B7280] hover:border-[#FF642D] hover:text-[#FF642D] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      {!isLoading && articles.length > 0 && (
        <div className="flex items-center justify-between text-[10px] font-black text-[#D1D5DB] uppercase tracking-widest pt-4 border-t border-[#F3F4F6]">
          <span className="text-[#9CA3AF]">Showing {page.length} of {filtered.length}</span>
          <div className="flex gap-4">
            {counts.review > 0 && <span className="text-amber-500">{counts.review} in review</span>}
            <span className="text-emerald-500">{counts.live} live</span>
            {counts.stale > 0 && <span className="text-amber-400">{counts.stale} stale</span>}
          </div>
        </div>
      )}

      {/* Editor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-[1400px] w-full"
        noPadding
      >
        {selectedArticle && (
          <ArticleEditor
            article={selectedArticle}
            onClose={() => setIsModalOpen(false)}
            onUpdate={() => {
              setIsModalOpen(false);
              fetchAll();
            }}
            onRegenerate={() => {
              // TODO: hook into workflow generation
            }}
          />
        )}
      </Modal>
    </div>
  );
}
