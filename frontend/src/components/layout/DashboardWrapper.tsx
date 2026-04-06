'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import apiClient from '@/services/apiClient';

interface DashboardWrapperProps {
  children: React.ReactNode;
}

export default function DashboardWrapper({ children }: DashboardWrapperProps) {
  const pathname = usePathname();
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    // Skip fetching branding on the login page
    if (pathname?.startsWith('/login')) return;

    const fetchBranding = async () => {
      try {
        const { data } = await apiClient.get('/settings');
        if (data.branding) {
          setBranding(data.branding);
          // Apply colors
          document.documentElement.style.setProperty('--primary', data.branding.primaryColor);
          // Update title
          document.title = `${data.branding.name} | Control Center`;
        }
      } catch (err) {
        console.error('Failed to fetch branding:', err);
      }
    };
    fetchBranding();
  }, [pathname]);

  // If on login page, render raw children without the dashboard layout
  if (pathname?.startsWith('/login')) {
    return <>{children}</>;
  }

  // Otherwise, render full dashboard layout
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#E5E7EB]">
      <Sidebar dynamicBranding={branding} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-[#E5E7EB] p-4 sm:p-6">
          <div className="max-w-[1600px] mx-auto w-full min-h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-[#E5E8EB] p-6 md:p-8 animate-fade-up overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
