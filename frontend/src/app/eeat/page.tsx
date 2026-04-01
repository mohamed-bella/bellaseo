'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Link2, 
  AtSign, 
  MessageSquare, 
  Loader2, 
  TrendingUp, 
  Cpu, 
  Globe, 
  CheckCircle2,
  Quote, 
  Activity,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import apiClient from '@/services/apiClient';

// Premium E-E-A-T Command Center UI

export default function EEATPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  // Metrics
  const [metrics, setMetrics] = useState({
    score: 0,
    citations: 0,
    fragments: 0,
    refreshes: 0
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch articles that have E-E-A-T components
      const { data } = await apiClient.get('/articles?has_research=true');
      setArticles(data || []);

      // Calculate Metrics
      let c = 0, f = 0, r = 0, a = 0;
      data.forEach((art: any) => {
        if (art.research_data?.organic?.length > 0) {
          a++;
          c += art.research_data.organic.length;
        }
        if (art.content_fragments) {
          f++;
        }
        if (art.refresh_history?.length > 0) {
          r++;
        }
      });

      setMetrics({
        citations: c,
        fragments: f,
        refreshes: r,
        score: Math.min(100, Math.round((a * 4) + (f * 3) + (r * 5)))
      });

    } catch (err) {
      console.error('Failed to fetch E-E-A-T data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4 opacity-50" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Tracing Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight leading-none mb-2">
            Intelligence <span className="text-primary">Center</span>
          </h1>
          <p className="text-sm font-bold text-muted-foreground mt-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Premium E-E-A-T Engine Traces & Social Echo Pipeline
          </p>
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Global Authority Score', value: metrics.score, icon: ShieldCheck, color: 'text-primary' },
          { label: 'Live Citations Used', value: metrics.citations, icon: Search, color: 'text-emerald-500' },
          { label: 'Social Echoes Generated', value: metrics.fragments, icon: Activity, color: 'text-amber-500' },
          { label: 'Content Refreshes', value: metrics.refreshes, icon: TrendingUp, color: 'text-rose-500' },
        ].map((stat, i) => (
          <div key={i} className="glass-premium grainy p-6 rounded-3xl border border-border group hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-black text-foreground mt-1 group-hover:text-primary transition-colors">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
        
        {/* ── LEFT: INTELLIGENCE TRACES ── */}
        <div className="glass-premium grainy p-8 rounded-3xl border border-border flex flex-col h-[700px]">
          <div className="flex items-center justify-between mb-8 shrink-0">
             <div>
               <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                 <Cpu className="w-5 h-5 text-primary" /> Live Intelligence Traces
               </h2>
               <p className="text-xs font-bold text-muted-foreground mt-1">Real-time fact checks and SERP citations mapped to generated content.</p>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
             {articles.length === 0 && (
                <div className="text-center py-20 text-muted-foreground opacity-50">
                   <ShieldCheck className="w-12 h-12 mx-auto mb-4" />
                   <p className="text-sm font-black uppercase tracking-widest">No traces detected yet.</p>
                </div>
             )}
             {articles.map((art) => (
               <div key={art.id} className={`p-4 rounded-2xl border transition-all ${expandedTrace === art.id ? 'bg-primary/5 border-primary/30' : 'bg-secondary/20 border-border hover:border-border/80'}`}>
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedTrace(expandedTrace === art.id ? null : art.id)}
                  >
                     <div className="flex-1 overflow-hidden pr-4">
                        <div className="flex items-center gap-2 mb-1">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Fact-Checked & Verified</span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground truncate">{art.title}</h4>
                     </div>
                     <div className="text-right shrink-0">
                        <span className="text-xl font-black text-foreground">{art.research_data?.organic?.length || 0}</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sources</p>
                     </div>
                  </div>

                  {/* Expanded Trace Details */}
                  {expandedTrace === art.id && (
                     <div className="mt-6 pt-6 border-t border-border/50 animate-in slide-in-from-top-2">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                           <Globe className="w-3.5 h-3.5 text-primary" /> Sources Appended
                        </h5>
                        <div className="space-y-2 mb-6">
                           {art.research_data?.organic?.slice(0, 5).map((source: any, i: number) => (
                              <a key={i} href={source.link} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-xl bg-background border border-border hover:border-primary/50 transition-colors group">
                                 <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{source.title}</p>
                                 <p className="text-[10px] text-muted-foreground truncate mt-1 flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" /> {new URL(source.link).hostname}
                                 </p>
                              </a>
                           ))}
                        </div>
                        
                        {art.research_data?.peopleAlsoAsk?.length > 0 && (
                          <>
                             <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                <Quote className="w-3.5 h-3.5 text-amber-500" /> FAQ Extracted
                             </h5>
                             <ul className="list-disc list-inside space-y-1 text-xs text-foreground/80 mb-2 pl-1">
                                {art.research_data.peopleAlsoAsk.slice(0, 3).map((faq: any, i: number) => (
                                   <li key={i}>{faq.question}</li>
                                ))}
                             </ul>
                          </>
                        )}
                     </div>
                  )}
               </div>
             ))}
          </div>
        </div>

        {/* ── RIGHT: SOCIAL ECHO ── */}
        <div className="glass-premium grainy p-8 rounded-3xl border border-border flex flex-col h-[700px]">
          <div className="flex items-center justify-between mb-8 shrink-0">
             <div>
               <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                 <Globe className="w-5 h-5 text-primary" /> Social Echo Pipeline
               </h2>
               <p className="text-xs font-bold text-muted-foreground mt-1">Cross-platform authority fragments ready for deployment.</p>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
             {articles.filter(a => a.content_fragments).length === 0 && (
                <div className="text-center py-20 text-muted-foreground opacity-50">
                   <Activity className="w-12 h-12 mx-auto mb-4" />
                   <p className="text-sm font-black uppercase tracking-widest">No social fragments generated.</p>
                </div>
             )}
             
             {articles.filter(a => a.content_fragments).map((art) => (
               <div key={`frag-${art.id}`} className="space-y-4 p-5 rounded-2xl bg-secondary/10 border border-border">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                     <BookOpen className="w-4 h-4 text-muted-foreground" />
                     <p className="text-xs font-bold text-foreground truncate">{art.title}</p>
                  </div>

                  {/* LinkedIn Fragment */}
                  {art.content_fragments?.linkedin && (
                     <div className="p-4 rounded-xl bg-background border border-border relative group">
                        <div className="absolute top-4 right-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity">
                           <Link2 className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">LinkedIn Authority Post</p>
                        <p className="text-xs text-foreground/80 leading-relaxed font-sans">{art.content_fragments.linkedin}</p>
                     </div>
                  )}

                  {/* Twitter Threads */}
                  {art.content_fragments?.twitter && Array.isArray(art.content_fragments.twitter) && (
                     <div className="p-4 rounded-xl bg-background border border-border relative group">
                        <div className="absolute top-4 right-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity">
                           <AtSign className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Twitter Thread</p>
                        <div className="space-y-3">
                           {art.content_fragments.twitter.slice(0, 3).map((tweet: string, i: number) => (
                              <div key={i} className="flex gap-3">
                                 <div className="flex flex-col items-center">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">{i+1}</div>
                                    {i !== 2 && <div className="w-px h-full bg-border my-1" />}
                                 </div>
                                 <p className="text-xs text-foreground/80 leading-relaxed pt-0.5">{tweet}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
             ))}
          </div>
        </div>

      </div>
    </div>
  );
}
