import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import DashboardWrapper from "@/components/layout/DashboardWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import { BRANDING } from "@/config/branding";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"] 
});

export const metadata: Metadata = {
  title: `${BRANDING.name} | ${BRANDING.tagline}`,
  description: `${BRANDING.tagline} - ${BRANDING.companyName}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${plusJakartaSans.className} min-h-screen bg-background flex overflow-hidden antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Toaster 
            position="top-right" 
            richColors 
            closeButton 
            expand={false} 
            toastOptions={{ 
              style: { 
                background: 'var(--background)', 
                border: '1px solid var(--border)', 
                color: 'var(--foreground)' 
              } 
            }} 
          />
          <DashboardWrapper>
            {children}
          </DashboardWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
