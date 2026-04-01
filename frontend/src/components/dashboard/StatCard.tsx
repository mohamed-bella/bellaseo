import { LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
  isLoading?: boolean;
  className?: string;
}

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  isLoading,
  className 
}: StatCardProps) {
  return (
    <div className={cn("bg-card rounded-xl p-6 border border-border flex flex-col justify-between h-full", className)}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-primary">
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full border",
              trend.isUp ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-rose-100 bg-rose-50 text-primary"
            )}>
              {trend.isUp ? '+' : '-'}{trend.value}%
            </span>
          )}
        </div>
        <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-tight mb-1">{title}</p>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <LoadingSpinner size={24} />
          ) : (
            <h3 className="text-3xl font-bold text-foreground tracking-tight">{value}</h3>
          )}
        </div>
      </div>
      {description && (
        <p className="text-[12px] text-muted-foreground mt-4 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
