'use client';

import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { motion } from 'framer-motion';
import { Globe, Settings, Terminal, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function SitesDocPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DocsHeader />
      <DocsSidebar />
      <main className="pt-20 pb-24 md:pl-[280px] p-6 w-full flex flex-col">
        <div className="w-full max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-6">
              <Link href="/docs" className="hover:text-[#1A1D23]">Docs</Link>
              <span>/</span>
              <span className="text-[#1A1D23] font-medium">Connecting Sites</span>
            </div>

            <h1 className="text-3xl font-extrabold text-[#1A1D23] mb-4">Connecting Target Sites</h1>
            <p className="text-lg text-[#6B7280] leading-relaxed mb-10">
              Before you can bulk-generate keywords or publish content, you must hook up an external CMS (like WordPress) or a custom API endpoint.
            </p>

            <div className="prose prose-slate max-w-none">
              <div className="bg-white rounded-xl border border-[#E5E8EB] shadow-sm overflow-hidden mb-10">
                 <div className="border-b border-[#E5E8EB] bg-[#F7F8FA] px-6 py-4 flex items-center justify-between">
                   <div className="flex items-center gap-2 font-semibold text-[#1A1D23]">
                     <Globe className="w-5 h-5 text-[#10B981]" /> Add New Integration
                   </div>
                 </div>
                 <div className="p-6">
                   <p className="text-[#6B7280] mb-4">You have two core methos of pushing content:</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="border border-[#E5E8EB] rounded-lg p-4 bg-[#F9FAFB]">
                        <h4 className="flex items-center gap-2 font-bold mb-2 m-0"><Terminal className="w-4 h-4"/> WordPress Core API</h4>
                        <p className="text-sm m-0 text-[#6B7280]">Connect seamlessly using Application Passwords generated straight from your WP-Admin profile page.</p>
                     </div>
                     <div className="border border-[#E5E8EB] rounded-lg p-4 bg-[#F9FAFB]">
                        <h4 className="flex items-center gap-2 font-bold mb-2 m-0"><LinkIcon className="w-4 h-4"/> Webhook Delivery</h4>
                        <p className="text-sm m-0 text-[#6B7280]">Catch raw HTML and JSON payloads via Zapier, Make, or custom Next.js endpoint routes.</p>
                     </div>
                   </div>
                 </div>
              </div>

               <h2 className="text-2xl font-bold text-[#1A1D23] border-b border-[#E5E8EB] pb-2 mt-8 mb-4">Generating Application Passwords</h2>
               <p className="text-[#4B5563] leading-relaxed">
                 To link WordPress, go to your Target WordPress Admin area:
               </p>
               <ol className="bg-white border border-[#E5E8EB] rounded-lg p-4 mt-4 space-y-2">
                 <li>Navigate to <strong>Users &rarr; Profile</strong>.</li>
                 <li>Scroll down to the <strong>Application Passwords</strong> section.</li>
                 <li>Enter a New Application Password Name (e.g. "SEO Platform Sync") and click <em>Add New</em>.</li>
                 <li>Copy the generated 24-character password.</li>
                 <li>Return to your Platform Dashboard and paste it into the credentials field under Manage Sites.</li>
               </ol>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
