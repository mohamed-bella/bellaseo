'use client';

import DocsHeader from '@/components/docs/DocsHeader';
import DocsSidebar from '@/components/docs/DocsSidebar';
import Link from 'next/link';
import { 
  Rocket, 
  Workflow, 
  Settings, 
  BookOpen, 
  ArrowRight,
  FolderKanban,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    title: 'Getting Started',
    description: 'Learn the core concepts and get your workspace ready.',
    icon: Rocket,
    href: '/docs/getting-started',
    color: 'bg-orange-50 text-[#FF642D]',
  },
  {
    title: 'Manage Sites',
    description: 'Connect your WordPress or Custom CMS via API hooks.',
    icon: Settings,
    href: '/docs/sites',
    color: 'bg-emerald-50 text-[#10B981]',
  },
  {
    title: 'Campaigns & Keywords',
    description: 'Group keywords and plan out SEO structures easily.',
    icon: FolderKanban,
    href: '/docs/campaigns',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Content Lab',
    description: 'Inside the AI brain: tone generation, formatting, and drafts.',
    icon: FileText,
    href: '/docs/content-lab',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    title: 'Automation Workflows',
    description: 'Configure auto-publishing and webhook deliveries.',
    icon: Workflow,
    href: '/docs/workflows',
    color: 'bg-pink-50 text-pink-600',
  },
];

export default function DocsHomePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <DocsHeader />
      <DocsSidebar />
      
      <main className="pt-16 md:pl-64 min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="bg-white border-b border-[#E5E8EB] px-6 sm:px-12 py-16 sm:py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <BookOpen className="w-96 h-96" />
          </div>
          
          <div className="w-full max-w-6xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A1D23] tracking-tight mb-4">
                Knowledge Base & Docs
              </h1>
              <p className="text-lg text-[#6B7280] max-w-3xl leading-relaxed">
                Everything you need to know about setting up campaigns, managing your connected sites, and automating high-quality SEO content generation at scale.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="px-6 sm:px-12 py-12 flex-1 bg-[#F8FAFC]">
          <div className="w-full max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1A1D23] mb-8">Browse by Topic</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  >
                    <Link 
                      href={feature.href}
                      className="group block h-full bg-white rounded-xl border border-[#E5E8EB] p-6 hover:shadow-lg transition-all hover:-translate-y-1 relative overflow-hidden"
                    >
                      <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-[#1A1D23] mb-2">{feature.title}</h3>
                      <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
                        {feature.description}
                      </p>
                      
                      <div className="flex items-center text-sm font-semibold text-[#0066FF] absolute bottom-6">
                        Read guide <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>

            {/* Visual Callout for Dashboard Components */}
            <div className="mt-16 bg-white rounded-xl border border-[#E5E8EB] overflow-hidden">
               <div className="border-b border-[#E5E8EB] bg-[#F7F8FA] px-6 py-4 flex justify-between items-center">
                 <h3 className="font-semibold text-[#1A1D23]">System Overview Demo</h3>
               </div>
               <div className="p-8 flex flex-col md:flex-row gap-8 items-center bg-gradient-to-br from-white to-orange-50/30">
                 <div className="flex-1 space-y-4">
                    <h4 className="text-xl font-bold text-[#1A1D23]">Seamless Integration</h4>
                    <p className="text-[#6B7280] text-sm leading-relaxed">
                      Our dashboard elements like real-time workflow trackers, content lab playgrounds, and SEO scoring systems are deeply integrated. Head over to our <Link href="/docs/workflows" className="text-[#FF642D] hover:underline">Workflows documentation</Link> to see how these UI components reflect your automated backend actions.
                    </p>
                 </div>
                 <div className="flex-1 w-full bg-white border border-[#E5E8EB] rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-semibold text-[#1A1D23]">Generating Workflow...</div>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold animate-pulse">Running</span>
                    </div>
                    <div className="w-full bg-[#F3F4F6] rounded-full h-2 mb-2">
                      <div className="bg-[#FF642D] h-2 rounded-full w-[65%]" />
                    </div>
                    <div className="text-xs text-[#6B7280]">Writing SEO articles (65% complete)</div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
