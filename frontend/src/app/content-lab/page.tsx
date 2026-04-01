'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, 
  Settings, 
  FileText, 
  BarChart, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Map as MapIcon,
  HelpCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Save,
  Globe,
  ChevronRight,
  Eye,
  Code
} from 'lucide-react';
import { io } from 'socket.io-client';
import apiClient from '@/services/apiClient';
import { toast } from 'sonner';

export default function ContentLab() {
  // --- State: Config ---
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [tone, setTone] = useState('professional');
  const [targetLength, setTargetLength] = useState('9000');
  const [includeFaq, setIncludeFaq] = useState(true);
  const [includeConclusion, setIncludeConclusion] = useState(true);
  const [mediaEnabled, setMediaEnabled] = useState(true);
  const [externalLinks, setExternalLinks] = useState('');
  
  // --- State: App ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{status: string, timestamp: string}[]>([]);
  const [article, setArticle] = useState<any>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [compiledPrompt, setCompiledPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'scorecard'>('preview');

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Socket Integration ---
  useEffect(() => {
    const socket = io('http://localhost:4000');
    
    socket.on('connect', () => console.log('[Socket] Connected to backend'));
    
    socket.on('generation:progress', (data) => {
      setProgress(prev => [...prev, data]);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // --- Real-time Prompt Preview ---
  useEffect(() => {
    const fetchPreview = async () => {
      if (!topic && !keywords) return;
      try {
        const { data } = await apiClient.get('/workflows/preview-prompt', {
          params: {
            keyword: topic || keywords,
            secondary_keywords: secondaryKeywords,
            tone,
            target_length: targetLength,
            include_faq: includeFaq,
            include_conclusion: includeConclusion,
            external_links_list: externalLinks
          }
        });
        setCompiledPrompt(data.prompt);
      } catch (e) {}
    };

    const timer = setTimeout(fetchPreview, 800);
    return () => clearTimeout(timer);
  }, [topic, keywords, secondaryKeywords, tone, targetLength, includeFaq, includeConclusion, externalLinks]);

  // --- Actions ---
  const handleGenerate = async () => {
    if (!topic && !keywords) {
      toast.error('Please enter a topic or focus keyword.');
      return;
    }

    setIsGenerating(true);
    setProgress([{ status: 'Initializing generation pipeline...', timestamp: new Date().toISOString() }]);
    setArticle(null);

    try {
      const { data } = await apiClient.post('/workflows/generate-test', {
        keyword: topic || keywords,
        secondary_keywords: secondaryKeywords,
        generation_mode: 'multi_step',
        media_enabled: mediaEnabled,
        tone,
        target_length: targetLength,
        include_faq: includeFaq,
        include_conclusion: includeConclusion,
        external_links_list: externalLinks
      });

      setArticle(data.article);
      toast.success('Article generated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Calculations: SEO Scorecard ---
  const wordCount = article?.content?.split(/\s+/).length || 0;
  const h2Count = (article?.content?.match(/<h2/g) || []).length;
  const kwDensity = keywords ? (article?.content?.toLowerCase().split(keywords.toLowerCase()).length - 1) : 0;

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#030712] text-slate-200 overflow-hidden font-sans">
      
      {/* ─── SIDEBAR: CONFIG ────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-[400px] border-r border-slate-800/50 bg-[#0a0f1d]/80 backdrop-blur-xl flex flex-col p-6 overflow-y-auto z-20">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
            <Rocket className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Content Lab</h1>
            <p className="text-xs text-slate-500 font-medium">Professional SEO Masterclass</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Context */}
          <div className="space-y-4">
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Article Topic/Heading</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Best IPTV Providers in USA 2024"
                  className="w-full bg-[#111827] border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                />
             </div>
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Focus Keyword</label>
                <input 
                  type="text" 
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. best iptv usa"
                  className="w-full bg-[#111827] border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                />
             </div>
          </div>

          <hr className="border-slate-800/50" />

          {/* Configuration Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Voice Tone</label>
                <select 
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-[#111827] border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer"
                >
                  <option value="professional">Professional</option>
                  <option value="creative">Creative/Engaging</option>
                  <option value="academic">Data-Focused</option>
                  <option value="casual">Casual/Supportive</option>
                </select>
             </div>
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Target Length</label>
                <select 
                  value={targetLength}
                  onChange={(e) => setTargetLength(e.target.value)}
                  className="w-full bg-[#111827] border border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer"
                >
                  <option value="1500">Quick Guide (1.5k)</option>
                  <option value="3500">Standard Post (3.5k)</option>
                  <option value="6000">Deep Dive (6k)</option>
                  <option value="9000">Master Blueprint (9k+)</option>
                  <option value="12000">Epic Authority (12k+)</option>
                </select>
             </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
             <label className="flex items-center justify-between p-3 rounded-lg bg-slate-800/20 border border-slate-800/50 cursor-pointer hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                   <HelpCircle className="w-4 h-4 text-indigo-400" />
                   <span className="text-xs font-medium">Include 15+ FAQ</span>
                </div>
                <input type="checkbox" checked={includeFaq} onChange={(e) => setIncludeFaq(e.target.checked)} className="rounded border-slate-700 bg-slate-900 text-indigo-500" />
             </label>
             <label className="flex items-center justify-between p-3 rounded-lg bg-slate-800/20 border border-slate-800/50 cursor-pointer hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                   <BarChart className="w-4 h-4 text-emerald-400" />
                   <span className="text-xs font-medium">Expert Conclusion</span>
                </div>
                <input type="checkbox" checked={includeConclusion} onChange={(e) => setIncludeConclusion(e.target.checked)} className="rounded border-slate-700 bg-slate-900 text-indigo-500" />
             </label>
             <label className="flex items-center justify-between p-3 rounded-lg bg-slate-800/20 border border-slate-800/50 cursor-pointer hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                   <ImageIcon className="w-4 h-4 text-amber-400" />
                   <span className="text-xs font-medium">Rich Multimedia (IM/YT)</span>
                </div>
                <input type="checkbox" checked={mediaEnabled} onChange={(e) => setMediaEnabled(e.target.checked)} className="rounded border-slate-700 bg-slate-900 text-indigo-500" />
             </label>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Authority Links (External)</label>
            <textarea 
              value={externalLinks}
              onChange={(e) => setExternalLinks(e.target.value)}
              placeholder="e.g. bloomberg.com, statista.com"
              className="w-full bg-[#111827] border border-slate-800 rounded-lg px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none min-h-[80px]"
            />
          </div>

          {/* Prompt Debugger Button */}
          <button 
            onClick={() => setShowPromptPreview(!showPromptPreview)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors border border-dashed border-slate-800 rounded-lg"
          >
            <Code className="w-3.5 h-3.5" />
            {showPromptPreview ? 'Hide Master Prompt' : 'View Master Prompt Preview'}
          </button>

          {showPromptPreview && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-black/40 rounded-lg p-3 border border-slate-800 text-[10px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto"
            >
              {compiledPrompt || 'Loading blueprint preview...'}
            </motion.div>
          )}
        </div>

        {/* Generate Button Container */}
        <div className="mt-8 pt-6 border-t border-slate-800/50">
           <button 
             onClick={handleGenerate}
             disabled={isGenerating}
             className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/5 ${isGenerating ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-[1.02] active:scale-[0.98]'}`}
           >
             {isGenerating ? (
               <>
                 <Loader2 className="w-5 h-5 animate-spin" />
                 Generating Epic Hub...
               </>
             ) : (
               <>
                 <Rocket className="w-5 h-5" />
                 Launch Generation
               </>
             )}
           </button>
        </div>
      </aside>

      {/* ─── MAIN AREA: CONTENT ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#111827,transparent)]">
        
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-8 px-10 h-16 border-b border-slate-800/30 bg-[#030712]/50 backdrop-blur-sm z-10">
           {[
             { id: 'preview', icon: Eye, label: 'Article Preview' },
             { id: 'code', icon: Code, label: 'HTML Output' },
             { id: 'scorecard', icon: BarChart, label: 'SEO Scorecard' }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 text-sm font-medium transition-colors relative h-full ${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
             >
               <tab.icon className="w-4 h-4" />
               {tab.label}
               {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
             </button>
           ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-10 py-10 custom-scrollbar" ref={scrollRef}>
          
          <AnimatePresence mode="wait">
            {!article && progress.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-3xl mx-auto space-y-4"
              >
                <div className="bg-[#0f172a] rounded-2xl border border-indigo-500/20 p-8 shadow-2xl">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
                     <div>
                        <h2 className="text-xl font-bold text-white">Generation in Progress...</h2>
                        <p className="text-sm text-slate-400">Our Multi-Step engine is building your high-authority article.</p>
                     </div>
                  </div>
                  
                  <div className="space-y-4 border-l-2 border-slate-800 pl-6 ml-2">
                    {progress.map((p, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        key={idx} 
                        className="flex items-center gap-3 text-sm"
                      >
                        <div className={`w-2 h-2 rounded-full ${idx === progress.length - 1 ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`} />
                        <span className={idx === progress.length - 1 ? 'text-white font-medium' : 'text-slate-500 font-mono text-xs'}>
                          {p.status}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {article && activeTab === 'preview' && (
              <motion.article 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-12 overflow-hidden prose prose-indigo lg:prose-xl selection:bg-indigo-100"
              >
                <h1 className="text-4xl lg:text-5xl font-black mb-8 leading-tight">{article.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: article.content }} className="content-render" />
              </motion.article>
            )}

            {article && activeTab === 'code' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-5xl mx-auto bg-[#0f172a] rounded-xl border border-slate-800 p-6 font-mono text-sm overflow-x-auto text-indigo-300"
              >
                <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
                  <span className="text-slate-500 text-xs">HTML Source Code</span>
                  <button onClick={() => { navigator.clipboard.writeText(article.content); toast.success('Copied to clipboard'); }} className="text-indigo-400 hover:text-white text-xs">Copy All</button>
                </div>
                <code>{article.content}</code>
              </motion.div>
            )}

            {article && activeTab === 'scorecard' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="bg-[#0f172a] p-8 rounded-2xl border border-slate-800 group hover:border-indigo-500/50 transition-all">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Word Count</div>
                   <div className="text-4xl font-black text-white">{wordCount.toLocaleString()}</div>
                   <div className="mt-2 text-xs text-indigo-400">Target: {targetLength} Words</div>
                </div>
                <div className="bg-[#0f172a] p-8 rounded-2xl border border-slate-800 group hover:border-emerald-500/50 transition-all">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Depth (H2 Sections)</div>
                   <div className="text-4xl font-black text-white">{h2Count}</div>
                   <div className="mt-2 text-xs text-emerald-400">Optimal coverage</div>
                </div>
                <div className="bg-[#0f172a] p-8 rounded-2xl border border-slate-800 group hover:border-amber-500/50 transition-all">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Keyword Density</div>
                   <div className="text-4xl font-black text-white">{kwDensity}x</div>
                   <div className="mt-2 text-xs text-amber-400">{keywords} usage</div>
                </div>
              </motion.div>
            )}

            {!article && !isGenerating && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                 <div className="w-24 h-24 bg-slate-800/10 rounded-full flex items-center justify-center mb-6 border border-slate-800/50">
                    <FileText className="w-10 h-10 text-slate-700" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-400 mb-2">Ready to Build?</h3>
                 <p className="text-sm text-slate-600">Configure your SEO parameters on the left and launch the Multi-Step pipeline to see the magic happen.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Action Bar */}
        {article && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#0a0f1d]/90 backdrop-blur-md border border-slate-800 px-6 py-4 rounded-2xl shadow-2xl z-20">
             <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors">
                <Save className="w-4 h-4" />
                Save Draft
             </button>
             <button className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all">
                <Globe className="w-4 h-4" />
                Publish Everywhere
                <ChevronRight className="w-4 h-4" />
             </button>
             <div className="w-px h-6 bg-slate-800 mx-2" />
             <button onClick={() => { setArticle(null); setProgress([]); }} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-5 h-5" />
             </button>
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .content-render h1, .content-render h2, .content-render h3 { color: #0f172a; font-weight: 800; }
        .content-render p { line-height: 1.8; color: #334155; margin-bottom: 1.5rem; }
        .content-render iframe { border-radius: 12px; border: 1px solid #e2e8f0; }
        .content-render img { border-radius: 16px; margin: 2rem 0; }
      `}</style>
    </div>
  );
}
