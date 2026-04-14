'use client';

import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import Link from 'next/link';

export default function QuickstartDocPage() {
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
              <span className="text-[#1A1D23] font-medium">Quick Start</span>
            </div>

            <h1 className="text-3xl font-extrabold text-[#1A1D23] mb-4">Quick Start Guide</h1>
            <p className="text-lg text-[#6B7280] leading-relaxed mb-10">
              Ready to jump right in? Here's the absolute fastest loop to get an article live on your site right now.
            </p>

            <div className="prose prose-slate max-w-none">
              
               <div className="bg-[#FF642D]/10 border border-[#FF642D]/20 p-6 rounded-xl flex items-start gap-4 mb-10">
                 <Zap className="w-8 h-8 text-[#FF642D] shrink-0 mt-1" />
                 <div>
                   <h3 className="text-[#FF642D] font-bold text-lg m-0 mb-1">The 3-Minute Challenge</h3>
                   <p className="text-[#A03D1A] m-0 text-sm">Follow these exact numbers sequentially in your dashboard to generate your first live SEO piece in 3 minutes.</p>
                 </div>
               </div>

               <ol className="list-decimal pl-5 space-y-4 text-[#4B5563]">
                 <li><strong>Navigate to Manage Sites.</strong> Click the button to add a new Webhook. Make the URL point to a dummy testing tracker (like webhook.site) and save it.</li>
                 <li><strong>Navigate to Content Lab.</strong> Create a new Profile. Leave all the default System Prompts exactly as they are and just click Save.</li>
                 <li><strong>Navigate to Campaigns.</strong> Create a New Campaign. Name it "Fast Test". Select the Hook site you just made, and the Content Lab profile you just saved.</li>
                 <li><strong>Add a Keyword.</strong> Inside the Campaign view, click "Add Keyword". Type "What is programmatic SEO".</li>
                 <li><strong>Watch the Magic.</strong> Go back to your Dashboard Overview. Within 60 seconds, you should see the Active Workflows table light up, indicating the background server is processing your request. When it finishes, check your webhook.site URL—you'll see a massive JSON payload with a full HTML SEO article!</li>
               </ol>

            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
