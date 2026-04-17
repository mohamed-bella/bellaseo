'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import {
  Save, CheckCircle, XCircle, RefreshCw, Globe,
  BarChart2, Link2, Code2, Eye, ChevronLeft, ChevronRight,
  Lock, LayoutTemplate, Puzzle, AlignJustify,
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import SeoScorePanel from './SeoScorePanel';
import InternalLinker from './InternalLinker';

// TipTap editor is client-only
const RichEditor = dynamic(() => import('./RichEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 border border-border rounded-xl bg-secondary/10 min-h-[400px] flex items-center justify-center text-muted-foreground text-sm animate-pulse">
      Loading editor…
    </div>
  ),
});

type RightTab = 'preview' | 'seo' | 'links' | 'html';

interface ArticleEditorProps {
  article: any;
  onUpdate: () => void;
  onRegenerate?: () => void;
}

export default function ArticleEditor({ article, onUpdate, onRegenerate }: ArticleEditorProps) {
  const [data, setData] = useState({
    title: article.title || '',
    content: article.content || '',
    meta_description: article.meta_description || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>('preview');

  // Ref to TipTap's insertLink function exposed via callback
  const insertLinkFn = useRef<((anchor: string, url: string) => void) | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put(`/articles/${article.id}`, data);
      onUpdate();
    } catch (err) {
      console.error('Failed to save article:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      if (action === 'approve') await apiClient.post(`/articles/${article.id}/approve`);
      if (action === 'reject') await apiClient.post(`/articles/${article.id}/reject`, { reason: 'User rejected' });
      onUpdate();
    } catch (err) {
      console.error(`Failed to ${action} article:`, err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInsertLink = useCallback((anchor: string, url: string) => {
    if (insertLinkFn.current) {
      insertLinkFn.current(anchor, url);
      setRightTab('preview');
    }
  }, []);

  const keyword = article.keywords?.main_keyword || '';

  const TAB_CONFIG: { id: RightTab; label: string; icon: any }[] = [
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'seo', label: 'SEO Score', icon: BarChart2 },
    { id: 'links', label: 'Links', icon: Link2 },
    { id: 'html', label: 'HTML', icon: Code2 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-180px)] min-h-[560px]">

      {/* ── LEFT: Editor ── */}
      <div className="flex flex-col gap-4 h-full overflow-hidden">
        {/* Title */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5">Title</label>
          <input
            value={data.title}
            onChange={e => setData({ ...data, title: e.target.value })}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold text-base"
          />
        </div>

        {/* Meta Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Meta Description</label>
            <span className={`text-[10px] font-bold ${data.meta_description.length > 160 ? 'text-rose-500' : data.meta_description.length >= 130 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {data.meta_description.length}/160
            </span>
          </div>
          <textarea
            value={data.meta_description}
            onChange={e => setData({ ...data, meta_description: e.target.value })}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-16 text-sm resize-none"
          />
        </div>

        {/* WYSIWYG Editor */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5">Content</label>
          <div className="flex-1 overflow-hidden rounded-xl">
            <RichEditor
              value={data.content}
              onChange={html => setData(d => ({ ...d, content: html }))}
              placeholder="Write article content here…"
              onInsertLinkRef={fn => { insertLinkFn.current = fn; }}
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} isLoading={isSaving} className="flex gap-2">
              <Save className="w-4 h-4" />
              {article.status === 'published' ? 'Save Changes' : 'Save Draft'}
            </Button>
            {article.status !== 'published' && onRegenerate && (
              <Button variant="outline" size="sm" onClick={onRegenerate} className="flex gap-2">
                <RefreshCw className="w-4 h-4 text-amber-500" /> Rewrite with AI
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {article.status !== 'published' ? (
              <>
                <Button
                  variant="outline" size="sm"
                  onClick={() => handleAction('reject')}
                  isLoading={isProcessing}
                  className="text-rose-500 hover:bg-rose-500/10 border-rose-500/20 flex gap-2"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
                <Button
                  variant="primary" size="sm"
                  onClick={() => handleAction('approve')}
                  isLoading={isProcessing}
                  className="flex gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Approve & Publish
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="opacity-50 cursor-not-allowed flex gap-2">
                <Globe className="w-4 h-4 text-emerald-500" /> Published
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Tabbed Panel ── */}
      <div className="flex flex-col border border-border rounded-xl overflow-hidden h-full">
        {/* Tab bar */}
        <div className="flex border-b border-border bg-secondary/30 shrink-0">
          {TAB_CONFIG.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  rightTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {/* Preview */}
          {rightTab === 'preview' && (
            <div className="flex flex-col h-full">
              {/* Browser chrome */}
              <div className="bg-secondary/30 pt-2 px-2 flex items-end gap-1 border-b border-border">
                <div className="flex items-center gap-2 px-3 py-2 mr-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="bg-background px-3 py-1.5 rounded-t-lg border border-border border-b-0 min-w-[120px] max-w-[180px] flex items-center gap-2 text-xs text-foreground font-medium truncate -mb-[1px]">
                  <LayoutTemplate className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">{data.title || 'Preview'}</span>
                </div>
              </div>
              <div className="px-3 py-1.5 flex items-center gap-3 border-b border-border bg-background">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ChevronLeft className="w-3.5 h-3.5 opacity-30" />
                  <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                </div>
                <div className="flex-1 bg-secondary/40 border border-border rounded-full flex items-center px-3 py-1">
                  <Lock className="w-2.5 h-2.5 text-foreground/40 mr-1.5" />
                  <span className="text-[10px] font-mono text-foreground/70 truncate">
                    https://yoursite.com/{data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                  </span>
                </div>
                <Puzzle className="w-3.5 h-3.5 text-muted-foreground" />
                <AlignJustify className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 bg-white overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-2xl mx-auto">
                  <h1 className="text-3xl font-extrabold text-slate-900 mb-5 leading-tight">{data.title}</h1>
                  {data.meta_description && (
                    <p className="text-slate-500 italic text-sm mb-6 border-l-4 border-slate-200 pl-3">{data.meta_description}</p>
                  )}
                  <div
                    className="prose prose-slate prose-base max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-xl prose-img:shadow-md"
                    dangerouslySetInnerHTML={{ __html: data.content }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SEO Score */}
          {rightTab === 'seo' && (
            <SeoScorePanel
              title={data.title}
              content={data.content}
              metaDescription={data.meta_description}
              keyword={keyword}
            />
          )}

          {/* Internal Links */}
          {rightTab === 'links' && (
            <InternalLinker
              articleId={article.id}
              onInsertLink={handleInsertLink}
            />
          )}

          {/* Raw HTML */}
          {rightTab === 'html' && (
            <div className="h-full flex flex-col p-3 gap-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold px-1">Raw HTML — edit with caution</p>
              <textarea
                value={data.content}
                onChange={e => setData(d => ({ ...d, content: e.target.value }))}
                className="flex-1 w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-foreground font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary custom-scrollbar resize-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
