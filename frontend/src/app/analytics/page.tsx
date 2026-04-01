'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  MousePointer2, 
  Eye, 
  Trophy, 
  ArrowUpRight, 
  ArrowDownRight,
  Globe,
  Users,
  Clock,
  Layout,
  Loader2,
  Table as TableIcon,
  Filter,
  RefreshCw
} from 'lucide-react';
import apiClient from '@/services/apiClient';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface Site {
  id: string;
  name: string;
  api_url: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [whatsappStatus, setWhatsappStatus] = useState<any>({ connected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const [sitesRes, analyticsRes, waRes] = await Promise.all([
        apiClient.get('/sites'),
        apiClient.get(`/analytics/overview${selectedSiteId ? `?siteId=${selectedSiteId}` : ''}`),
        apiClient.get('/notifications/whatsapp/status').catch(() => ({ data: { connected: false } }))
      ]);
      setSites(sitesRes.data);
      setData(analyticsRes.data);
      setWhatsappStatus(waRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSiteId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4 opacity-50" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Synchronizing with Google...</p>
      </div>
    );
  }

  // Pre-process Data for the chart
  const gscChartData = data?.gsc?.map((row: any) => ({
    date: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    position: row.position
  })) || [];

  const totalClicks = gscChartData.reduce((sum: number, r: any) => sum + r.clicks, 0);
  const avgPos = gscChartData.length > 0 ? (gscChartData.reduce((sum: number, r: any) => sum + r.position, 0) / gscChartData.length).toFixed(1) : '–';
  const totalImps = gscChartData.reduce((sum: number, r: any) => sum + r.impressions, 0);

  const totalActiveUsers = data?.ga4?.length 
    ? data.ga4.reduce((sum: number, row: any) => sum + row.activeUsers, 0)
    : 0;
  
  const totalSessions = data?.ga4?.length 
    ? data.ga4.reduce((sum: number, row: any) => sum + row.sessions, 0)
    : 0;

  const totalViews = data?.ga4?.length 
    ? data.ga4.reduce((sum: number, row: any) => sum + row.views, 0)
    : 0;
  
  const avgDurationSeconds = data?.ga4?.length 
    ? (data.ga4.reduce((sum: number, row: any) => sum + row.duration, 0) / data.ga4.length)
    : 0;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight leading-none mb-4">
            Insight <span className="text-primary">Hub</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold flex items-center gap-2 text-muted-foreground mr-2">
              <Globe className="w-4 h-4" /> Real-time Monitors:
            </p>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${data?.connections?.gsc ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-rose-100 bg-rose-50 text-primary'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${data?.connections?.gsc ? 'bg-emerald-500 animate-pulse' : 'bg-primary'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{data?.connections?.gsc ? 'GSC Live' : 'GSC Offline'}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${whatsappStatus.connected ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-rose-100 bg-rose-50 text-primary'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${whatsappStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-primary'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{whatsappStatus.connected ? 'WhatsApp Live' : 'WhatsApp Offline'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select 
              value={selectedSiteId}
              onChange={e => setSelectedSiteId(e.target.value)}
              className="bg-card border border-border rounded-2xl pl-10 pr-4 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer hover:border-primary/50"
            >
              <option value="">Global Overview</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name || s.api_url}</option>)}
            </select>
          </div>
          <button 
             onClick={() => fetchData(true)}
             disabled={isRefreshing}
             className="w-11 h-11 flex items-center justify-center rounded-2xl bg-secondary border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-foreground group"
          >
            <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          </button>
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clicks', value: totalClicks, icon: MousePointer2, color: 'text-primary', trend: '+12.5%', isUp: true },
          { label: 'Page Views', value: totalViews.toLocaleString(), icon: Layout, color: 'text-foreground', trend: '+8.2%', isUp: true },
          { label: 'Avg. Duration', value: formatDuration(avgDurationSeconds), icon: Clock, color: 'text-amber-500', trend: '-0.3', isUp: true },
          { label: 'Active Users', value: totalActiveUsers > 0 ? totalActiveUsers.toLocaleString() : '–', icon: Users, color: 'text-emerald-500', trend: totalActiveUsers > 0 ? '+14%' : 'N/A', isUp: true },
        ].map((stat, i) => (
          <div key={i} className="glass-premium grainy p-6 rounded-3xl border border-border group hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-black text-foreground mt-1 group-hover:text-primary transition-colors">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* ── MAIN CHART ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
        
        <div className="xl:col-span-2 glass-premium grainy p-8 rounded-3xl border border-border h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Traffic Momentum
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Growth trajectory across search and direct channels.</p>
            </div>
          </div>
          
          <div className="flex-1 w-full -ml-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gscChartData}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--muted-foreground)', fontSize: 10}}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    backdropFilter: 'blur(4px)'
                  }} 
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="var(--primary)" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorClicks)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOP PAGES LIST */}
        <div className="glass-premium grainy p-6 rounded-3xl border border-border flex flex-col h-[500px]">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2 mb-6">
            <Layout className="w-5 h-5 text-primary" /> High-Spec Pages
          </h2>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {data?.topPages?.length > 0 ? data.topPages.slice(0, 10).map((row: any, i: number) => (
              <div key={i} className="group flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-border hover:bg-secondary/30 transition-all cursor-pointer">
                <div className="flex items-center gap-3 overflow-hidden">
                   <div className="w-8 h-8 rounded-lg bg-secondary text-[10px] font-black text-muted-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
                    #{i+1}
                   </div>
                   <div className="truncate">
                     <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors" title={row.path}>{row.path.replace(/^https?:\/\/[^\/]+/, '') || '/'}</p>
                     <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">{row.impressions.toLocaleString()} imp</p>
                   </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                   <p className="text-xs font-black text-foreground">{row.clicks.toLocaleString()}</p>
                   <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                     clicks
                   </p>
                </div>
              </div>
            )) : (
              <p className="text-xs text-muted-foreground text-center mt-10">No page data available</p>
            )}
          </div>
        </div>
      </div>

      {/* ── CHANNEL BREAKDOWN ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-premium grainy p-6 rounded-3xl border border-border">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Traffic Categories
            </h2>
          </div>
          <div className="h-[300px] w-full -ml-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gscChartData.slice(-7)}>
                <XAxis dataKey="date" hide />
                <Tooltip 
                   contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px',
                    fontSize: '10px',
                    color: 'var(--foreground)'
                  }}
                />
                <Bar dataKey="clicks" radius={[4, 4, 0, 0]}>
                  {gscChartData.map((_entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === gscChartData.length - 1 ? 'var(--primary)' : 'rgba(var(--primary-rgb), 0.1)'} 
                      className="transition-all duration-500 hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-premium grainy p-6 rounded-3xl border border-border flex flex-col justify-center gap-8 relative overflow-hidden">
           {/* Abstract BG Decor */}
           <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
           
           <div>
             <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Strategy Insight</span>
             <h2 className="text-2xl font-black text-foreground mt-2 leading-tight">
               Content Momentum
             </h2>
             <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-md">
               Review your top performing content to understand what resonates. Double down on themes from your most visited pages.
             </p>
           </div>
           
           <div className="flex items-center gap-4">
             <button onClick={() => window.location.href='/workflows'} className="border border-border bg-secondary/50 text-foreground font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-xl hover:bg-secondary transition-all">
               View Logs
             </button>
           </div>
        </div>
      </div>
      
    </div>
  );
}
