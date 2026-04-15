'use client';

import { useEffect, useState } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/state/store';

export default function Header() {
  const router = useRouter();
  const { isSidebarOpen, setSidebarOpen } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNotifications, setHasNotifications] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/articles?search=${encodeURIComponent(searchQuery)}`);
    }
  };

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
      <div className="flex items-center gap-3 shrink-0">
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

        {/* Support Hub badge */}
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
