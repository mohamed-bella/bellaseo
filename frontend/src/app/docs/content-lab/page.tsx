'use client';

import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { motion } from 'framer-motion';
import { FlaskConical, Code2, Bot } from 'lucide-react';
import Link from 'next/link';

export default function ContentLabDocPage() {
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
              <span className="text-[#1A1D23] font-medium">Content Lab</span>
            </div>

            <h1 className="text-3xl font-extrabold text-[#1A1D23] mb-4">Content Lab Basics</h1>
            <p className="text-lg text-[#6B7280] leading-relaxed mb-10">
              The Content Lab is where you conduct prompt engineering and set strict boundaries around how the LLM formats its SEO output.
            </p>

            <div className="prose prose-slate max-w-none">
              
              <div className="grid md:grid-cols-2 gap-6 my-8">
                <div className="p-6 bg-white border border-[#E5E8EB] rounded-xl shadow-sm">
                  <Bot className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-bold text-lg m-0 mb-2">Prompt Design</h3>
                  <p className="text-sm text-[#6B7280] m-0">You define system prompts globally, influencing tone, expertise, and formatting logic. This controls if the AI behaves like a "technical reviewer" or an "enthusiastic blogger".</p>
                </div>
                 <div className="p-6 bg-white border border-[#E5E8EB] rounded-xl shadow-sm">
                  <Code2 className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-bold text-lg m-0 mb-2">HTML Structure Rules</h3>
                  <p className="text-sm text-[#6B7280] m-0">Set strict rules on header trees (H2-H3 limits), table injections, bullet formatting, and JSON-LD schema inclusion directly from the Lab config.</p>
                </div>
              </div>

               <h2 className="text-2xl font-bold text-[#1A1D23] mt-8 mb-4 border-b border-[#E5E8EB] pb-2">Testing the Lab</h2>
               <p className="text-[#4B5563] mb-4">
                 Whenever you modify prompts inside the Content Lab, use the built-in <strong>Test Generator</strong> on the right side of the Lab layout. It simulates a workflow run so you can visually verify the exact Markdown/HTML payload before committing it to a massive campaign.
               </p>

            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
