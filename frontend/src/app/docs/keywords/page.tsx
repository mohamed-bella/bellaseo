'use client';

import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { motion } from 'framer-motion';
import { Hash } from 'lucide-react';
import Link from 'next/link';

export default function KeywordsDocPage() {
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
              <span className="text-[#1A1D23] font-medium">Keywords Strategy</span>
            </div>

            <h1 className="text-3xl font-extrabold text-[#1A1D23] mb-4">Keyword Import Strategy</h1>
            <p className="text-lg text-[#6B7280] leading-relaxed mb-10">
              The engine relies heavily on accurate keyword seeding. Provide exact target keyphrases to influence the LLMs generation correctly.
            </p>

            <div className="prose prose-slate max-w-none">
              
              <div className="p-6 bg-white border border-[#E5E8EB] rounded-xl shadow-sm mb-8">
                 <h2 className="text-xl font-bold flex items-center gap-2 m-0 mb-4"><Hash className="w-5 h-5 text-[#FF642D]" /> Importing Keywords</h2>
                 <p className="text-sm text-[#4B5563] m-0">
                   When you upload keywords, ensure that they are exact matches. Long-tail modifiers work exceptionally well (e.g. "what is the best software for warehouse racking 2024"). 
                   <br /><br />
                   The underlying Content Lab uses the exact Keyword text string inside the main header tags and title tags, so do not import misspelled or structurally broken sentences unless intentional.
                 </p>
              </div>

               <h2 className="text-xl font-bold text-[#1A1D23] mt-8 mb-4 border-b border-[#E5E8EB] pb-2">Status Tracking</h2>
               <p className="text-[#4B5563] mb-4">Keywords undergo specific state transitions just like Campaigns:</p>
               <ul className="list-disc pl-5 space-y-2 text-sm text-[#6B7280]">
                 <li><strong>pending</strong>: Ready to be drafted.</li>
                 <li><strong>generating</strong>: Currently locked by an active background worker.</li>
                 <li><strong>approved</strong>: Drafted perfectly but waiting for a manual push or a scheduled webhook window.</li>
                 <li><strong>published</strong>: Successfully seeded on the target CMS.</li>
               </ul>

            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
