'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, 
  Settings, 
  FileText, 
  BarChart, 
  Image as ImageIcon,
  HelpCircle,
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
import Button from '@/components/ui/Button';

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
    <div className="w-full max-w-7xl mx-auto space-y-6 focus:outline-none pb-12">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E8EB] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1D23] tracking-tight">Content Lab</h1>
          <p className="text-sm text-[#6B7280] mt-1">Manual generation and prompt experimentation sandbox.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        
        {/* ─── LEFT PANEL: CONFIGURATION ─── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card-premium">
            <h3 className="text-sm font-bold text-[#1A1D23] uppercase tracking-wider mb-4 border-b border-[#E5E8EB] pb-2">Target Data</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1 block">Article Topic</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Best Coffee Makers"
                  className="w-full bg-white border border-[#E5E8EB] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1 block">Focus Keyword</label>
                <input 
                  type="text" 
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. best coffee maker 2025"
                  className="w-full bg-white border border-[#E5E8EB] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="card-premium">
            <h3 className="text-sm font-bold text-[#1A1D23] uppercase tracking-wider mb-4 border-b border-[#E5E8EB] pb-2">Parameters</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1 block">Tone</label>
                <select 
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-white border border-[#E5E8EB] rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D] outline-none"
                >
                  <option value="professional">Professional</option>
                  <option value="creative">Creative</option>
                  <option value="academic">Academic</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1 block">Length</label>
                <select 
                  value={targetLength}
                  onChange={(e) => setTargetLength(e.target.value)}
                  className="w-full bg-white border border-[#E5E8EB] rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D] outline-none"
                >
                  <option value="1500">1.5k Words</option>
                  <option value="3500">3.5k Words</option>
                  <option value="6000">6.0k Words</option>
                  <option value="9000">9.0k+ Words</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-md border border-[#E5E8EB] cursor-pointer hover:bg-[#F7F8FA]">
                 <span className="text-sm font-medium text-[#1A1D23] flex items-center gap-2"><HelpCircle className="w-4 h-4 text-[#FF642D]" /> Add 15+ FAQ</span>
                 <input type="checkbox" checked={includeFaq} onChange={(e) => setIncludeFaq(e.target.checked)} className="rounded border-[#E5E8EB] text-[#FF642D] focus:ring-[#FF642D]" />
              </label>
              <label className="flex items-center justify-between p-2.5 rounded-md border border-[#E5E8EB] cursor-pointer hover:bg-[#F7F8FA]">
                 <span className="text-sm font-medium text-[#1A1D23] flex items-center gap-2"><BarChart className="w-4 h-4 text-[#10B981]" /> Add Conclusion</span>
                 <input type="checkbox" checked={includeConclusion} onChange={(e) => setIncludeConclusion(e.target.checked)} className="rounded border-[#E5E8EB] text-[#FF642D] focus:ring-[#FF642D]" />
              </label>
              <label className="flex items-center justify-between p-2.5 rounded-md border border-[#E5E8EB] cursor-pointer hover:bg-[#F7F8FA]">
                 <span className="text-sm font-medium text-[#1A1D23] flex items-center gap-2"><ImageIcon className="w-4 h-4 text-[#F59E0B]" /> Multimedia Insert</span>
                 <input type="checkbox" checked={mediaEnabled} onChange={(e) => setMediaEnabled(e.target.checked)} className="rounded border-[#E5E8EB] text-[#FF642D] focus:ring-[#FF642D]" />
              </label>
            </div>
          </div>

          <div className="card-premium">
            <button 
              onClick={() => setShowPromptPreview(!showPromptPreview)}
              className="w-full text-xs font-semibold text-[#FF642D] hover:underline flex items-center justify-center gap-1.5 mb-2"
            >
              <Code className="w-3.5 h-3.5" />
              {showPromptPreview ? 'Hide Master Prompt' : 'View Master Prompt Preview'}
            </button>
            {showPromptPreview && (
              <div className="bg-[#F7F8FA] rounded-md p-3 border border-[#E5E8EB] text-[10px] font-mono text-[#6B7280] whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto mt-2">
                {compiledPrompt || 'Loading blueprint preview...'}
              </div>
            )}
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 h-auto"
            size="lg"
            isLoading={isGenerating}
          >
            <Rocket className="w-4 h-4" />
            Launch Generation
          </Button>

        </div>

        {/* ─── RIGHT PANEL: OUTPUT & VISUALIZATION ─── */}
        <div className="lg:col-span-2 flex flex-col h-[800px] card-premium p-0 overflow-hidden">
          
          <div className="flex items-center gap-4 px-6 border-b border-[#E5E8EB] bg-[#F7F8FA]">
            {[
              { id: 'preview', icon: Eye, label: 'Preview' },
              { id: 'code', icon: Code, label: 'HTML Output' },
              { id: 'scorecard', icon: BarChart, label: 'Scorecard' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 text-sm font-semibold py-4 border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#FF642D] text-[#FF642D]' : 'border-transparent text-[#6B7280] hover:text-[#1A1D23]'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar relative" ref={scrollRef}>
            
            {!article && !isGenerating && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                 <div className="w-20 h-20 bg-[#F7F8FA] rounded-full border border-[#E5E8EB] flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-[#9CA3AF]" />
                 </div>
                 <h3 className="text-lg font-bold text-[#1A1D23]">Awaiting Generation</h3>
                 <p className="text-sm text-[#6B7280] max-w-sm mt-1">Configure your SEO parameters on the left and start the process.</p>
              </div>
            )}

            {!article && isGenerating && (
              <div className="max-w-xl mx-auto space-y-4 pt-10">
                <div className="flex animate-pulse items-center gap-4 mb-6 pb-6 border-b border-[#E5E8EB]">
                   <Loader2 className="w-8 h-8 text-[#FF642D] animate-spin" />
                   <div>
                      <h2 className="text-lg font-bold text-[#1A1D23]">Generation in Progress</h2>
                      <p className="text-sm text-[#6B7280]">Multi-Step SEO engine is building your master article.</p>
                   </div>
                </div>
                
                <div className="space-y-4 border-l-2 border-[#E5E8EB] pl-6 ml-2">
                  {progress.map((p, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      key={idx} 
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className={`w-2 h-2 rounded-full ${idx === progress.length - 1 ? 'bg-[#FF642D] shadow-[0_0_8px_rgba(255,100,45,0.5)]' : 'bg-[#D1D5DB]'}`} />
                      <span className={idx === progress.length - 1 ? 'text-[#1A1D23] font-bold' : 'text-[#6B7280] font-medium'}>
                        {p.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {article && activeTab === 'preview' && (
              <article className="prose prose-sm md:prose-base max-w-none text-[#334155]">
                <h1 className="text-3xl font-black mb-6 text-[#1A1D23]">{article.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: article.content }} className="content-render" />
              </article>
            )}

            {article && activeTab === 'code' && (
              <div className="font-mono text-sm text-[#6B7280] whitespace-pre-wrap bg-[#F3F4F6] p-4 rounded-md border border-[#E5E8EB]">
                {article.content}
              </div>
            )}

            {article && activeTab === 'scorecard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-xl border border-[#E5E8EB] bg-[#F7F8FA]">
                   <div className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-2">Word Count</div>
                   <div className="text-4xl font-black text-[#1A1D23]">{wordCount.toLocaleString()}</div>
                   <div className="mt-1 text-xs text-[#FF642D] font-medium">Target: {targetLength}</div>
                </div>
                <div className="p-6 rounded-xl border border-[#E5E8EB] bg-[#F7F8FA]">
                   <div className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-2">H2 Depth</div>
                   <div className="text-4xl font-black text-[#1A1D23]">{h2Count}</div>
                   <div className="mt-1 text-xs text-[#10B981] font-medium">Optimal coverage</div>
                </div>
                <div className="p-6 rounded-xl border border-[#E5E8EB] bg-[#F7F8FA] md:col-span-2">
                   <div className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-2">Keyword Density ({keywords})</div>
                   <div className="text-4xl font-black text-[#1A1D23]">{kwDensity}x Mentions</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Action Bar Overlay Inside the Container */}
          {article && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white border border-[#E5E8EB] px-4 py-3 rounded-full shadow-xl shadow-black/5">
               <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#F3F4F6] rounded-md text-sm font-semibold text-[#1A1D23] transition-colors border border-[#E5E8EB]">
                  <Save className="w-4 h-4" />
                  Save Draft
               </button>
               <Button size="sm" className="px-5 rounded-full shadow-md">
                  <Globe className="w-3.5 h-3.5 mr-1.5" />
                  Publish To Site
               </Button>
               <div className="w-px h-5 bg-[#E5E8EB] mx-1" />
               <button onClick={() => { setArticle(null); setProgress([]); }} className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] transition-colors rounded-md hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
               </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
