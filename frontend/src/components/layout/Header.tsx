'use client';

import { useEffect, useState } from 'react';
import { Bell, Search, User, Menu, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../ui/ThemeToggle';
import { useAppStore } from '@/state/store';
import Cookies from 'js-cookie';

export default function Header() {
  const router = useRouter();
  const { isSidebarOpen, setSidebarOpen } = useAppStore();
  const [username, setUsername] = useState('Loading...');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNotifications, setHasNotifications] = useState(false); // Default to false for now

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('seo_user');
      if (userStr) setUsername(JSON.parse(userStr).username);
      else setUsername('Admin User');
    } catch { setUsername('User'); }
  }, []);

  const handleLogout = () => {
    Cookies.remove('seo_admin_token');
    localStorage.removeItem('seo_admin_token');
    localStorage.removeItem('seo_user');
    window.location.href = '/login';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/articles?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex flex-nowrap items-center justify-between px-4 md:px-8 py-3 bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-300 min-h-[64px]">
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-2 -ml-1 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors md:hidden shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Search Bar - hidden on very small screens, responsive width */}
        <form onSubmit={handleSearch} className="relative w-full max-w-[200px] sm:max-w-xs md:max-w-md group hidden xs:flex">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-300 group-focus-within:text-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..." 
            className="w-full bg-secondary border border-border shadow-inner rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-[box-shadow,border-color,background-color] duration-300 ease-out-quart text-foreground"
          />
        </form>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-auto">
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        
        <button 
          onClick={() => setHasNotifications(false)}
          className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-secondary hover:bg-muted border border-border text-muted-foreground transition-all duration-300 shadow-sm relative active:scale-95 sm:min-h-[44px] sm:min-w-[44px]"
        >
          <Bell className="w-4 h-4" />
          {hasNotifications && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_theme(colors.rose.500)]" />
          )}
        </button>
        
        <div className="h-6 w-px bg-border/50 mx-0.5 md:mx-1 hidden xs:block" />
        
        <div className="flex items-center gap-1 sm:gap-2 p-1 pl-2 sm:pl-4 rounded-full bg-secondary border border-border shadow-sm min-h-[40px] sm:min-h-[44px]">
          <span className="text-xs md:text-sm font-semibold text-foreground hidden sm:inline-block">{username}</span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="h-5 w-px bg-border mx-1 hidden xs:block" />
          <button 
            onClick={handleLogout}
            className="p-1.5 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors flex items-center justify-center"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
