'use client';

import { useState, useEffect } from 'react';
import { Link2, RefreshCw, Copy, ExternalLink, Loader2, Info } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from 'sonner';

interface LinkSuggestion {
  id: string;
  title: string;
  published_url: string | null;
  slug: string;
  anchor_text: string;
  relevance: number;
  main_keyword: string;
}

interface InternalLinkerProps {
  articleId: string;
  onInsertLink: (anchor: string, url: string) => void;
}

export default function InternalLinker({ articleId, onInsertLink }: InternalLinkerProps) {
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchSuggestions = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get(`/articles/${articleId}/link-suggestions`);
      setSuggestions(data);
      setFetched(true);
    } catch {
      toast.error('Failed to load link suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (articleId) fetchSuggestions();
  }, [articleId]);

  const copyHtml = (s: LinkSuggestion) => {
    const url = s.published_url || `#${s.slug}`;
    const html = `<a href="${url}" title="${s.title}">${s.anchor_text}</a>`;
    navigator.clipboard.writeText(html);
    toast.success('Link HTML copied to clipboard');
  };

  const relevanceBar = (score: number) => {
    const pct = Math.round(score * 100);
    const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-400';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[9px] font-bold text-muted-foreground">{pct}%</span>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary/30 flex items-center gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Internal Links</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Relevant articles to link to</p>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Notice */}
      <div className="px-4 py-2.5 bg-primary/5 border-b border-border flex gap-2 text-[10px] text-muted-foreground">
        <Info className="w-3 h-3 shrink-0 mt-0.5 text-primary" />
        <span>Click <strong>Insert</strong> to inject a link at cursor, or <strong>Copy</strong> for raw HTML.</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Scanning article library…</span>
          </div>
        ) : !fetched ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
            <Link2 className="w-8 h-8 opacity-20" />
            <p className="text-sm">Click refresh to find relevant articles</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
            <Link2 className="w-8 h-8 opacity-20" />
            <p className="text-sm font-semibold">No relevant articles found</p>
            <p className="text-xs">Publish more articles to enable internal linking</p>
          </div>
        ) : (
          suggestions.map(s => {
            const url = s.published_url || null;
            return (
              <div key={s.id} className="border border-border rounded-xl p-3.5 hover:border-primary/30 transition-colors bg-secondary/20 space-y-2.5">
                <div>
                  <p className="text-xs font-bold text-foreground line-clamp-1">{s.title}</p>
                  <p className="text-[10px] text-primary mt-0.5 truncate">{s.main_keyword}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Relevance</p>
                  {relevanceBar(s.relevance)}
                </div>

                <div className="bg-secondary rounded-lg px-2.5 py-1.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">Suggested anchor</p>
                  <p className="text-xs text-primary font-semibold">"{s.anchor_text}"</p>
                </div>

                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={() => onInsertLink(s.anchor_text, url || `/${s.slug}`)}
                    className="flex-1 text-[10px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Link2 className="w-3 h-3" /> Insert
                  </button>
                  <button
                    onClick={() => copyHtml(s)}
                    className="text-[10px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                  {url && (
                    <a
                      href={url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] px-2 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors flex items-center"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
