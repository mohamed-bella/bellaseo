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
  }, []);

  // If on login page, render raw children without the dashboard layout
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Otherwise, render full dashboard layout
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar dynamicBranding={branding} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full bg-background custom-scrollbar scroll-smooth">
          <div className="w-full min-h-full p-4 sm:p-6 md:p-8 lg:p-10 animate-in fade-in zoom-in-[0.98] duration-700 ease-out-quart overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
