import type { Metadata } from "next";
import { Inter } from "next/font/google";
import DashboardWrapper from "@/components/layout/DashboardWrapper";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import { BRANDING } from "@/config/branding";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: `${BRANDING.name} | ${BRANDING.tagline}`,
  description: `${BRANDING.tagline} - ${BRANDING.companyName}`,
  robots: 'noindex, nofollow',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.className} min-h-screen bg-background flex overflow-hidden antialiased`}>
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
      </body>
    </html>
  );
}

