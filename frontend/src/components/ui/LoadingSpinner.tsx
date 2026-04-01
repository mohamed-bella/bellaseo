'use client';

import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 20, className = "" }: { size?: number, className?: string }) {
  return (
    <Loader2 
      size={size} 
      className={`animate-spin text-primary ${className}`} 
    />
  );
}
