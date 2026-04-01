'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Globe, 
  Search, 
  Activity, 
  ExternalLink,
  Loader2,
  BellRing,
  CheckCircle2,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { FcBinoculars, FcRadarPlot } from 'react-icons/fc';
import apiClient from '@/services/apiClient';

export default function RadarPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Rule Form
  const [newKeyword, setNewKeyword] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [{ data: rulesData }, { data: leadsData }] = await Promise.all([
        apiClient.get('/radar/rules'),
        apiClient.get('/radar/opportunities')
      ]);
      setRules(rulesData || []);
      setLeads(leadsData || []);
    } catch (err) {
      console.error('Failed to fetch radar data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    setIsAdding(true);
    try {
      const { data } = await apiClient.post('/radar/rules', {
        keywords: newKeyword,
        platforms: ['reddit.com', 'quora.com', 'x.com']
      });
      setRules([data, ...rules]);
      setNewKeyword('');
    } catch (err) {
      console.error('Failed to add rule', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleRule = async (id: string, currentActive: boolean) => {
    try {
      setRules(rules.map(r => r.id === id ? { ...r, is_active: !currentActive } : r));
      await apiClient.patch(`/radar/rules/${id}`, { is_active: !currentActive });
    } catch (err) {
      console.error('Failed to toggle rule', err);
      // Revert on error
      fetchData();
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listening rule?')) return;
    try {
      setRules(rules.filter(r => r.id !== id));
      await apiClient.delete(`/radar/rules/${id}`);
    } catch (err) {
      console.error('Failed to delete rule', err);
      fetchData();
    }
  };

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      await apiClient.post('/radar/scan');
      alert('Radar scan started in the background! Leads will appear soon and notifications will be sent to WhatsApp if high intent is found.');
    } catch (err) {
      console.error('Failed to trigger scan', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Metrics
  const activeRules = rules.filter(r => r.is_active).length;
  const hotLeads = leads.filter(l => l.status === 'notified').length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4 opacity-50" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Scanning Radar frequencies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight leading-none mb-2 flex items-center gap-3">
             <FcRadarPlot className="w-10 h-10 drop-shadow-sm" /> Opportunity Radar
          </h1>
          <p className="text-sm font-bold text-muted-foreground mt-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> 24/7 Social Listening & Lead Forwarding
          </p>
        </div>
        
        <button
          onClick={handleRunScan}
          disabled={isScanning}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-xl transition-all disabled:opacity-50"
        >
          {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isScanning ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-premium grainy p-6 rounded-3xl border border-border group hover:border-blue-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Active Listening Rules</p>
          <h3 className="text-3xl font-black text-foreground mt-1">{activeRules}</h3>
        </div>
        
        <div className="glass-premium grainy p-6 rounded-3xl border border-border group hover:border-orange-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">High-Intent Leads Found</p>
          <h3 className="text-3xl font-black text-foreground mt-1">{hotLeads}</h3>
        </div>

        <div className="glass-premium grainy p-6 rounded-3xl border border-border group hover:border-emerald-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
            <BellRing className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">WhatsApp Alerts Sent</p>
          <h3 className="text-3xl font-black text-foreground mt-1">{hotLeads > 0 ? 'Live\u00A0✅' : 'Standing By'}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-full">
        
        {/* ── LEFT: RULES ── */}
        <div className="xl:col-span-1 space-y-4">
          <h2 className="text-xl font-black text-foreground flex items-center gap-2 mb-4">
            <FcBinoculars className="w-6 h-6" /> Listening Settings
          </h2>

          <form onSubmit={handleAddRule} className="flex gap-2">
            <input 
              type="text"
              placeholder="e.g. looking for morocco tours"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="flex-1 px-4 py-3 bg-card border border-border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit" 
              disabled={isAdding || !newKeyword.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-2xl transition-colors disabled:opacity-50"
            >
              {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            </button>
          </form>

          <div className="space-y-3 mt-6">
            {rules.length === 0 && (
               <div className="p-6 text-center border border-dashed border-border rounded-2xl">
                 <p className="text-sm font-bold text-muted-foreground">No listening rules configured.</p>
               </div>
            )}
            {rules.map(rule => (
               <div key={rule.id} className={`p-4 rounded-2xl border ${rule.is_active ? 'bg-secondary/20 border-border' : 'bg-transparent border-border/50 opacity-60'} flex items-center justify-between transition-all`}>
                  <div className="flex-1 overflow-hidden pr-3">
                     <p className="text-sm font-bold text-foreground truncate">"{rule.keywords}"</p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1 flex gap-2">
                        <span>{rule.platforms?.length} Platforms</span>
                     </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                     <button
                        onClick={() => handleToggleRule(rule.id, rule.is_active)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${rule.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                     >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${rule.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                     </button>
                     <button 
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-2"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: LEAD FEED ── */}
        <div className="xl:col-span-2 glass-premium grainy p-8 rounded-3xl border border-border flex flex-col min-h-[700px]">
          <div className="flex items-center justify-between mb-8 shrink-0">
             <div>
               <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                 <Activity className="w-5 h-5 text-blue-500 animate-pulse" /> Live Lead Feed
               </h2>
               <p className="text-xs font-bold text-muted-foreground mt-1">AI-verified opportunities scraped & notified to WhatsApp.</p>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
             {leads.length === 0 && (
                <div className="text-center py-20 text-muted-foreground opacity-50">
                   <Search className="w-12 h-12 mx-auto mb-4" />
                   <p className="text-sm font-black uppercase tracking-widest">Awaiting radar contacts.</p>
                </div>
             )}
             
             {leads.map(lead => (
               <div key={lead.id} className="p-5 rounded-2xl bg-card border border-border space-y-3 relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/80" />
                  
                  <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        {lead.platform.includes('reddit') ? <MessageSquare className="w-5 h-5 text-orange-500" /> : <Globe className="w-5 h-5 text-blue-500" />}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4 mb-1">
                           <h3 className="text-sm font-bold text-foreground leading-snug">{lead.title}</h3>
                           {lead.status === 'notified' && (
                              <span className="shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                                 <CheckCircle2 className="w-3 h-3" /> Sent
                              </span>
                           )}
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-2 mb-2">
                           Target: <span className="text-blue-400">"{lead.radar_rules?.keywords}"</span> • Intent Rating: {lead.intent_score}/10
                        </p>
                        <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed">
                           "{lead.snippet}"
                        </p>
                        <a 
                           href={lead.source_url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="inline-flex items-center gap-1.5 mt-4 text-[11px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 transition-colors"
                        >
                           Respond on {lead.platform.replace('.com', '')} <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        </div>

      </div>
    </div>
  );
}
