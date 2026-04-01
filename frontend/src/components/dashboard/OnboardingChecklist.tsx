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
    description: 'Link your WordPress or Blogger site so articles can be published automatically.',
    cta: 'Connect a Site',
    href: '/sites',
    icon: Globe,
    checkKey: 'hasSites' as keyof Props,
  },
  {
    number: 2,
    title: 'Create a project',
    description: 'A project groups your content strategy around a topic or niche.',
    cta: 'Create My First Project',
    href: '/campaigns',
    icon: FolderKanban,
    checkKey: 'hasCampaigns' as keyof Props,
  },
  {
    number: 3,
    title: 'Add topics & generate content',
    description: 'Add the keywords you want to rank for — the AI will write SEO articles for each one.',
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
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Setup Complete! 🎉</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Your SEO autopilot is ready. Go to a project and generate your first article.</p>
          </div>
        </div>
        <Link
          href="/campaigns"
          className="btn-primary gap-2"
        >
          Generate Articles <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-8 border border-border space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-primary">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground leading-tight">Getting Started</h3>
            <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest mt-1">{completedCount} of 3 steps complete</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-black text-primary uppercase tracking-widest">{progress}% Done</span>
          <div className="w-32 h-1.5 bg-secondary rounded-full overflow-hidden mt-1.5 border border-border">
            <div
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step) => {
          const isDone = flags[step.checkKey];
          const Icon = step.icon;

          return (
            <div
              key={step.number}
              className={`relative rounded-xl p-6 border transition-colors ${
                isDone
                  ? 'border-emerald-100 bg-emerald-50/50'
                  : 'border-border bg-card'
              }`}
            >
              {/* Step number / done badge */}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${isDone ? 'border-emerald-200 bg-emerald-100 text-emerald-600' : 'border-primary/20 bg-primary/5 text-primary'}`}>
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : step.number}
                </div>
                <Icon className={`w-5 h-5 ${isDone ? 'text-emerald-500' : 'text-muted-foreground opacity-50'}`} />
              </div>

              <p className={`text-base font-bold mb-1 ${isDone ? 'text-emerald-600 line-through opacity-50' : 'text-foreground'}`}>
                {step.title}
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 font-medium">
                {step.description}
              </p>

              {!isDone && (
                <Link href={step.href} className="text-sm font-bold text-primary hover:opacity-80 transition-opacity flex items-center gap-2">
                  {step.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

