'use client';

import Link from 'next/link';
import { CheckCircle2, Globe, FolderKanban, Tags, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  hasSites: boolean;
  hasCampaigns: boolean;
  hasKeywords: boolean;
}

const steps = [
  {
    number: 1,
    title: 'Connect a website',
    description: 'Link your WordPress or Blogger site for automatic publishing.',
    cta: 'Connect a Site',
    href: '/sites',
    icon: Globe,
    checkKey: 'hasSites' as keyof Props,
  },
  {
    number: 2,
    title: 'Create a project',
    description: 'A project groups your content strategy around a niche.',
    cta: 'Create Project',
    href: '/campaigns',
    icon: FolderKanban,
    checkKey: 'hasCampaigns' as keyof Props,
  },
  {
    number: 3,
    title: 'Add keywords & generate',
    description: 'Add target keywords — the AI writes SEO articles for each one.',
    cta: 'Add Keywords',
    href: '/keywords',
    icon: Tags,
    checkKey: 'hasKeywords' as keyof Props,
  },
];

export default function OnboardingChecklist({ hasSites, hasCampaigns, hasKeywords }: Props) {
  const flags = { hasSites, hasCampaigns, hasKeywords };
  const completedCount = [hasSites, hasCampaigns, hasKeywords].filter(Boolean).length;
  const allDone = completedCount === 3;
  const progress = Math.round((completedCount / 3) * 100);

  if (allDone) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-black text-foreground">All set! 🎉</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your SEO engine is ready. Start generating articles.</p>
          </div>
        </div>
        <Link href="/campaigns" className="btn-primary gap-2 text-sm shrink-0">
          Generate Articles <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-base font-black text-foreground">Getting Started</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">{completedCount} of 3 steps</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest">{progress}%</span>
          <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden mt-1 border border-border">
            <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step) => {
          const isDone = flags[step.checkKey];
          const Icon = step.icon;

          return (
            <div
              key={step.number}
              className={`rounded-xl p-5 border transition-colors ${
                isDone
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-border bg-secondary/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border ${
                  isDone 
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' 
                    : 'border-primary/20 bg-primary/5 text-primary'
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.number}
                </div>
                <Icon className={`w-4 h-4 ${isDone ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
              </div>

              <p className={`text-sm font-bold mb-1 ${isDone ? 'text-emerald-500 line-through opacity-50' : 'text-foreground'}`}>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {step.description}
              </p>

              {!isDone && (
                <Link href={step.href} className="text-xs font-bold text-primary hover:opacity-80 transition-opacity flex items-center gap-1.5">
                  {step.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
