'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { Eye, EyeOff, Lock, User, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && 
         (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || 
          !process.env.NEXT_PUBLIC_SUPABASE_URL)) {
          throw new Error("Missing Supabase configuration. Please check your frontend/.env.local file.");
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password
      });

      if (error || !data.user) throw error;
      
      Cookies.set('seo_admin_token', data.session.access_token, { expires: 7, secure: true, path: '/' });

      let role: 'admin' | 'editor' = 'editor';
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        if (profile?.role) role = profile.role as 'admin' | 'editor';
      } catch (profileErr) {
        console.warn("Profile fetch failed, defaulting to editor:", profileErr);
      }

      const userPayload = {
        id: data.user.id,
        username: data.user.email?.split('@')[0] || 'User',
        role: role
      };

      localStorage.setItem('seo_user', JSON.stringify(userPayload));

      toast.success('Login successful! Redirecting...');
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── LEFT COLUMN: Login Form ── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <div className="max-w-md w-full mx-auto">
          {/* Brand Header */}
          <div className="mb-10 block">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#FF642D] shadow-sm mb-6">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1A1D23] tracking-tight mb-2">Welcome Back</h1>
            <p className="text-sm font-medium text-[#6B7280]">Sign in to your automated SEO workspace.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1D23] uppercase tracking-wider">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-[#9CA3AF]" />
                </div>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-[#E5E8EB] focus:border-[#FF642D] focus:ring-2 focus:ring-[#FF642D]/20 rounded-md pl-10 pr-4 py-2.5 text-sm text-[#1A1D23] transition-all placeholder:text-[#9CA3AF] outline-none"
                  disabled={isLoading}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1A1D23] uppercase tracking-wider">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#9CA3AF]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#E5E8EB] focus:border-[#FF642D] focus:ring-2 focus:ring-[#FF642D]/20 rounded-md pl-10 pr-10 py-2.5 text-sm text-[#1A1D23] transition-all placeholder:text-[#9CA3AF] outline-none"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-2.5 mt-2"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          {/* Footer info */}
          <div className="mt-12 text-sm text-[#9CA3AF] flex items-center gap-2">
             <ShieldCheck className="w-4 h-4" />
             Authenticated securely via Supabase Auth
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Brand/Aesthetic Pattern (Hidden on Mobile) ── */}
      <div className="hidden lg:flex w-1/2 bg-[#F3F4F6] relative items-center justify-center p-12 overflow-hidden border-l border-[#E5E8EB]">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#E5E8EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E8EB_1px,transparent_1px)] bg-[size:40px_40px] opacity-60" />
        
        <div className="relative z-10 max-w-lg bg-white p-10 rounded-xl shadow-xl border border-[#E5E8EB]">
          <h2 className="text-2xl font-bold text-[#1A1D23] mb-6">System Status: Optimal</h2>
          <div className="space-y-4">
            {[
              { label: 'Automated Publishing Pipeline', status: 'Operational' },
              { label: 'AI Generation Clusters', status: 'Online' },
              { label: 'Internal Link Engine', status: 'Optimized' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-[#F7F8FA] rounded-md border border-[#E5E8EB]">
                <span className="text-sm font-semibold text-[#1A1D23]">{item.label}</span>
                <span className="flex items-center gap-2 text-xs font-bold text-[#10B981] bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-8 border-t border-[#E5E8EB]">
            <p className="text-sm font-medium text-[#6B7280] leading-relaxed">
              Enterprise SEO infrastructure running on strict, data-driven automation. Your competitive advantage is ready.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
