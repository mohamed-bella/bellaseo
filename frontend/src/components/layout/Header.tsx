'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Search, Menu, Trash2, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/state/store';
import { clearAll } from '@/lib/apiCache';

export default function Header() {
  const router = useRouter();
  const { isSidebarOpen, setSidebarOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNotifications, setHasNotifications] = useState(false);
  const [purgeState, setPurgeState] = useState<'idle' | 'clearing' | 'done'>('idle');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/articles?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handlePurgeCache = useCallback(async () => {
    if (purgeState !== 'idle') return;
    setPurgeState('clearing');

    // 1. Clear frontend in-memory API cache
    const count = clearAll();

    // 2. Clear browser fetch/image cache via Cache API if available
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }

    // 3. Brief "done" flash, then force Next.js router refresh
    setPurgeState('done');
    setTimeout(() => {
      setPurgeState('idle');
      router.refresh(); // re-fetches all server components
    }, 1200);
  }, [purgeState, router]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 bg-white border-b border-[#E5E8EB] h-[56px] shrink-0">
      {/* Left: hamburger + search */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-2 -ml-1 rounded-xl text-[#9CA3AF] hover:bg-[#F9FAFB] hover:text-[#1A1D23] transition-colors lg:hidden shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative hidden md:flex items-center w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clusters, articles..."
            className="w-full bg-[#F3F4F6] border-none rounded-xl pl-11 pr-4 py-2.5 text-[13px] font-medium text-[#1A1D23] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 transition-all duration-150"
          />
        </form>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">

        {/* ── Purge Cache button ── */}
        <button
          onClick={handlePurgeCache}
          disabled={purgeState !== 'idle'}
          title="Purge all cached API responses and reload"
          className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border ${
            purgeState === 'done'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
              : purgeState === 'clearing'
              ? 'bg-[#FFF5F0] border-[#FDDDD0] text-[#FF642D] opacity-70'
              : 'bg-[#F9FAFB] border-[#E5E8EB] text-[#9CA3AF] hover:bg-[#FFF5F0] hover:border-[#FDDDD0] hover:text-[#FF642D]'
          }`}
        >
          {purgeState === 'done' ? (
            <>
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cleared</span>
            </>
          ) : purgeState === 'clearing' ? (
            <>
              <Trash2 className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Purging…</span>
            </>
          ) : (
            <>
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Purge Cache</span>
            </>
          )}
        </button>

        {/* Notification bell */}
        <button
          onClick={() => setHasNotifications(false)}
          className="relative p-2.5 rounded-xl text-[#9CA3AF] hover:bg-[#F9FAFB] hover:text-[#1A1D23] transition-colors border border-transparent hover:border-[#E5E8EB]"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {hasNotifications && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF642D] border-2 border-white rounded-full animate-pulse" />
          )}
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-[#E5E8EB] mx-1" />

        {/* Docs link */}
        <a
          href="https://docs.mohamedbella.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-white bg-[#1A1D23] hover:bg-[#FF642D] transition-all shadow-sm"
        >
          Documentation
        </a>
      </div>
    </header>
  );
}
