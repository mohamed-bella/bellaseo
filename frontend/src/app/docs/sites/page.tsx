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

               <h2 className="text-2xl font-bold text-[#1A1D23] border-b border-[#E5E8EB] pb-2 mt-12 mb-4">Troubleshooting 401 Permission Errors</h2>
               
               <div className="grid grid-cols-1 gap-6 mt-6">
                 <div className="bg-rose-50 border border-rose-100 rounded-xl p-6">
                   <h4 className="text-rose-900 font-bold mb-2 m-0 flex items-center gap-2">
                     <Settings className="w-5 h-5" /> "Sorry, you are not allowed to create posts" (401)
                   </h4>
                   <p className="text-rose-800 text-sm mb-4 leading-relaxed">
                     This error (<code>rest_cannot_create</code>) means WordPress recognized your login, but that user doesn't have the "Capability" to create content.
                   </p>
                   <ul className="text-sm space-y-2 text-rose-800 font-medium">
                     <li>• <strong>Check User Role:</strong> The user must be an <em>Author</em>, <em>Editor</em>, or <em>Administrator</em>. Role "Subscriber" or "Contributor" will fail to publish.</li>
                     <li>• <strong>Application Password:</strong> Ensure you are using the 24-character code, NOT your normal login password.</li>
                     <li>• <strong>Security Plugins:</strong> Wordfence, WPS Hide Login, or "Disable REST API" plugins can block these requests. Whitelist your server IP if necessary.</li>
                     <li>• <strong>CPT Support:</strong> If publishing to a Custom Post Type, ensure <code>show_in_rest</code> is set to <code>true</code> in your theme/plugin code.</li>
                   </ul>
                 </div>
               </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
