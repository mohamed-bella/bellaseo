'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Zap,
  ArrowRight,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { 
  FcHome, 
  FcLineChart, 
  FcFolder, 
  FcKey, 
  FcOpenedFolder, 
  FcMindMap, 
  FcFlashOn, 
  FcGlobe, 
  FcAlarmClock, 
  FcSettings, 
  FcApproval,
  FcRadarPlot,
  FcTemplate,
  FcBusinessman
} from 'react-icons/fc';
import { useAppStore } from '@/state/store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BRANDING } from '@/config/branding';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const colorMap: Record<string, { bg: string; ring: string; shadow: string; bar: string }> = {
  'blue': { bg: 'bg-blue-500/10', ring: 'ring-blue-500/50', shadow: 'shadow-[0_0_10px_theme(colors.blue.500)]', bar: 'bg-blue-500' },
  'purple': { bg: 'bg-purple-500/10', ring: 'ring-purple-500/50', shadow: 'shadow-[0_0_10px_theme(colors.purple.500)]', bar: 'bg-purple-500' },
  'emerald': { bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/50', shadow: 'shadow-[0_0_10px_theme(colors.emerald.500)]', bar: 'bg-emerald-500' },
  'pink': { bg: 'bg-pink-500/10', ring: 'ring-pink-500/50', shadow: 'shadow-[0_0_10px_theme(colors.pink.500)]', bar: 'bg-pink-500' },
  'rose': { bg: 'bg-rose-500/10', ring: 'ring-rose-500/50', shadow: 'shadow-[0_0_10px_theme(colors.rose.500)]', bar: 'bg-rose-500' },
  'red': { bg: 'bg-red-500/10', ring: 'ring-red-500/50', shadow: 'shadow-[0_0_10px_theme(colors.red.500)]', bar: 'bg-red-500' },
  'orange': { bg: 'bg-orange-500/10', ring: 'ring-orange-500/50', shadow: 'shadow-[0_0_10px_theme(colors.orange.500)]', bar: 'bg-orange-500' },
  'amber': { bg: 'bg-amber-500/10', ring: 'ring-amber-500/50', shadow: 'shadow-[0_0_10px_theme(colors.amber.500)]', bar: 'bg-amber-500' },
  'cyan': { bg: 'bg-cyan-500/10', ring: 'ring-cyan-500/50', shadow: 'shadow-[0_0_10px_theme(colors.cyan.500)]', bar: 'bg-cyan-500' },
  'teal': { bg: 'bg-teal-500/10', ring: 'ring-teal-500/50', shadow: 'shadow-[0_0_10px_theme(colors.teal.500)]', bar: 'bg-teal-500' },
  'slate': { bg: 'bg-slate-500/10', ring: 'ring-slate-500/50', shadow: 'shadow-[0_0_10px_theme(colors.slate.500)]', bar: 'bg-slate-500' },
};

const navGroups = [
  {
    label: 'Main',
    items: [
      { name: 'Dashboard', icon: FcHome, href: '/', themeColor: 'blue' },
      { name: 'Traffic Stats', icon: FcLineChart, href: '/analytics', themeColor: 'purple' },
      { name: 'Opportunity Radar', icon: FcRadarPlot, href: '/radar', themeColor: 'red' },
    ]
  },
  {
    label: 'Content Engine',
    items: [
      { name: 'Projects', icon: FcFolder, href: '/campaigns', themeColor: 'emerald' },
      { name: 'Keywords', icon: FcKey, href: '/keywords', themeColor: 'pink' },
      { name: 'Research Engine', icon: FcRadarPlot, href: '/keyword-research', themeColor: 'blue' },
      { name: 'Topic Maps', icon: FcMindMap, href: '/map', themeColor: 'orange' },
      { name: 'Articles', icon: FcOpenedFolder, href: '/articles', themeColor: 'rose' },
      { name: 'Auto-Publish', icon: FcFlashOn, href: '/workflows', themeColor: 'amber' },
      { name: 'Content Lab', icon: Zap, href: '/content-lab', themeColor: 'amber' },
    ]
  },
  {
    label: 'System & Org',
    items: [
      { name: 'Integrations', icon: FcGlobe, href: '/sites', themeColor: 'cyan' },
      { name: 'Authority Builder', icon: FcApproval, href: '/eeat', themeColor: 'teal' },
      { name: 'Article Studio', icon: FcTemplate, href: '/article-config', themeColor: 'purple' },
      { name: 'Notifications', icon: FcAlarmClock, href: '/notifications', themeColor: 'pink' },
      { name: 'Team', icon: FcBusinessman, href: '/team', themeColor: 'blue' },
      { name: 'Settings', icon: FcSettings, href: '/settings', themeColor: 'slate' },
    ]
  }
];

const STEPS = [
  { label: 'Connect a site', href: '/sites' },
  { label: 'Create a project', href: '/campaigns' },
  { label: 'Add topics & generate', href: '/keywords' },
];

interface SidebarProps {
  dynamicBranding?: any;
}

export default function Sidebar({ dynamicBranding }: SidebarProps) {
  const pathname = usePathname();
  const { isSidebarOpen, setSidebarOpen } = useAppStore();
  const [role, setRole] = useState<'admin' | 'editor'>('admin');

  useEffect(() => {
    // If screen is mobile, close sidebar by default or on navigation
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    
    try {
      const userStr = localStorage.getItem('seo_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role) setRole(user.role);
      }
    } catch (e) { /* ignore */ }
  }, [setSidebarOpen, pathname]); // Run on mount and on navigation

  // No need for a flat visibleNavItems array, as we map over groups
  const brandName = dynamicBranding?.name || BRANDING.name;
  const companyName = dynamicBranding?.companyName || BRANDING.companyName;
  const iconName = dynamicBranding?.iconName || BRANDING?.logo?.iconName || 'TrendingUp';
  const DynamicIcon = (LucideIcons as any)[iconName] || TrendingUp;

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 h-screen shrink-0 transition-all duration-500 ease-out-quart flex flex-col bg-card border-r border-border md:sticky md:translate-x-0',
          isSidebarOpen ? 'translate-x-0 w-64 shadow-2xl md:shadow-none' : '-translate-x-full md:w-20 md:translate-x-0 overflow-hidden'
        )}
      >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 md:p-6 shrink-0 h-[80px]">
        <div className="bg-primary shadow-lg shadow-primary/20 p-2 rounded-xl shrink-0 flex items-center justify-center transition-transform duration-300 hover:scale-105 ease-out-quart">
          <DynamicIcon className="w-5 h-5 text-white" />
        </div>
        {isSidebarOpen && (
          <div className="animate-in fade-in duration-300 ease-out-quart">
            <span className="font-bold text-lg tracking-tight text-foreground block leading-none">
              {brandName}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1 block">
              {companyName}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 md:px-4 py-2 space-y-2 custom-scrollbar">
        {navGroups.map((group) => {
          const groupVisibleItems = group.items;
          if (groupVisibleItems.length === 0) return null;
          
          return (
            <div key={group.label} className="mb-6">
              {isSidebarOpen && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 px-3 pb-3 pt-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {groupVisibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));
                    
                  const styles = colorMap[item.themeColor];

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-2xl transition-[background-color,color,box-shadow,transform] duration-300 ease-out-quart group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        isActive
                          ? `${styles.bg} text-foreground shadow-sm ring-1 ${styles.ring} font-black`
                          : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'
                      )}
                      title={!isSidebarOpen ? item.name : undefined}
                    >
                      <div className={cn("p-1.5 rounded-xl flex items-center justify-center transition-all", isActive ? "bg-white shadow-sm dark:bg-black/20" : "bg-secondary group-hover:bg-white dark:group-hover:bg-black/20 group-hover:shadow-sm")}>
                         <item.icon className="w-5 h-5 flex-shrink-0" />
                      </div>

                      {isSidebarOpen && (
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              'text-[13px] block leading-tight transition-colors duration-200 tracking-wide',
                              isActive ? 'text-foreground font-black' : 'font-bold'
                            )}
                          >
                            {item.name}
                          </span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Quick-start guide strip (only when sidebar is open) */}
      {isSidebarOpen && (
        <div className="shrink-0 mx-3 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2.5 flex items-center gap-1.5">
            <Zap className="w-3 h-3" /> Getting Started
          </p>
          <div className="space-y-1.5">
            {STEPS.map((step, i) => (
              <Link
                key={step.href}
                href={step.href}
                className="flex items-center gap-2 group"
              >
                <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  {i + 1}
                </span>
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors flex-1 truncate font-bold">
                  {step.label}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="shrink-0 p-4 flex items-center justify-center hover:bg-secondary text-muted-foreground transition-colors border-t border-border"
        title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isSidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      </aside>
    </>
  );
}
