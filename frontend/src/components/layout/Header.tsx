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
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-1.5 -ml-1 rounded-md text-[#9CA3AF] hover:bg-gray-100 hover:text-[#6B7280] transition-colors md:hidden shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative hidden sm:flex items-center w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles, keywords..."
            className="w-full bg-[#F7F8FA] border border-[#E5E8EB] rounded-md pl-9 pr-4 py-1.5 text-sm text-[#1A1D23] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF642D]/30 focus:border-[#FF642D] transition-all duration-150"
          />
        </form>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification bell */}
        <button
          onClick={() => setHasNotifications(false)}
          className="relative p-2 rounded-md text-[#9CA3AF] hover:bg-gray-100 hover:text-[#6B7280] transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FF642D] rounded-full" />
          )}
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[#E5E8EB] mx-1" />

        {/* Help badge */}
        <a
          href="https://docs.mohamedbella.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#FF642D] bg-orange-50 hover:bg-orange-100 transition-colors border border-orange-200"
        >
          Docs
        </a>
      </div>
    </header>
  );
}
