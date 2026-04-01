'use client';

import { useEffect, useState } from 'react';
import { Network, Zap, LayoutGrid, Layers, Key } from 'lucide-react';
import apiClient from '@/services/apiClient';

const EditableField = ({ value, onSave, className, icon: Icon, iconColor }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  if (isEditing) {
    return (
      <input 
        autoFocus
        value={tempValue}
        onChange={e => setTempValue(e.target.value)}
        onBlur={() => { setIsEditing(false); if(tempValue !== value) onSave(tempValue); }}
        onKeyDown={e => { if(e.key === 'Enter') { setIsEditing(false); if(tempValue !== value) onSave(tempValue); } }}
        className={`bg-background text-foreground border border-primary px-2 py-0.5 rounded outline-none w-full text-sm font-normal ${className}`}
      />
    );
  }
  return (
    <div 
      onDoubleClick={() => setIsEditing(true)} 
      className={`cursor-pointer hover:bg-primary/20 transition-colors px-2 py-0.5 rounded flex items-center gap-2 group truncate ${className}`} 
      title="Double click to edit"
    >
      {Icon && <Icon className={`w-3 h-3 flex-shrink-0 ${iconColor || 'text-muted-foreground'}`} />}
      <span className="truncate">{value}</span>
    </div>
  );
};

export default function VisualMapPage() {
  const [data, setData] = useState<any>({ campaigns: [], clusters: [], keywords: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const [{ data: cData }, { data: clData }, { data: kData }] = await Promise.all([
          apiClient.get('/campaigns'),
          apiClient.get('/clusters'),
          apiClient.get('/keywords')
        ]);
        
        setData({ campaigns: cData, clusters: clData, keywords: kData });
        if (cData.length > 0) setSelectedCampaign(cData[0].id);
      } catch (err) {
        console.error('Failed to load map data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMapData();
  }, []);

  const handleUpdate = async (type: 'cluster' | 'keyword', id: string, payload: any) => {
    try {
      if (type === 'cluster') {
        await apiClient.put(`/clusters/${id}`, payload);
        setData((prev: any) => ({ ...prev, clusters: prev.clusters.map((c: any) => c.id === id ? { ...c, ...payload } : c) }));
      } else {
        await apiClient.put(`/keywords/${id}`, payload);
        setData((prev: any) => ({ ...prev, keywords: prev.keywords.map((k: any) => k.id === id ? { ...k, ...payload } : k) }));
      }
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground animate-pulse">Mapping content universe...</div>;

  const activeCampaign = data.campaigns.find((c: any) => c.id === selectedCampaign);
  const campaignClusters = data.clusters.filter((cl: any) => cl.campaign_id === selectedCampaign);
  const looseKeywords = data.keywords.filter((k: any) => k.campaign_id === selectedCampaign && !k.cluster_id);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
             <Network className="w-8 h-8 text-primary" /> Topical Authority Map
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Visualize your Silos, Pillars, and Keyword Clusters.</p>
        </div>
        <select 
          value={selectedCampaign}
          onChange={e => setSelectedCampaign(e.target.value)}
          className="bg-secondary/50 border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-lg"
        >
          {data.campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!activeCampaign ? (
        <div className="glass p-12 text-center rounded-xl border border-border">
           <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
           <p className="text-muted-foreground italic">No campaigns found. Start building your SEO universe in Campaigns.</p>
        </div>
      ) : (
        <div className="p-8 glass rounded-2xl border border-border overflow-x-auto min-h-[60vh] relative custom-scrollbar">
           {/* Campaign Root Node */}
           <div className="flex flex-col items-center">
              <div className="bg-primary/20 border-2 border-primary/50 text-foreground px-8 py-4 rounded-2xl shadow-2xl shadow-primary/20 z-10 text-center min-w-[300px]">
                 <Layers className="w-6 h-6 text-primary mx-auto mb-2" />
                 <h2 className="font-bold text-xl">{activeCampaign.name}</h2>
                 <p className="text-xs text-primary/80 uppercase font-black tracking-widest mt-1">{activeCampaign.niche}</p>
              </div>

              {/* Linking Line Down from Campaign */}
              <div className="w-0.5 h-12 bg-border relative z-0"></div>

              {/* Horizontal Branching Line */}
              {campaignClusters.length > 0 && (
                 <div className="w-full relative h-0.5 bg-border z-0" style={{ maxWidth: `${Math.max(100, (campaignClusters.length - 1) * 350)}px` }}></div>
              )}

              {/* Clusters and Loose Keywords Row */}
              <div className="flex gap-8 mt-12 justify-center items-start relative z-10 w-full">
                 {campaignClusters.map((cluster: any, idx: number) => {
                    const clusterKeywords = data.keywords.filter((k: any) => k.cluster_id === cluster.id);
                    const pillars = clusterKeywords.filter((k: any) => k.is_pillar);
                    const standard = clusterKeywords.filter((k: any) => !k.is_pillar);

                    return (
                       <div key={cluster.id} className="flex flex-col items-center w-[300px]">
                          {/* Vertical line up to horizontal branch */}
                          <div className="w-0.5 h-12 bg-border absolute -top-12"></div>
                          
                          <div className="bg-secondary/80 border-t-4 border-amber-500 w-full p-5 rounded-xl shadow-xl transition-all hover:-translate-y-1">
                             <div className="flex items-center gap-2 mb-3">
                                <LayoutGrid className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <EditableField 
                                  value={cluster.name} 
                                  onSave={(val: string) => handleUpdate('cluster', cluster.id, { name: val })} 
                                  className="font-bold text-foreground truncate w-full"
                                />
                             </div>
                             
                             <div className="space-y-4">
                                {/* Pillars */}
                                {pillars.length > 0 && (
                                   <div className="space-y-2">
                                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest pl-2">Pillars</p>
                                      {pillars.map((pk: any) => (
                                         <EditableField 
                                           key={pk.id}
                                           value={pk.main_keyword} 
                                           onSave={(val: string) => handleUpdate('keyword', pk.id, { main_keyword: val })}
                                           icon={Zap} iconColor="text-amber-500"
                                           className="bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-500"
                                         />
                                      ))}
                                   </div>
                                )}

                                {/* Standard Keywords */}
                                {standard.length > 0 && (
                                   <div className="space-y-2">
                                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest pl-2">Supporting</p>
                                      {standard.map((sk: any) => (
                                         <EditableField 
                                           key={sk.id}
                                           value={sk.main_keyword} 
                                           onSave={(val: string) => handleUpdate('keyword', sk.id, { main_keyword: val })}
                                           icon={Key}
                                           className="bg-background border border-border text-xs text-foreground/80"
                                         />
                                      ))}
                                   </div>
                                )}

                                {clusterKeywords.length === 0 && (
                                   <p className="text-xs text-muted-foreground italic py-2 text-center">Empty Cluster</p>
                                )}
                             </div>
                          </div>
                       </div>
                    );
                 })}

                 {/* Drop loose keywords directly under campaign if no clusters or as a separate branch */}
                 {looseKeywords.length > 0 && (
                    <div className="flex flex-col items-center w-[300px]">
                       <div className="w-0.5 h-12 bg-border absolute -top-12"></div>
                       <div className="bg-secondary/40 border-t-4 border-muted w-full p-5 rounded-xl border-x border-b border-border shadow-md">
                          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 text-center">Loose Keywords</h3>
                          <div className="space-y-2">
                             {looseKeywords.map((lk: any) => (
                                <EditableField 
                                  key={lk.id}
                                  value={lk.main_keyword} 
                                  onSave={(val: string) => handleUpdate('keyword', lk.id, { main_keyword: val })}
                                  icon={lk.is_pillar ? Zap : undefined} iconColor={lk.is_pillar ? "text-amber-500" : undefined}
                                  className="bg-background border border-border text-xs text-foreground/80"
                                />
                             ))}
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
