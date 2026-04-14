'use client';

import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { motion } from 'framer-motion';
import { Share, CalendarClock, Webhook } from 'lucide-react';
import Link from 'next/link';

export default function PublishingDocPage() {
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
              <span className="text-[#1A1D23] font-medium">Publishing Settings</span>
            </div>

            <h1 className="text-3xl font-extrabold text-[#1A1D23] mb-4">Publishing Logic</h1>
            <p className="text-lg text-[#6B7280] leading-relaxed mb-10">
              Control exactly how and when your approved AI-generated articles are delivered to their final destinations.
            </p>

            <div className="prose prose-slate max-w-none">
               <div className="grid md:grid-cols-2 gap-6 my-8">
                <div className="p-6 bg-white border border-[#E5E8EB] rounded-xl shadow-sm text-center">
                  <Webhook className="w-10 h-10 text-pink-600 mb-3 mx-auto" />
                  <h3 className="font-bold text-lg m-0 mb-2">Instant Webhook Push</h3>
                  <p className="text-sm text-[#6B7280] m-0">Suitable for custom CMSs. The moment an article passes the generation review phase, its JSON payload is POSTed instantly.</p>
                </div>
                 <div className="p-6 bg-white border border-[#E5E8EB] rounded-xl shadow-sm text-center">
                  <CalendarClock className="w-10 h-10 text-pink-600 mb-3 mx-auto" />
                  <h3 className="font-bold text-lg m-0 mb-2">Drip Feed Scheduling</h3>
                  <p className="text-sm text-[#6B7280] m-0">Instead of nuking your WordPress site with 500 articles in one hour, set a steady drip interval to simulate human writing patterns to search engines.</p>
                </div>
              </div>

               <h2 className="text-2xl font-bold text-[#1A1D23] mt-8 mb-4 border-b border-[#E5E8EB] pb-2">Manual Overrides</h2>
               <p className="text-[#4B5563] mb-4">
                 If you disable "Auto Publish" in your campaign settings, all articles will land in the `approved` state. You can then navigate to the <strong>Articles</strong> tab in your dashboard, manually verify the rich-text generation, and click the <Share className="w-4 h-4 inline-block text-gray-500" /> Publish button per article.
               </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
