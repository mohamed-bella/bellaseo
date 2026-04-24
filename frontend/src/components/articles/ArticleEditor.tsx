'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Save, CheckCircle, XCircle, RefreshCw, Globe,
  BarChart2, Link2, Code2, Eye, Lock, X,
  FileText, Tag, Zap, Info, Target, Settings,
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import SeoScorePanel from './SeoScorePanel';
import InternalLinker from './InternalLinker';

const RichEditor = dynamic(() => import('./RichEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 border border-[#E5E8EB] rounded-2xl bg-[#F9FAFB] min-h-[400px] flex flex-col items-center justify-center text-[#9CA3AF] gap-3 animate-pulse">
      <FileText className="w-8 h-8 opacity-20" />
      <p className="text-xs font-black uppercase tracking-widest">Loading Editor…</p>
    </div>
  ),
});

type RightTab = 'preview' | 'seo' | 'context' | 'links' | 'html';

interface ArticleEditorProps {
  article: any;
  onUpdate: () => void;
  onRegenerate?: () => void;
  onClose?: () => void;
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: 'Draft',     bg: 'bg-[#F3F4F6]',  text: 'text-[#6B7280]',   dot: 'bg-[#9CA3AF]' },
  review:    { label: 'In Review', bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-400' },
  approved:  { label: 'Approved',  bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'  },
  published: { label: 'Live',      bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected:  { label: 'Rejected',  bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-400'   },
};

const TABS: { id: RightTab; label: string; icon: any }[] = [
  { id: 'preview',  label: 'Preview',  icon: Eye       },
  { id: 'seo',      label: 'SEO',      icon: BarChart2  },
  { id: 'context',  label: 'Context',  icon: Info       },
  { id: 'links',    label: 'Links',    icon: Link2      },
  { id: 'html',     label: 'HTML',     icon: Code2      },
];

function ContextRow({ icon: Icon, label, value, accent = false }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F3F4F6] last:border-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${accent ? 'bg-[#FFF5F0]' : 'bg-[#F3F4F6]'}`}>
        <Icon className={`w-3.5 h-3.5 ${accent ? 'text-[#FF642D]' : 'text-[#9CA3AF]'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 truncate ${accent ? 'text-[#FF642D]' : 'text-[#1A1D23]'}`}>{value || '—'}</p>
      </div>
    </div>
  );
}

export default function ArticleEditor({ article, onUpdate, onRegenerate, onClose }: ArticleEditorProps) {
  const [data, setData] = useState({
    title: article.title || '',
    content: article.content || '',
    meta_description: article.meta_description || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>('preview');
  const [contextData, setContextData] = useState<any>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const insertLinkFn = useRef<((anchor: string, url: string) => void) | null>(null);

  // Fetch campaign/keyword context when Context tab is opened
  useEffect(() => {
    if (rightTab !== 'context' || contextData) return;
    const campaignId = article.keywords?.campaign_id;
    if (!campaignId) { setContextData({}); return; }
    (async () => {
      try {
        const res = await apiClient.get(`/campaigns/${campaignId}`);
        setContextData({ campaign: res.data, keyword: article.keywords });
      } catch {
        setContextData({ keyword: article.keywords });
      }
    })();
  }, [rightTab, contextData, article]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put(`/articles/${article.id}`, data);
      setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      onUpdate();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      if (action === 'approve') await apiClient.post(`/articles/${article.id}/approve`);
      else await apiClient.post(`/articles/${article.id}/reject`, { reason: 'User rejected' });
      onUpdate();
    } catch (err) {
      console.error(`${action} failed:`, err);
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

  const status = STATUS_CFG[article.status] || STATUS_CFG.draft;
  const keyword = article.keywords?.main_keyword || '';
  const isLive = article.status === 'published';

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#E5E8EB] bg-white shrink-0">
        {/* Status + title */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${status.bg} ${status.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </div>
        <h2 className="text-sm font-bold text-[#1A1D23] truncate flex-1 min-w-0">
          {data.title || 'Untitled Article'}
        </h2>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {savedAt && (
            <span className="text-[10px] font-bold text-[#D1D5DB] uppercase tracking-widest hidden md:block">
              Saved {savedAt}
            </span>
          )}

          {onRegenerate && !isLive && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-[#9CA3AF] border border-[#E5E8EB] rounded-xl hover:text-[#FF642D] hover:border-[#FF642D]/30 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Rewrite
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1A1D23] text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-[#FF642D] transition-all disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving…' : 'Save'}
          </button>

          {!isLive && (
            <>
              <button
                onClick={() => handleAction('reject')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-black uppercase tracking-wider border border-red-200 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all disabled:opacity-60"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
              <button
                onClick={() => handleAction('approve')}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black uppercase tracking-wider bg-[#10B981] text-white rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-60"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </button>
            </>
          )}

          {isLive && article.published_url && (
            <a
              href={article.published_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-black uppercase tracking-wider border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-all"
            >
              <Globe className="w-3.5 h-3.5" /> View Live
            </a>
          )}

          {onClose && (
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#1A1D23] transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT — Editor (58%) */}
        <div className="flex flex-col flex-[58] border-r border-[#E5E8EB] min-w-0 overflow-hidden">

          {/* Meta fields */}
          <div className="px-6 pt-5 pb-4 border-b border-[#F3F4F6] bg-[#FAFAFA] shrink-0 space-y-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-1.5">Title</label>
              <input
                value={data.title}
                onChange={e => setData(d => ({ ...d, title: e.target.value }))}
                className="w-full bg-white border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-[#1A1D23] font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D]/50 transition-all placeholder:text-[#D1D5DB]"
                placeholder="Article title…"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Meta Description</label>
                <span className={`text-[10px] font-black tabular-nums ${
                  data.meta_description.length > 160 ? 'text-red-500'
                  : data.meta_description.length >= 130 ? 'text-emerald-500'
                  : 'text-amber-500'
                }`}>
                  {data.meta_description.length}/160
                </span>
              </div>
              <textarea
                value={data.meta_description}
                onChange={e => setData(d => ({ ...d, meta_description: e.target.value }))}
                className="w-full bg-white border border-[#E5E8EB] rounded-xl px-4 py-2.5 text-[#1A1D23] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D]/50 transition-all resize-none h-[52px] leading-relaxed placeholder:text-[#D1D5DB]"
                placeholder="Compelling meta description (130–160 chars)…"
              />
            </div>
          </div>

          {/* WYSIWYG */}
          <div className="flex-1 overflow-auto px-6 py-4 min-h-0">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2">Content</label>
            <div className="h-full min-h-[400px]">
              <RichEditor
                value={data.content}
                onChange={html => setData(d => ({ ...d, content: html }))}
                placeholder="Write your article content here…"
                onInsertLinkRef={fn => { insertLinkFn.current = fn; }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT — Insights panel (42%) */}
        <div className="flex flex-col flex-[42] min-w-0 min-h-0 overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-[#E5E8EB] bg-[#FAFAFA] shrink-0 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = rightTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRightTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
                    active
                      ? 'text-[#FF642D] border-[#FF642D] bg-white'
                      : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280] hover:border-[#E5E8EB]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">

            {/* Preview */}
            {rightTab === 'preview' && (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#F9FAFB] border-b border-[#E5E8EB] shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 bg-white border border-[#E5E8EB] rounded-full px-3 py-1 flex items-center gap-1.5 min-w-0">
                    <Lock className="w-2.5 h-2.5 text-[#9CA3AF] shrink-0" />
                    <span className="text-[9px] font-mono text-[#9CA3AF] truncate">
                      {data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'article-preview'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 bg-white overflow-y-auto p-6 custom-scrollbar">
                  <div className="max-w-xl mx-auto">
                    <h1 className="text-2xl font-extrabold text-slate-900 mb-4 leading-tight">{data.title}</h1>
                    {data.meta_description && (
                      <p className="text-slate-500 text-sm italic mb-5 border-l-4 border-slate-100 pl-4 leading-relaxed">{data.meta_description}</p>
                    )}
                    <div
                      className="prose prose-slate prose-sm max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-a:text-blue-600 prose-img:rounded-xl"
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

            {/* Context */}
            {rightTab === 'context' && (
              <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="p-5 space-y-6">
                  {/* Article info */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-1">Article Context</p>
                    <div className="bg-[#FAFAFA] rounded-2xl border border-[#F3F4F6] px-4 divide-y divide-[#F3F4F6]">
                      <ContextRow icon={Target} label="Main Keyword" value={article.keywords?.main_keyword} accent />
                      <ContextRow icon={Tag} label="Project" value={article.keywords?.campaigns?.name} />
                      <ContextRow icon={Zap} label="Word Count" value={`${(article.word_count || 0).toLocaleString()} words`} />
                      <ContextRow icon={FileText} label="Status" value={status.label} />
                    </div>
                  </div>

                  {/* Campaign settings */}
                  {contextData === null ? (
                    <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                      <div className="w-3.5 h-3.5 border-2 border-[#E5E8EB] border-t-[#FF642D] rounded-full animate-spin" />
                      Loading context…
                    </div>
                  ) : contextData.campaign ? (
                    <>
                      {/* Secondary keywords */}
                      {Array.isArray(contextData.keyword?.secondary_keywords) && contextData.keyword.secondary_keywords.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2">Secondary Keywords</p>
                          <div className="flex flex-wrap gap-1.5">
                            {contextData.keyword.secondary_keywords.map((kw: string, i: number) => (
                              <span key={i} className="text-xs font-semibold text-[#6B7280] bg-[#F3F4F6] px-2.5 py-1 rounded-lg border border-[#E5E8EB]">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-1">Campaign Settings</p>
                        <div className="bg-[#FAFAFA] rounded-2xl border border-[#F3F4F6] px-4 divide-y divide-[#F3F4F6]">
                          <ContextRow icon={Settings} label="Niche" value={contextData.campaign.niche} />
                          <ContextRow icon={Settings} label="Language" value={contextData.campaign.language} />
                          <ContextRow icon={Settings} label="Tone" value={contextData.campaign.tone} />
                          {contextData.campaign.article_config?.target_word_count && (
                            <ContextRow icon={Zap} label="Target Length" value={`${contextData.campaign.article_config.target_word_count} words`} />
                          )}
                        </div>
                      </div>

                      {contextData.campaign.prompt_template && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-2">Custom Prompt Directives</p>
                          <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar">
                            <p className="text-xs text-[#6B7280] font-mono whitespace-pre-wrap leading-relaxed">
                              {contextData.campaign.prompt_template}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}

                  {/* Prompt info banner */}
                  <div className="bg-[#FFF5F0] border border-[#FDDDD0] rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#FF642D] mb-1.5">Prompt Engine</p>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">
                      Generated with RankMath-compliant SEO rules. Target density ~1%. Keyword must appear in H1, first paragraph, and 2+ subheadings.
                      Edit campaign settings to change tone, niche, and directive templates.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Internal Links */}
            {rightTab === 'links' && (
              <InternalLinker articleId={article.id} onInsertLink={handleInsertLink} />
            )}

            {/* Raw HTML */}
            {rightTab === 'html' && (
              <div className="h-full flex flex-col p-4 gap-3">
                <div className="flex items-center justify-between shrink-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">Raw HTML — edit with care</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(data.content)}
                    className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] hover:text-[#FF642D] transition-colors"
                  >
                    Copy All
                  </button>
                </div>
                <textarea
                  value={data.content}
                  onChange={e => setData(d => ({ ...d, content: e.target.value }))}
                  className="flex-1 w-full bg-[#F9FAFB] border border-[#E5E8EB] rounded-2xl px-4 py-3 text-[#1A1D23] font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 custom-scrollbar resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
