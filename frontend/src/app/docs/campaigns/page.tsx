'use client';

import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { motion } from 'framer-motion';
import { FolderKanban, Tags, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export default function CampaignsDocPage() {
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
              <span className="text-[#1A1D23] font-medium">Creating Campaigns</span>
            </div>

            <h1 className="text-3xl font-extrabold text-[#1A1D23] mb-4">Structuring Campaigns</h1>
            <p className="text-lg text-[#6B7280] leading-relaxed mb-10">
              Campaigns act as containers for your content strategies. By isolating keywords inside buckets, you can assign them to different target domains and track distinct topic clustering easily.
            </p>

            <div className="prose prose-slate max-w-none">
              
              <div className="flex items-start gap-4 p-6 bg-white border border-[#E5E8EB] rounded-xl shadow-sm mb-8">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <FolderKanban className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg m-0 mb-1">Bucket Approach</h3>
                  <p className="text-[#6B7280] text-sm m-0">A campaign groups hundreds of keywords and ties them directly to a Content Lab Profile and an active Target Site. You can track progress against this specific grouping.</p>
                </div>
              </div>

               <h2 className="text-xl font-bold text-[#1A1D23] mt-8 mb-4 border-b border-[#E5E8EB] pb-2">Campaign Flow</h2>
               <p className="text-[#4B5563] mb-4">The lifecycle of a campaign:</p>
               <div className="grid gap-3">
                 <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-4">
                   <div className="bg-gray-200 text-gray-700 w-8 h-8 flex items-center justify-center rounded font-bold">1</div>
                   <div>
                     <h4 className="font-semibold text-sm m-0">Create the Asset Container</h4>
                     <p className="text-xs text-gray-500 m-0">Name it explicitly e.g. "Roofing Cluster 2024".</p>
                   </div>
                 </div>
                 <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-4">
                   <div className="bg-gray-200 text-gray-700 w-8 h-8 flex items-center justify-center rounded font-bold">2</div>
                   <div>
                     <h4 className="font-semibold text-sm m-0">Attach Keywords</h4>
                     <p className="text-xs text-gray-500 m-0">Import hundreds of keywords directly from Ahrefs or Semrush exports.</p>
                   </div>
                 </div>
                 <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-4">
                   <div className="bg-[#FF642D] text-white w-8 h-8 flex items-center justify-center rounded font-bold shadow">3</div>
                   <div>
                     <h4 className="font-semibold text-sm m-0 text-orange-900">Push to Workflows</h4>
                     <p className="text-xs text-orange-800 m-0">Send the entire campaign bucket into the workflow generator to automatically build out content.</p>
                   </div>
                 </div>
               </div>

            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
