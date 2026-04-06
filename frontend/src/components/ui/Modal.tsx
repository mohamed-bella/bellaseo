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
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/40 transition-opacity" 
        onClick={onClose} 
      />
      <div className={cn("relative w-full max-h-[90vh] flex flex-col bg-white rounded-lg border border-[#E5E8EB] shadow-2xl animate-fade-up overflow-hidden", maxWidth)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E8EB] bg-[#F7F8FA] shrink-0">
          <h2 className="text-lg font-semibold text-[#1A1D23]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-200 text-[#6B7280] hover:text-[#1A1D23] transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}
