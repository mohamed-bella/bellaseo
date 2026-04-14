'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { Lock, User, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error('Check your credentials.');

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password: password
      });

      if (error || !data.user) throw error;
      
      Cookies.set('seo_admin_token', data.session.access_token, { expires: 7, secure: true, path: '/' });
      
      const userPayload = {
        id: data.user.id,
        username: data.user.email?.split('@')[0] || 'User',
      };
      localStorage.setItem('seo_user', JSON.stringify(userPayload));

      setIsSuccess(true);
      setTimeout(() => window.location.href = '/', 1000);
    } catch (err: any) {
      toast.error(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#F9FAFB] overflow-hidden">
      
      {/* ── Glory Glow Background ── */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF642D]/20 blur-[120px] rounded-full opacity-40 animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[400px] px-6"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1A1D23] shadow-2xl mb-6 group transition-all"
          >
            <ShieldCheck className="w-8 h-8 text-[#FF642D]" />
          </motion.div>
          <h1 className="text-3xl font-black text-[#1A1D23] tracking-tight lowercase">
            access<span className="text-[#FF642D]">.</span>center
          </h1>
          <p className="text-[13px] font-medium text-[#9CA3AF] mt-2 tracking-wide uppercase">
            SEO Automation Engine v2
          </p>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <div className="relative group">
                <input
                  type="email"
                  placeholder="Identity"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#F3F4F6] border-none rounded-2xl px-5 py-4 text-sm text-[#1A1D23] transition-all placeholder:text-[#9CA3AF] outline-none ring-2 ring-transparent focus:ring-[#FF642D]/20 focus:bg-white"
                  disabled={isLoading || isSuccess}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="relative group">
                <input
                  type="password"
                  placeholder="Access Key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F3F4F6] border-none rounded-2xl px-5 py-4 text-sm text-[#1A1D23] transition-all placeholder:text-[#9CA3AF] outline-none ring-2 ring-transparent focus:ring-[#FF642D]/20 focus:bg-white"
                  disabled={isLoading || isSuccess}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className={`w-full py-4 rounded-2xl font-bold transition-all duration-300 shadow-lg ${isSuccess ? 'bg-[#10B981]' : 'bg-[#FF642D] hover:scale-[1.02] active:scale-[0.98]'}`}
              isLoading={isLoading}
              disabled={isSuccess}
            >
              {isSuccess ? 'Authorized' : 'Connect'}
            </Button>
          </form>
        </div>

        <div className="mt-10 text-center">
            <p className="text-[10px] font-bold text-[#D1D5DB] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3 text-[#FF642D]" />
              Secure Enterprise Protocol
            </p>
        </div>
      </motion.div>

    </div>
  );
}
