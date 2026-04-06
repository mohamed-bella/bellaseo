'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  FolderKanban,
  Hash,
  FileText,
  FlaskConical,
  Workflow,
  Globe,
  PenSquare,
  Radar,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  LogOut,
  User,
  Users,
  LineChart,
  Terminal,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/state/store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BRANDING } from '@/config/branding';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard',  icon: LayoutDashboard, href: '/' },
      { name: 'Analytics',  icon: BarChart3,       href: '/analytics' },
    ],
  },
  {
    label: 'Content',
    items: [
      { name: 'Projects',      icon: FolderKanban, href: '/campaigns'    },
      { name: 'Keywords',      icon: Hash,         href: '/keywords'     },
      { name: 'Articles',      icon: FileText,     href: '/articles'     },
      { name: 'Content Lab',   icon: FlaskConical, href: '/content-lab'  },
      { name: 'Auto-Publish',  icon: Workflow,     href: '/workflows'    },
      { name: 'System Logs',   icon: Terminal,     href: '/system-logs'  },
    ],
  },
  {
    label: 'Platform',
    items: [
      { name: 'Integrations',    icon: Globe,       href: '/sites'          },
      { name: 'Article Studio',  icon: PenSquare,   href: '/article-config' },
      { name: 'Lead Radar',      icon: Radar,       href: '/radar'          },
      { name: 'Settings',        icon: Settings,    href: '/settings'       },
    ],
  },
];

interface SidebarProps {
  dynamicBranding?: any;
}

export default function Sidebar({ dynamicBranding }: SidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { isSidebarOpen, setSidebarOpen } = useAppStore();
  const [username, setUsername] = useState('Admin');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    try {
      const userStr = localStorage.getItem('seo_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.username) setUsername(u.username);
      }
    } catch { /* ignore */ }
  }, [setSidebarOpen, pathname]);

  const handleLogout = () => {
    Cookies.remove('seo_admin_token');
    localStorage.removeItem('seo_admin_token');
    localStorage.removeItem('seo_user');
    window.location.href = '/login';
  };

  const brandName  = dynamicBranding?.name        || BRANDING.name;
  const iconName   = dynamicBranding?.iconName     || BRANDING?.logo?.iconName || 'TrendingUp';
  const DynamicIcon = (LucideIcons as any)[iconName] || TrendingUp;

  return (
    <>
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 h-screen flex flex-col bg-white border-r border-[#E5E8EB] transition-all duration-300 ease-out-quart md:sticky md:translate-x-0',
          isSidebarOpen
            ? 'translate-x-0 w-[220px] shadow-xl md:shadow-none'
            : '-translate-x-full md:w-[64px] md:translate-x-0',
        )}
      >
        {/* ── Logo ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 h-[56px] border-b border-[#E5E8EB] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#FF642D] flex items-center justify-center shrink-0 shadow-sm">
            <DynamicIcon className="w-4 h-4 text-white" />
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-[15px] tracking-tight text-[#1A1D23] truncate leading-none">
              {brandName}
            </span>
          )}
        </div>

        {/* ── Navigation ─────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {isSidebarOpen && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] px-3 mb-1 mt-1">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={!isSidebarOpen ? item.name : undefined}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group',
                        isActive
                          ? 'bg-[#10B981] text-white shadow-sm'
                          : 'text-[#6B7280] hover:text-[#1A1D23] hover:bg-[#F3F4F6]',
                      )}
                    >
                      <Icon
                        className={cn(
                          'shrink-0 transition-colors duration-150',
                          isSidebarOpen ? 'w-4 h-4' : 'w-5 h-5',
                          isActive ? 'text-white' : 'text-[#9CA3AF] group-hover:text-[#6B7280]',
                        )}
                      />
                      {isSidebarOpen && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User Footer ────────────────────────────────────── */}
        {isSidebarOpen && (
          <div className="shrink-0 border-t border-[#E5E8EB] p-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-[#FF642D]" />
              </div>
              <span className="text-[13px] font-medium text-[#1A1D23] flex-1 truncate">{username}</span>
              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 rounded-md hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Collapse Toggle ─────────────────────────────────── */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="shrink-0 flex items-center justify-center h-10 border-t border-[#E5E8EB] text-[#9CA3AF] hover:text-[#6B7280] hover:bg-gray-50 transition-colors"
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
