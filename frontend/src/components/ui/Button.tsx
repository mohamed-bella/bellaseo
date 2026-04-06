'use client';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export default function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children, 
  disabled,
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'border border-[#E5E8EB] bg-transparent hover:bg-gray-50 text-[#1A1D23] focus-visible:ring-[#E5E8EB]',
    ghost: 'hover:bg-gray-50 text-[#6B7280] hover:text-[#1A1D23] focus-visible:ring-gray-200',
    danger: 'bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-sm focus-visible:ring-[#EF4444]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'min-h-[36px] sm:min-h-[40px] px-3 sm:px-4 py-1.5 sm:py-2 text-[13px] sm:text-sm',
    lg: 'min-h-[40px] sm:min-h-[44px] px-5 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base',
    icon: 'p-2 min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px]',
  };

  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center rounded-md font-semibold transition-[transform,opacity,color,background-color] duration-150 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:scale-100",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {/* 44px minimum touch target invisible expansion buffer via pseudo element */}
      <span className="absolute inset-[-4px] min-h-[44px] min-w-[44px]" aria-hidden="true" />
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
