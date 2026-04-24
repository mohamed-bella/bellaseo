'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  noPadding?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', noPadding = false }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full max-h-[95vh] flex flex-col bg-white rounded-2xl border border-[#E5E8EB] shadow-2xl overflow-hidden', maxWidth)}>
        {title ? (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E8EB] bg-[#FAFAFA] shrink-0">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#1A1D23]">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#1A1D23] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}
        <div className={cn('flex-1 bg-white', noPadding ? 'overflow-hidden' : 'p-6 overflow-y-auto custom-scrollbar')}>
          {children}
        </div>
      </div>
    </div>
  );
}
