'use client';

import { useEffect, useState } from 'react';
import {
  Brain,
  Zap,
  RefreshCw,
  Link2,
  AtSign,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  Search,
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AuthorityMetrics {
  totalCitations: number;
  articlesWithResearch: number;
  fragmentsGenerated: number;
  linkedInFragments: number;
  twitterFragments: number;
  redditFragments: number;
  articlesRefreshed: number;
  schemaInjected: number;
  indexingSubmitted: number;
}

export default function AuthorityCard() {
  const [metrics, setMetrics] = useState<AuthorityMetrics>({
    totalCitations: 0,
    articlesWithResearch: 0,
    fragmentsGenerated: 0,
    linkedInFragments: 0,
    twitterFragments: 0,
    redditFragments: 0,
    articlesRefreshed: 0,
    schemaInjected: 0,
    indexingSubmitted: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data: articles } = await apiClient.get('/articles?limit=200');

        if (!Array.isArray(articles)) return;

        let totalCitations = 0;
        let articlesWithResearch = 0;
        let fragmentsGenerated = 0;
        let linkedInFragments = 0;
        let twitterFragments = 0;
        let redditFragments = 0;
        let articlesRefreshed = 0;
        let schemaInjected = 0;
        let indexingSubmitted = 0;

        for (const art of articles) {
          if (art.research_data?.organic?.length > 0) {
            articlesWithResearch++;
            totalCitations += art.research_data.organic.length;
          }
          if (art.content_fragments) {
            fragmentsGenerated++;
            if (art.content_fragments.linkedin) linkedInFragments++;
            if (art.content_fragments.twitter) twitterFragments++;
            if (art.content_fragments.reddit) redditFragments++;
          }
          if (art.refresh_history?.length > 0) articlesRefreshed++;
          if (art.schema_json) schemaInjected++;
          if (art.indexing_submitted_at) indexingSubmitted++;
        }

        setMetrics({
          totalCitations,
          articlesWithResearch,
          fragmentsGenerated,
          linkedInFragments,
          twitterFragments,
          redditFragments,
          articlesRefreshed,
          schemaInjected,
          indexingSubmitted,
        });
      } catch (err) {
        console.error('[AuthorityCard] Failed to fetch metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const authorityScore = Math.min(
    100,
    Math.round(
      (metrics.articlesWithResearch * 4) +
      (metrics.fragmentsGenerated * 3) +
      (metrics.articlesRefreshed * 5) +
      (metrics.schemaInjected * 3) +
      (metrics.indexingSubmitted * 5)
    )
  );

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-12 border border-border flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size={40} />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-8 border border-border space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center text-primary">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">E-E-A-T Engine</h3>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-black">Expertise · Trust · Authority</p>
          </div>
        </div>

        {/* Authority Score */}
        <div className="flex flex-col items-center">
          <div className="text-3xl font-black text-primary">{authorityScore}</div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Authority Score</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-3 mb-2">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Live Citations</span>
          </div>
          <p className="text-3xl font-black text-foreground">{metrics.totalCitations}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Sourced from current news & studies</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Schema Power</span>
          </div>
          <p className="text-3xl font-black text-foreground">{metrics.schemaInjected}</p>
          <p className="text-[11px] text-muted-foreground mt-1">JSON-LD entities injected</p>
        </div>
      </div>

      {/* Platform Fragments */}
      <div>
        <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary" /> Cross-Platform Fragments
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <PlatformBadge icon={<Link2 className="w-4 h-4" />} label="LinkedIn" value={metrics.linkedInFragments} />
          <PlatformBadge icon={<AtSign className="w-4 h-4" />} label="Twitter" value={metrics.twitterFragments} />
          <PlatformBadge icon={<MessageSquare className="w-4 h-4" />} label="Reddit" value={metrics.redditFragments} />
        </div>
      </div>

      {/* Footer Stats */}
      <div className="pt-6 border-t border-border grid grid-cols-2 gap-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-primary" />
          <div>
            <p className="text-lg font-bold text-foreground leading-tight">{metrics.articlesRefreshed}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase">Articles Refreshed</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div className="flex-1">
            <p className="text-lg font-bold text-foreground leading-tight">{metrics.indexingSubmitted}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase">Google Indexing</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
      </div>
    </div>
  );
}

function PlatformBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card">
      <div className="text-primary mb-2">{icon}</div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
      <span className="text-xl font-black text-foreground">{value}</span>
    </div>
  );
}

