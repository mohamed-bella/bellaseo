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
    <header className="sticky top-0 z-20 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-4 bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-300">
      <div className="flex items-center gap-3 w-full sm:w-auto mb-3 sm:mb-0">
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        {/* Search Bar - hidden on very small screens, responsive width */}
        <form onSubmit={handleSearch} className="relative w-full sm:w-80 md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-300 group-focus-within:text-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..." 
            className="w-full bg-secondary border border-border shadow-inner rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-[box-shadow,border-color,background-color] duration-300 ease-out-quart text-foreground"
          />
        </form>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 md:gap-4 self-end sm:self-auto">
        <ThemeToggle />
        
        <button 
          onClick={() => setHasNotifications(false)}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-secondary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-border text-muted-foreground transition-[transform,background-color,color] duration-300 ease-out-quart shadow-sm relative active:scale-95"
        >
          <Bell className="w-4 h-4" />
          {hasNotifications && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_theme(colors.rose.500)]" />
          )}
        </button>
        
        <div className="h-6 w-px bg-border/50 mx-1 md:mx-2 hidden sm:block" />
        
        <div className="flex items-center gap-2 p-1 pl-3 md:pl-4 rounded-full bg-secondary border border-border shadow-sm min-h-[44px]">
          <span className="text-xs md:text-sm font-semibold text-foreground hidden sm:inline-block">{username}</span>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner group-hover:bg-primary/20 transition-colors">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
          <button 
            onClick={handleLogout}
            className="p-1.5 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors flex items-center justify-center group"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
