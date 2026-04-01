'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Save, CheckCircle, XCircle, RefreshCw, LayoutTemplate, Lock, ChevronLeft, ChevronRight, Puzzle, AlignJustify, Globe } from 'lucide-react';
import apiClient from '@/services/apiClient';

interface ArticleEditorProps {
  article: any;
  onUpdate: () => void;
  onRegenerate?: () => void;
}

export default function ArticleEditor({ article, onUpdate, onRegenerate }: ArticleEditorProps) {
  const [data, setData] = useState({
    title: article.title,
    content: article.content,
    meta_description: article.meta_description || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)] min-h-[500px]">
      {/* Editor Panel */}
      <div className="space-y-6 flex flex-col h-full">
        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
            <input 
              value={data.title}
              onChange={e => setData({...data, title: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-bold text-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Meta Description</label>
            <textarea 
              value={data.meta_description}
              onChange={e => setData({...data, meta_description: e.target.value})}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-20 text-sm"
            />
          </div>
          <div className="flex-1 flex flex-col min-h-[300px]">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Content (raw HTML)</label>
            <textarea 
              value={data.content}
              onChange={e => setData({...data, content: e.target.value})}
              className="w-full flex-1 bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-sm leading-relaxed custom-scrollbar"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
               <Button variant="outline" size="sm" onClick={handleSave} isLoading={isSaving} className="flex gap-2">
                 <Save className="w-4 h-4" /> {article.status === 'published' ? 'Save Changes' : 'Save Draft'}
               </Button>
               {article.status !== 'published' && onRegenerate && (
                 <Button variant="outline" size="sm" onClick={onRegenerate} className="flex gap-2">
                   <RefreshCw className="w-4 h-4 text-amber-500" /> Rewrite specific settings with AI
                 </Button>
               )}
            </div>
            <div className="flex gap-2">
               {article.status !== 'published' ? (
                 <>
                   <Button variant="outline" size="sm" onClick={() => handleAction('reject')} isLoading={isProcessing} className="text-rose-500 hover:bg-rose-500/10 border-rose-500/20 flex gap-2">
                     <XCircle className="w-4 h-4" /> Reject
                   </Button>
                   <Button variant="primary" size="sm" onClick={() => handleAction('approve')} isLoading={isProcessing} className="flex gap-2">
                     <CheckCircle className="w-4 h-4" /> Approve & Publish
                   </Button>
                 </>
               ) : (
                 <Button variant="outline" size="sm" className="opacity-50 cursor-not-allowed flex gap-2" title="Already published to external site">
                   <Globe className="w-4 h-4 text-emerald-500" /> Published (Live)
                 </Button>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Browser Mockup Preview */}
      <div className="flex flex-col border border-border rounded-xl shadow-2xl overflow-hidden bg-background h-full min-h-[500px]">
         {/* Browser Tabs Row */}
         <div className="bg-secondary/30 pt-2 px-2 flex items-end gap-1 overflow-x-hidden border-b border-border shadow-sm relative z-10">
            <div className="flex items-center gap-2 px-3 py-2 mr-2">
               <div className="w-3 h-3 rounded-full bg-rose-500"></div>
               <div className="w-3 h-3 rounded-full bg-amber-500"></div>
               <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            {/* Active Tab */}
            <div className="bg-background px-4 py-2 rounded-t-lg border border-border border-b-0 min-w-[150px] max-w-[200px] flex items-center gap-2 text-xs text-foreground font-medium truncate shadow-sm relative -mb-[1px]">
               <LayoutTemplate className="w-3 h-3 text-primary shrink-0" />
               <span className="truncate">{data.title || 'New Article'}</span>
            </div>
            {/* Inactive Tab */}
            <div className="bg-transparent hover:bg-secondary/50 px-4 py-2 rounded-t-lg border-transparent border-b-0 min-w-[150px] max-w-[200px] flex items-center gap-2 text-xs text-muted-foreground font-medium truncate transition-colors cursor-pointer hidden sm:flex">
               <span className="truncate">WordPress Admin</span>
            </div>
         </div>

         {/* Browser Toolbar Row */}
         <div className="bg-background px-4 py-2 flex items-center gap-4 border-b border-border">
            <div className="flex items-center gap-3 text-muted-foreground shrink-0">
               <ChevronLeft className="w-4 h-4 cursor-not-allowed opacity-30" />
               <ChevronRight className="w-4 h-4 cursor-not-allowed opacity-30" />
               <RefreshCw className="w-4 h-4 hover:text-foreground cursor-pointer transition-colors" />
            </div>
            
            {/* Address Bar */}
            <div className="flex-1 max-w-2xl mx-auto bg-secondary/30 hover:bg-secondary/50 transition-colors border border-border rounded-full flex items-center px-4 py-1.5 shadow-inner">
               <Lock className="w-3 h-3 text-foreground/50 mr-2 shrink-0" />
               <span className="text-[11px] text-foreground/80 font-mono truncate w-full">
                  https://yoursite.com/{data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
               </span>
            </div>

            {/* Extensions / Menu */}
            <div className="flex items-center gap-3 text-muted-foreground shrink-0 pl-2">
               <Puzzle className="w-4 h-4 hover:text-foreground cursor-pointer transition-colors hidden sm:block" />
               <AlignJustify className="w-4 h-4 hover:text-foreground cursor-pointer transition-colors" />
            </div>
         </div>
         {/* Browser viewport (Light Mode inherently for realistic rendering) */}
         <div className="flex-1 bg-white p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-3xl mx-auto">
               <h1 className="text-4xl font-extrabold text-slate-900 mb-6 leading-tight font-sans">{data.title}</h1>
               <div 
                 className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-xl prose-img:shadow-lg"
                 dangerouslySetInnerHTML={{ __html: data.content }}
               />
            </div>
         </div>
      </div>
    </div>
  );
}
