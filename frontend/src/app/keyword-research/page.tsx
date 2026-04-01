'use client';

import { useState } from 'react';
import { Search, TrendingUp, Target, Zap, BarChart2, Globe, ChevronRight, Sparkles, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────
interface TrendPoint { date: string; value: number; }
interface SerpResult  { title: string; url: string; snippet: string; }
interface ResearchResult {
  keyword: string;
  volume_score: number;
  kd: number;
  difficulty: { label: string; color: string; emoji: string };
  trend_score: number;
  trend_data: TrendPoint[];
  opportunity: number;
  related_keywords: string[];
  serp: SerpResult[];
  results_count: number;
  trend_fallback: boolean;
}

// ─── Inline Trend Sparkline (no extra lib needed) ───────────────────────────
function TrendChart({ data }: { data: TrendPoint[] }) {
  if (!data || data.length === 0) return (
    <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No trend data</div>
  );
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 600; const H = 120; const pad = 20;
  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - pad - (d.value / max) * (H - pad * 2),
    ...d,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fill = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    + ` L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#trendGrad)" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--primary)" opacity="0.5"/>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground px-1 mt-1">
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ─── Metric Arc (Gauge) ──────────────────────────────────────────────────────
function GaugeArc({ value, color }: { value: number; color: string }) {
  const r = 36; const cx = 44; const cy = 44;
  const circumference = Math.PI * r; // half circle
  const dash = (value / 100) * circumference;
  return (
    <svg width="88" height="50" viewBox="0 0 88 50">
      <path d={`M 8 44 A ${r} ${r} 0 0 1 80 44`} fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary" strokeLinecap="round"/>
      <path d={`M 8 44 A ${r} ${r} 0 0 1 80 44`} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round" className="transition-all duration-1000"/>
      <text x={cx} y={cy - 4} textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="bold" className="text-foreground">{value}</text>
    </svg>
  );
}

// ─── KD Color Map ────────────────────────────────────────────────────────────
const kdColor = (kd: number) => kd <= 30 ? '#22c55e' : kd <= 60 ? '#f59e0b' : '#ef4444';
const kdBg    = (kd: number) => kd <= 30 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : kd <= 60 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400';

// ─── Loading Steps ───────────────────────────────────────────────────────────
const STEPS = [
  'Fetching keyword suggestions…',
  'Querying Google Trends…',
  'Analyzing SERP competition…',
  'Calculating difficulty score…',
  'Computing opportunity metrics…',
];

export default function KeywordResearchPage() {
  const [query,    setQuery]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState(0);
  const [result,   setResult]   = useState<ResearchResult | null>(null);
  const [history,  setHistory]  = useState<string[]>([]);

  const runResearch = async (kw?: string) => {
    const keyword = (kw || query).trim();
    if (!keyword) { toast.error('Enter a keyword to analyze'); return; }
    setLoading(true);
    setResult(null);
    setStep(0);

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }, 2200);

    try {
      const { data } = await apiClient.post('/keywords/research', { keyword });
      setResult(data);
      setHistory(h => [keyword, ...h.filter(k => k !== keyword)].slice(0, 8));
      toast.success(`Analysis complete for "${keyword}"`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Research failed. Try again.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const copyKeyword = (kw: string) => {
    navigator.clipboard.writeText(kw);
    toast.success(`Copied: ${kw}`);
  };

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Research Engine
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Keyword Research</h1>
        <p className="text-muted-foreground mt-1">Free & unlimited SEO metric estimates — powered by Google data + custom algorithms.</p>
      </div>

      {/* Search Hero */}
      <div className="card-premium p-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors"/>
            <input
              type="text"
              id="keyword-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runResearch()}
              placeholder="e.g. best ai writer 2026, seo tools free..."
              className="w-full bg-secondary border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/60"
            />
          </div>
          <button
            id="research-btn"
            onClick={() => runResearch()}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <TrendingUp className="w-4 h-4"/>}
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
        </div>

        {/* Search History */}
        {history.length > 0 && !loading && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Recent:</span>
            {history.map(kw => (
              <button key={kw} onClick={() => { setQuery(kw); runResearch(kw); }}
                className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/10 hover:text-primary border border-border transition-all text-muted-foreground">
                {kw}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card-premium p-10 flex flex-col items-center gap-6 animate-in fade-in duration-300">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"/>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"/>
            <TrendingUp className="absolute inset-0 m-auto w-8 h-8 text-primary"/>
          </div>
          <div className="text-center space-y-2">
            <p className="text-foreground font-semibold text-lg">{STEPS[step]}</p>
            <p className="text-muted-foreground text-sm">This can take 10-20 seconds for accurate data</p>
          </div>
          <div className="w-full max-w-xs space-y-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${i < step ? 'bg-emerald-400' : i === step ? 'bg-primary animate-pulse' : 'bg-border'}`}/>
                <span className={`text-xs transition-colors duration-300 ${i < step ? 'text-emerald-400 line-through' : i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Volume */}
            <div className="card-premium p-5 flex flex-col items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Volume Score</span>
              <GaugeArc value={result.volume_score} color="#6366f1"/>
              <span className="text-xs text-muted-foreground">{result.volume_score}/100</span>
            </div>
            {/* KD */}
            <div className="card-premium p-5 flex flex-col items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Keyword Difficulty</span>
              <GaugeArc value={result.kd} color={kdColor(result.kd)}/>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${kdBg(result.kd)}`}>
                {result.difficulty.emoji} {result.difficulty.label}
              </span>
            </div>
            {/* Trend */}
            <div className="card-premium p-5 flex flex-col items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Trend Score</span>
              <GaugeArc value={result.trend_score} color="#10b981"/>
              <span className="text-xs text-muted-foreground">{result.trend_fallback ? 'Estimated' : 'Live'}</span>
            </div>
            {/* Opportunity */}
            <div className="card-premium p-5 flex flex-col items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Opportunity</span>
              <div className="text-4xl font-black text-primary">{result.opportunity}x</div>
              <span className="text-[10px] text-center text-muted-foreground leading-snug">
                {result.opportunity >= 2 ? '🚀 High potential!' : result.opportunity >= 1 ? '✅ Worth targeting' : '⚠️ Competitive'}
              </span>
            </div>
          </div>

          {/* 2-col grid: Trends + Competitors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trends Chart */}
            <div className="card-premium p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary"/>
                  <h3 className="font-bold text-foreground">Interest Over Time</h3>
                </div>
                {result.trend_fallback && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">ESTIMATED</span>
                )}
              </div>
              <TrendChart data={result.trend_data}/>
              <p className="text-[10px] text-muted-foreground">
                {result.trend_fallback
                  ? 'Live Google Trends unavailable in this network environment — showing AI-estimated trend pattern.'
                  : 'Data from Google Trends — last 12 months, normalized 0–100.'}
              </p>
            </div>

            {/* SERP Results */}
            <div className="card-premium p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary"/>
                  <h3 className="font-bold text-foreground">SERP Competitors</h3>
                </div>
                <span className="text-xs text-muted-foreground">~{(result.results_count / 1000000).toFixed(1)}M results</span>
              </div>
              {result.serp.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {result.serp.slice(0, 8).map((r, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group">
                      <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 mt-0.5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{r.title || r.url}</p>
                        <p className="text-[10px] text-primary truncate">{r.url}</p>
                        {r.snippet && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{r.snippet}</p>}
                      </div>
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary">
                        <ExternalLink className="w-3.5 h-3.5"/>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                  SERP scraping was blocked — try again or use a VPN.
                </div>
              )}
            </div>
          </div>

          {/* Related Keywords */}
          <div className="card-premium p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary"/>
              <h3 className="font-bold text-foreground">Related Keywords</h3>
              <span className="ml-auto text-xs text-muted-foreground">{result.related_keywords.length} suggestions</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {result.related_keywords.map((kw, i) => (
                <div key={i} className="group flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => { setQuery(kw); runResearch(kw); }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight className="w-3 h-3 text-primary shrink-0"/>
                    <span className="text-sm text-foreground truncate">{kw}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); copyKeyword(kw); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary">
                    <Copy className="w-3 h-3"/>
                  </button>
                </div>
              ))}
              {result.related_keywords.length === 0 && (
                <p className="col-span-3 text-sm text-muted-foreground py-4 text-center">No suggestions available.</p>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="card-premium p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-3.5 h-3.5 text-primary"/>
              <span>Low KD + High Volume keywords are the best targets for quick wins.</span>
            </div>
            <button onClick={() => runResearch()}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-muted text-muted-foreground text-xs font-medium transition-all">
              <RefreshCw className="w-3.5 h-3.5"/> Re-analyze
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <div className="card-premium p-16 flex flex-col items-center text-center gap-4 text-muted-foreground">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <Search className="w-10 h-10 text-primary opacity-60"/>
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-foreground font-semibold text-lg">Start your research</p>
            <p className="text-sm leading-relaxed">Enter any keyword or topic above to get instant volume estimates, keyword difficulty, Google Trends data, and competitor analysis.</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {['seo tools free', 'ai content writer', 'keyword research 2026'].map(kw => (
              <button key={kw} onClick={() => { setQuery(kw); runResearch(kw); }}
                className="text-xs px-4 py-2 rounded-full border border-border hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all">
                Try: &ldquo;{kw}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
