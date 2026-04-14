'use client';

import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { motion } from 'framer-motion';
import { Rocket, FolderPlus, Globe } from 'lucide-react';
import Link from 'next/link';

export default function GettingStartedDocPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DocsHeader />
      <DocsSidebar />
      
      <main className="pt-20 pb-24 md:pl-[280px] pr-6 md:pr-12 w-full flex flex-col">
        <div className="max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-6">
            <Link href="/docs" className="hover:text-[#1A1D23]">Docs</Link>
            <span>/</span>
            <span className="text-[#1A1D23] font-medium">Getting Started</span>
          </div>

          <h1 className="text-3xl font-extrabold text-[#1A1D23] mb-4">Initial Workspace Setup</h1>
          <p className="text-lg text-[#6B7280] leading-relaxed mb-10">
            Welcome to the Next-Generation SEO Engine. Here is how you can set up your first workspace and begin generating massive amounts of optimized content at scale.
          </p>

          <div className="prose prose-slate max-w-none">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-10">
              <div className="bg-white border border-[#E5E8EB] p-5 rounded-xl shadow-sm text-center">
                <div className="w-10 h-10 bg-orange-50 text-[#FF642D] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#1A1D23] m-0">1. Connect Site</h3>
                <p className="text-xs text-[#6B7280] mt-1 m-0">Add your WordPress site or connect via custom Webhook API.</p>
              </div>
              <div className="bg-white border border-[#E5E8EB] p-5 rounded-xl shadow-sm text-center">
                 <div className="w-10 h-10 bg-orange-50 text-[#FF642D] rounded-full flex items-center justify-center mx-auto mb-3">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#1A1D23] m-0">2. New Project</h3>
                <p className="text-xs text-[#6B7280] mt-1 m-0">Create a Project to organize keywords and targeted domain.</p>
              </div>
               <div className="bg-white border border-[#E5E8EB] p-5 rounded-xl shadow-sm text-center">
                 <div className="w-10 h-10 bg-orange-50 text-[#FF642D] rounded-full flex items-center justify-center mx-auto mb-3">
                  <Rocket className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#1A1D23] m-0">3. Run Automation</h3>
                <p className="text-xs text-[#6B7280] mt-1 m-0">Sit back and watch the internal engine build your platform assets.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#1A1D23] mt-12 mb-4 border-b border-[#E5E8EB] pb-2">Platform Overview</h2>
            <p className="text-[#4B5563] leading-relaxed mb-6">
              The internal engine separates concerns into <strong>Content Lab</strong> (for prompt and framework engineering) and <strong>Workflows</strong> (for automated execution). You do not need to manually write any articles if the lab is correctly prepared.
            </p>

             <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 my-8 rounded-r-lg">
              <h4 className="font-bold text-emerald-800 m-0 text-sm">Best Practice</h4>
              <p className="text-emerald-700 text-sm mt-1 mb-0">
                Always set up your Sites <strong>first</strong>. A Project (Campaign) cannot successfully run unless it has a designated destination. If a campaign is run without a destination, the articles will sit in "Approved" state waiting for manual review.
              </p>
            </div>
            
          </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
