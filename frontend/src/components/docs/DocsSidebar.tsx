'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Rocket, 
  Globe, 
  FolderKanban, 
  FlaskConical, 
  Workflow, 
  Code
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const docsNav = [
  {
    title: 'Getting Started',
    icon: Rocket,
    items: [
      { name: 'Introduction', href: '/docs/getting-started' },
      { name: 'Quick Start Guide', href: '/docs/getting-started/quickstart' },
    ]
  },
  {
    title: 'Platform Guides',
    icon: FolderKanban,
    items: [
      { name: 'Connecting Sites', href: '/docs/sites' },
      { name: 'Creating Campaigns', href: '/docs/campaigns' },
      { name: 'Keyword Strategy', href: '/docs/keywords' },
    ]
  },
  {
    title: 'Automation & Content',
    icon: Workflow,
    items: [
      { name: 'Content Lab Basics', href: '/docs/content-lab' },
      { name: 'Workflow Engine', href: '/docs/workflows' },
      { name: 'Publishing Settings', href: '/docs/publishing' },
    ]
  },
];

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-[#E5E8EB] overflow-y-auto hidden md:block">
      <div className="py-6 px-4 space-y-8">
        {docsNav.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.title}>
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-3 px-2">
                <Icon className="w-3.5 h-3.5" /> {group.title}
              </h4>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link 
                        href={item.href}
                        className={twMerge(
                          clsx(
                            'block px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors',
                            isActive 
                              ? 'bg-[#E5F0FF] text-[#0066FF]' 
                              : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#1A1D23]'
                          )
                        )}
                      >
                       {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </aside>
  );
}
