'use client';

import { useMemo } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { scoreSeo, type SeoScore } from '@/lib/seoScorer';

interface SeoScorePanelProps {
  title: string;
  content: string;
  metaDescription: string;
  keyword: string;
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-secondary" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-foreground">{score}</span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">/ 100</span>
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: SeoScore['checks'][0] }) {
  const pct = check.maxScore > 0 ? check.earned / check.maxScore : 0;
  const Icon = pct >= 1 ? CheckCircle2 : pct > 0 ? AlertCircle : XCircle;
  const iconColor = pct >= 1 ? 'text-emerald-500' : pct > 0 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground">{check.label}</span>
          <span className="text-[10px] font-bold text-muted-foreground shrink-0">
            {check.earned}/{check.maxScore}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{check.detail}</p>
      </div>
    </div>
  );
}

export default function SeoScorePanel({ title, content, metaDescription, keyword }: SeoScorePanelProps) {
  const score = useMemo(
    () => scoreSeo(title, content, metaDescription, keyword),
    [title, content, metaDescription, keyword]
  );

  const gradeLabel = {
    A: 'Excellent',
    B: 'Good',
    C: 'Needs Work',
    D: 'Poor',
    F: 'Critical',
  }[score.grade];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-secondary/30 flex items-center gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest">SEO Score</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {keyword ? `Analyzing for "${keyword}"` : 'No keyword — open article to analyze'}
          </p>
        </div>
        <div
          className="text-xs font-black px-2.5 py-1 rounded-full border"
          style={{ color: score.color, borderColor: `${score.color}40`, backgroundColor: `${score.color}15` }}
        >
          {score.grade} — {gradeLabel}
        </div>
      </div>

      {/* Ring + score */}
      <div className="p-6 border-b border-border">
        <ScoreRing score={score.total} color={score.color} />
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-emerald-500 font-black text-lg">{score.checks.filter(c => c.pass).length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Passed</p>
          </div>
          <div>
            <p className="text-amber-500 font-black text-lg">{score.checks.filter(c => !c.pass && c.earned > 0).length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Partial</p>
          </div>
          <div>
            <p className="text-rose-500 font-black text-lg">{score.checks.filter(c => c.earned === 0).length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Failed</p>
          </div>
        </div>
      </div>

      {/* Checks list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0 custom-scrollbar">
        {score.checks.map(check => (
          <CheckRow key={check.id} check={check} />
        ))}
      </div>
    </div>
  );
}
