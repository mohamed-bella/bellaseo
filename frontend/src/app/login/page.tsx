'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { Eye, EyeOff, Lock, User, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import { BRANDING } from '@/config/branding';

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
      // 1. Validation check for missing env vars
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
      
      // Store token for backend compatibility
      Cookies.set('seo_admin_token', data.session.access_token, { expires: 7, secure: true });

      // Fetch precise role from Supabase for UI state (SAFE: default to editor if row missing)
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
      
      // Force Hard Reload
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative overflow-hidden">
      
      {/* LEFT COLUMN: Brand Hero (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 relative bg-[#0a0a0a] border-r border-border items-center justify-center p-12 overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,107,0,0.15),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10 max-w-lg animate-in slide-in-from-left-8 fade-in duration-1000 ease-out-quart">
           <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-2xl shadow-primary/20 mb-10 rotate-3">
              <ShieldCheck className="w-10 h-10 text-white" />
           </div>
           
           <h2 className="text-5xl font-black text-white tracking-tight leading-[1.1] mb-6">
             The Future of <span className="text-primary">Search Dominance</span> Starts Here.
           </h2>
           
           <p className="text-lg text-slate-400 leading-relaxed mb-8 font-medium">
             Unlock enterprise-grade SEO automation, predictive analytics, and content generation powered by advanced AI. Manage your entire digital empire in one secure workspace.
           </p>

           <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
              <div>
                <p className="text-3xl font-black text-white">99.9%</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1 font-bold">System Uptime</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">2.5M+</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest mt-1 font-bold">Articles Generated</p>
              </div>
           </div>
        </div>

        {/* Decorative corner glow */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/20 blur-[120px] rounded-full" />
      </div>

      {/* RIGHT COLUMN: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
        
        <div className="w-full max-w-[420px] relative z-10">
          
          <div className="mb-10 block md:hidden text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Sign In</h1>
          </div>

          <div className="mb-10 hidden md:block">
            <h1 className="text-4xl font-black text-foreground tracking-tight mb-3">Secure Portal</h1>
            <p className="text-muted-foreground font-medium italic">Enter your workspace credentials to continue.</p>
          </div>

          {/* Form Container */}
          <div className="card-premium p-8 animate-in slide-in-from-bottom-8 fade-in duration-700">
            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <input
                    type="email"
                    placeholder="admin@seo-saas.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-secondary/30 border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-2xl pl-11 pr-4 py-4 text-sm text-foreground transition-all placeholder:text-muted-foreground/40 outline-none font-medium"
                    disabled={isLoading}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Master Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-secondary/30 border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-2xl pl-11 pr-12 py-4 text-sm text-foreground transition-all placeholder:text-muted-foreground/40 outline-none font-medium"
                    disabled={isLoading}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-7 mt-2 rounded-2xl text-[15px] font-black shadow-xl shadow-primary/10 hover:shadow-primary/20 active:scale-95 transition-all"
                isLoading={isLoading}
              >
                Enter Workspace
              </Button>
              
            </form>
          </div>
          
          {/* Footer info */}
          <div className="text-center mt-10 space-y-4">
             <div className="flex items-center justify-center gap-6 opacity-30">
                <div className="w-12 h-px bg-foreground" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Verified by Supabase</span>
                <div className="w-12 h-px bg-foreground" />
             </div>
             <p className="text-[11px] text-muted-foreground font-bold opacity-60">
               If you lost your credentials, please contact your system administrator.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
