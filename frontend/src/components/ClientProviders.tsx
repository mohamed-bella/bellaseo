'use client';

import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import DashboardWrapper from "@/components/layout/DashboardWrapper";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <Toaster
        position="top-right"
        richColors
        closeButton
        expand={false}
        toastOptions={{
          style: {
            background: '#FFFFFF',
            border: '1px solid #E5E8EB',
            color: '#1A1D23',
            fontSize: '13px',
          }
        }}
      />
      <DashboardWrapper>
        {children}
      </DashboardWrapper>
    </ThemeProvider>
  );
}
