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
    secondary: 'bg-secondary text-secondary-foreground hover:bg-muted focus-visible:ring-secondary',
    outline: 'border border-border bg-transparent hover:bg-secondary text-foreground focus-visible:ring-border',
    ghost: 'hover:bg-secondary text-muted-foreground hover:text-foreground focus-visible:ring-secondary',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm focus-visible:ring-destructive',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 py-1.5 sm:py-2 text-[13px] sm:text-sm',
    lg: 'min-h-[44px] sm:min-h-[48px] px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base',
    icon: 'p-2 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px]',
  };

  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl font-medium transition-[transform,opacity,color,background-color] duration-200 ease-out-quart",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:scale-100",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {/* 44px minimum touch target invisible expansion buffer via pseudo element */}
      <span className="absolute inset-[-10px] min-h-[44px] min-w-[44px]" aria-hidden="true" />
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
