import Link from 'next/link';
import { BRANDING } from '@/config/branding';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-4xl font-bold text-[#1A1D23] mb-2">404</h2>
      <p className="text-[#6B7280] mb-6">Oops! The page you're looking for doesn't exist.</p>
      <Link 
        href="/" 
        className="px-6 py-2 bg-[#FF642D] text-white rounded-lg font-semibold hover:bg-[#E55A28] transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
