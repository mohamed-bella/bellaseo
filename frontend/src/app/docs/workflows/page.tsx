'use client';

import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import { motion } from 'framer-motion';
import { Workflow, CheckCircle2, Play, Activity } from 'lucide-react';
import Link from 'next/link';

export default function WorkflowsDocPage() {
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
            <span className="text-[#1A1D23] font-medium">Workflows</span>
          </div>

          <h1 className="text-3xl font-extrabold text-[#1A1D23] mb-4">Automation Workflows</h1>
          <p className="text-lg text-[#6B7280] leading-relaxed mb-10">
            Learn how the core engine automates content generation, tracks step-by-step progress, and publishes directly to your connected sites.
          </p>

          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold text-[#1A1D23] mt-12 mb-4 border-b border-[#E5E8EB] pb-2">The Generation Lifecycle</h2>
            <p className="text-[#4B5563] leading-relaxed mb-6">
              When a campaign is started, it enters the workflow queue. The system manages the lifecycle using discrete statuses, ensuring that heavy LLM requests are processed reliably.
            </p>

            {/* Embedded Component Example */}
            <div className="my-8 rounded-xl border border-[#E5E8EB] bg-white overflow-hidden shadow-sm">
              <div className="border-b border-[#E5E8EB] bg-[#F7F8FA] px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1D23]">
                  <Activity className="w-4 h-4 text-[#FF642D]" />
                  Active Core Workflows (Live Dashboard View)
                </div>
              </div>
              <div className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E8EB] text-xs font-semibold text-[#6B7280] uppercase tracking-wider bg-white">
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Project Name</th>
                      <th className="px-5 py-3">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E8EB]">
                    <tr className="bg-orange-50/20">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-[#1A1D23]">
                          <div className="w-2 h-2 rounded-full bg-[#FF642D] animate-pulse" />
                          Writing articles...
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#6B7280]">
                        SaaS Marketing Terms
                      </td>
                      <td className="px-5 py-4 w-64">
                         <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                           <div className="bg-[#FF642D] h-1.5 rounded-full w-1/3 animate-pulse" />
                         </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-[#1A1D23]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                          Published
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#6B7280]">
                        Real Estate Keywords
                      </td>
                      <td className="px-5 py-4 w-64">
                         <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                           <div className="bg-[#10B981] h-1.5 rounded-full w-full" />
                         </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="text-xl font-bold text-[#1A1D23] mt-10 mb-3">Workflow States</h3>
            <ul className="space-y-4 mb-8 list-none pl-0">
              <li className="flex items-start gap-3 bg-white border border-[#E5E8EB] p-4 rounded-lg">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-gray-100 flexItems-center justify-center shrink-0">
                  <span className="text-xs font-bold text-gray-500 ml-2 mt-1">1</span>
                </div>
                <div>
                  <h4 className="font-bold text-[#1A1D23] m-0">Queued</h4>
                  <p className="text-sm text-[#6B7280] m-0 mt-1">Campaign is ready and waiting for an available background worker to pick it up.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 bg-white border border-orange-200 p-4 rounded-lg shadow-sm">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-orange-100 flexItems-center justify-center shrink-0">
                  <Play className="w-3 h-3 text-[#FF642D] ml-1.5 mt-1.5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1A1D23] m-0">Generating</h4>
                  <p className="text-sm text-[#6B7280] m-0 mt-1">LLMs are actively drafting the content, building HTML structures, and optimizing based on the Content Lab settings.</p>
                </div>
              </li>
               <li className="flex items-start gap-3 bg-white border border-blue-200 p-4 rounded-lg shadow-sm">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-100 flexItems-center justify-center shrink-0">
                  <Workflow className="w-3 h-3 text-blue-600 ml-1.5 mt-1.5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1A1D23] m-0">Reviewing / Publishing</h4>
                  <p className="text-sm text-[#6B7280] m-0 mt-1">Content is being piped through Webhooks directly to your target CMS endpoints without manual intervention.</p>
                </div>
              </li>
            </ul>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-8 rounded-r-lg">
              <h4 className="font-bold text-blue-800 m-0 text-sm">Pro Tip</h4>
              <p className="text-blue-700 text-sm mt-1 mb-0">
                You can monitor real-time Webhook deliveries inside the <strong>System Logs</strong> on your main dashboard page. If a publish fails, the status will switch to 'failed' and provide an exact API error.
              </p>
            </div>
            
          </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
