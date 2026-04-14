'use client';

import Link from 'next/link';
import { BookOpen, ChevronLeft, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function DocsHeader() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E8EB] z-50 flex items-center justify-between px-4 sm:px-8">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#FF642D] flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-[16px] tracking-tight text-[#1A1D23]">
            Platform Docs
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-1 text-sm text-[#6B7280]">
          <Link href="/docs" className={`px-3 py-1.5 rounded-md transition-colors ${pathname === '/docs' ? 'bg-[#F3F4F6] text-[#1A1D23] font-medium' : 'hover:bg-[#F3F4F6] hover:text-[#1A1D23]'}`}>
            Home
          </Link>
          <Link href="/docs/getting-started" className={`px-3 py-1.5 rounded-md transition-colors ${pathname?.includes('/getting-started') ? 'bg-[#F3F4F6] text-[#1A1D23] font-medium' : 'hover:bg-[#F3F4F6] hover:text-[#1A1D23]'}`}>
            Getting Started
          </Link>
          <Link href="/docs/workflows" className={`px-3 py-1.5 rounded-md transition-colors ${pathname?.includes('/workflows') ? 'bg-[#F3F4F6] text-[#1A1D23] font-medium' : 'hover:bg-[#F3F4F6] hover:text-[#1A1D23]'}`}>
            Workflows
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search docs..." 
            className="w-64 pl-9 pr-4 py-1.5 bg-[#F9FAFB] border border-[#E5E8EB] rounded-lg text-sm text-[#1A1D23] focus:outline-none focus:ring-2 focus:ring-[#FF642D]/20 focus:border-[#FF642D] transition-all"
          />
        </div>
        <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280] hover:text-[#1A1D23] transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to App
        </Link>
      </div>
    </header>
  );
}
