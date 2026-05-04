'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, BarChart3, FolderKanban, Hash, FileText,
  FlaskConical, Workflow, Globe, PenSquare, Radar, Settings,
  ChevronLeft, ChevronRight, TrendingUp, LogOut, User, Bell,
  SearchCode, ShieldCheck, Network, Users, BookOpen, Rss,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/state/store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BRANDING } from '@/config/branding';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import apiClient from '@/services/apiClient';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Each item gets a unique accent color (hex)
const navGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard',     icon: LayoutDashboard, href: '/',              color: '#8B5CF6' },
      { name: 'Analytics',     icon: BarChart3,       href: '/analytics',     color: '#3B82F6' },
      { name: 'Notifications', icon: Bell,            href: '/notifications', color: '#EC4899' },
    ],
  },
  {
    label: 'Content',
    items: [
      { name: 'Projects',     icon: FolderKanban, href: '/campaigns',        color: '#F97316' },
      { name: 'Keywords',     icon: Hash,         href: '/keywords',         color: '#10B981' },
      { name: 'Deep Intel',   icon: SearchCode,   href: '/keyword-research', color: '#06B6D4' },
      { name: 'Articles',     icon: FileText,     href: '/articles',         color: '#F43F5E' },
      { name: 'Content Lab',  icon: FlaskConical, href: '/content-lab',      color: '#A855F7' },
      { name: 'Auto-Publish', icon: Workflow,     href: '/workflows',        color: '#F59E0B' },
      { name: 'EEAT Center',  icon: ShieldCheck,  href: '/eeat',             color: '#14B8A6' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { name: 'Integrations',   icon: Globe,      href: '/sites',         color: '#6366F1' },
      { name: 'Blogger',        icon: Rss,        href: '/blogger',       color: '#F97316' },
      { name: 'Article Studio', icon: PenSquare,  href: '/article-config',color: '#84CC16' },
      { name: 'Lead Radar',     icon: Radar,      href: '/radar',         color: '#EF4444' },
      { name: 'Topical Map',    icon: Network,    href: '/map',           color: '#0EA5E9' },
      { name: 'Team',           icon: Users,      href: '/team',          color: '#D946EF' },
      { name: 'Settings',       icon: Settings,   href: '/settings',      color: '#94A3B8' },
      { name: 'Documentation',  icon: BookOpen,   href: '/docs',          color: '#22C55E' },
    ],
  },
];

interface SidebarProps {
  dynamicBranding?: any;
}

export default function Sidebar({ dynamicBranding }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { isSidebarOpen, setSidebarOpen } = useAppStore();
  const [username, setUsername] = useState('Admin');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    if (window.innerWidth < 1024) setSidebarOpen(false);

    try {
      const userStr = localStorage.getItem('seo_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.username) setUsername(u.username);
      }
    } catch { /* ignore */ }

    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen, pathname]);

  const handleLogout = () => {
    Cookies.remove('seo_admin_token');
    localStorage.removeItem('seo_admin_token');
    localStorage.removeItem('seo_user');
    window.location.href = '/login';
  };

  const brandName  = dynamicBranding?.name    || BRANDING.name;
  const iconName   = dynamicBranding?.iconName || BRANDING?.logo?.iconName || 'TrendingUp';
  const DynamicIcon = (LucideIcons as any)[iconName] || TrendingUp;

  const [health, setHealth] = useState({ sites: 0, keys: false, loading: true });

  useEffect(() => {
    // Only fetch health status if sidebar is open AND we are NOT on the dashboard (dashboard already fetches this)
    if (!isSidebarOpen || pathname === '/') return;
    
    const checkHealth = async () => {
      try {
        const { data } = await apiClient.get('/dashboard/stats');
        setHealth({ 
          sites: data.activeSites || 0, 
          keys: data.apiKeysConfigured || false, 
          loading: false 
        });
      } catch { setHealth(h => ({ ...h, loading: false })); }
    };
    
    // Small delay to ensure any page-load auth spikes are finished
    const timer = setTimeout(checkHealth, 300);
    return () => clearTimeout(timer);
  }, [isSidebarOpen, pathname]);

  return (
    <>
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 h-screen flex flex-col transition-all duration-300 ease-out lg:sticky lg:translate-x-0',
          'bg-white border-r border-[#F0F0F0]',
          isSidebarOpen
            ? 'translate-x-0 w-[220px] shadow-xl lg:shadow-none'
            : '-translate-x-full w-[220px] lg:w-[64px] lg:translate-x-0',
        )}
      >
        {/* ── Logo ─────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 h-[56px] border-b border-[#F0F0F0] shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF642D 0%, #FF8C42 100%)', boxShadow: '0 2px 10px rgba(255,100,45,0.35)' }}
          >
            <DynamicIcon className="w-4 h-4 text-white" />
          </div>
          {isSidebarOpen && (
            <span className="font-black text-[15px] tracking-tight text-[#1A1D23] truncate leading-none">
              {brandName}
            </span>
          )}
        </div>

        {/* ── Navigation ───────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label}>
              {isSidebarOpen && (
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#B0B7C3] px-3 mb-2">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  const c = item.color;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={true}
                      title={!isSidebarOpen ? item.name : undefined}
                      className={cn(
                        'flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-150 group relative',
                      )}
                      style={isActive ? {
                        background: `${c}15`,
                        boxShadow: `inset 0 0 0 1px ${c}25`,
                      } : {}}
                    >
                      {/* Always-colored icon bubble */}
                      <div
                        className={cn(
                          'shrink-0 flex items-center justify-center rounded-lg transition-all duration-150',
                          isSidebarOpen ? 'w-7 h-7' : 'w-8 h-8',
                        )}
                        style={{
                          background: `${c}18`,
                          boxShadow: isActive ? `0 2px 8px ${c}30` : 'none',
                        }}
                      >
                        <Icon
                          className={cn(isSidebarOpen ? 'w-3.5 h-3.5' : 'w-4 h-4')}
                          style={{ color: c }}
                        />
                      </div>

                      {isSidebarOpen && (
                        <span
                          className="truncate text-[13px] font-semibold transition-colors duration-150"
                          style={{ color: isActive ? c : '#4B5563' }}
                        >
                          {item.name}
                        </span>
                      )}

                      {/* Active left accent bar */}
                      {isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                          style={{ background: c }}
                        />
                      )}

                      {/* Hover overlay */}
                      {!isActive && (
                        <div
                          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                          style={{ background: `${c}0A` }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* ── System Status ──────────────────────────── */}
          {isSidebarOpen && !health.loading && (
            <div className="pt-4 mt-4 border-t border-[#F0F0F0] px-3 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#B0B7C3]">
                Engine Status
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-1.5 h-1.5 rounded-full', health.keys ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500')} />
                    <span className="text-[11px] font-bold text-[#4B5563]">AI Core</span>
                  </div>
                  <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded', health.keys ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50')}>
                    {health.keys ? 'Active' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-1.5 h-1.5 rounded-full', health.sites > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500')} />
                    <span className="text-[11px] font-bold text-[#4B5563]">Network</span>
                  </div>
                  <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded', health.sites > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50')}>
                    {health.sites > 0 ? `${health.sites} Nodes` : 'No Site'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* ── User Footer ──────────────────────────────── */}
        {isSidebarOpen && (
          <div className="shrink-0 border-t border-[#F0F0F0] p-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <span className="text-[13px] font-medium text-[#374151] flex-1 truncate">{username}</span>
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 rounded-lg hover:bg-red-50 text-[#C4C9D4] hover:text-red-500 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Collapse Toggle ───────────────────────────── */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="shrink-0 flex items-center justify-center h-9 border-t border-[#F0F0F0] text-[#C4C9D4] hover:text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
          title={isSidebarOpen ? 'Collapse' : 'Expand'}
        >
          {isSidebarOpen
            ? <ChevronLeft  className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </button>
      </aside>
    </>
  );
}
