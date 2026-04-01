'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardWrapperProps {
  children: React.ReactNode;
}

export default function DashboardWrapper({ children }: DashboardWrapperProps) {
  const pathname = usePathname();

  // If on login page, render raw children without the dashboard layout
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Otherwise, render full dashboard layout
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-background custom-scrollbar scroll-smooth">
          <div className="w-full min-h-full p-4 md:p-8 lg:p-10 animate-in fade-in zoom-in-[0.98] duration-700 ease-out-quart">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
