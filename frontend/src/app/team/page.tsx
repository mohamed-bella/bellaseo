'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/services/apiClient';
import { toast } from 'sonner';
import { User, Shield, ShieldCheck, FolderSync, Info, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

interface UserData {
  id: string;
  email: string;
  role: 'admin' | 'editor';
  assigned_campaigns: string[];
}

interface Campaign {
  id: string;
  name: string;
}

export default function TeamPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, campRes] = await Promise.all([
        apiClient.get('/auth/users'),
        apiClient.get('/campaigns')
      ]);
      setUsers(usersRes.data);
      setCampaigns(campRes.data);
    } catch (err: any) {
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCampaignAssignment = async (userId: string, campaignId: string, currentlyAssigned: boolean) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      let newAssignments = [...user.assigned_campaigns];
      if (currentlyAssigned) {
        newAssignments = newAssignments.filter(id => id !== campaignId);
      } else {
        newAssignments.push(campaignId);
      }

      await apiClient.post(`/auth/users/${userId}/assign`, { campaign_ids: newAssignments });
      toast.success('Permissions updated');
      fetchData(); // Sync state
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin'|'editor') => {
    try {
      if (!confirm(`Are you sure you want to change this user to ${newRole}?`)) return;
      await apiClient.put(`/auth/users/${userId}/role`, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  };

  if (isLoading && users.length === 0) return <div className="p-10 text-center text-muted-foreground animate-pulse">Loading Team Data...</div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage platform roles and map external users to specific Campaigns.</p>
        </div>
        <Button onClick={fetchData} variant="secondary">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Data
        </Button>
      </div>

      <div className="card-premium animate-in fade-in zoom-in-95 duration-300 border-blue-500/20 bg-blue-500/5">
        <h3 className="font-bold text-md mb-2 flex items-center gap-2 text-blue-400">
          <Info className="w-5 h-5" /> Supabase Authentication Active
        </h3>
        <p className="text-sm text-foreground/80 leading-relaxed max-w-4xl">
          User creation, password resets, and account deletion are natively handled by Supabase for maximum security. 
          To invite a new team member, please go to your <strong>Supabase Dashboard &rarr; Authentication &rarr; Users</strong> and click "Add User". Once added, they will automatically appear here for you to assign role permissions and campaigns!
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {users.map(user => (
          <div key={user.id} className="card-premium flex flex-col md:flex-row gap-6 hover:border-primary/20 transition-colors">
            
            {/* User Details */}
            <div className="flex-1 space-y-4">
              <div className="flex items-start gap-4">
                <div className={`p-3.5 rounded-2xl shadow-inner border ${user.role === 'admin' ? 'bg-primary/20 text-primary border-primary/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                  {user.role === 'admin' ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    {user.email || 'No Email Specified'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 ">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin'|'editor')}
                      className={`text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-bold outline-none cursor-pointer border ${
                        user.role === 'admin' 
                          ? 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30' 
                          : 'bg-secondary text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      <option value="admin">ADMIN</option>
                      <option value="editor">EDITOR</option>
                    </select>
                    <span className="text-xs text-muted-foreground font-mono bg-black/5 px-2 py-0.5 rounded-lg">ID: {user.id.split('-')[0]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Assignments (Only for Editors) */}
            {user.role === 'editor' && (
              <div className="flex-1 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  <FolderSync className="w-4 h-4 text-emerald-500" /> Assigned Campaigns
                </h4>
                {campaigns.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic bg-secondary/50 p-3 rounded-xl border border-border">No campaigns exist yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {campaigns.map(camp => {
                      const isAssigned = user.assigned_campaigns.includes(camp.id);
                      return (
                        <label key={camp.id} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${isAssigned ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-secondary/40 border-border hover:bg-secondary'}`}>
                          <input 
                            type="checkbox" 
                            checked={isAssigned}
                            onChange={() => toggleCampaignAssignment(user.id, camp.id, isAssigned)}
                            className="w-4 h-4 text-emerald-500 rounded border-emerald-500/30 focus:ring-emerald-500/50 bg-black/20"
                          />
                          <span className={`text-sm ${isAssigned ? 'text-emerald-400 font-bold' : 'text-foreground'}`}>
                            {camp.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {user.role === 'admin' && (
               <div className="flex-1 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 flex items-center justify-center text-center">
                 <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                   <Shield className="w-8 h-8 mx-auto mb-2 text-primary opacity-50" />
                   <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed font-medium">
                     Administrators have global access to all campaigns and protected system settings.
                   </p>
                 </div>
               </div>
            )}

          </div>
        ))}

        {users.length === 0 && !isLoading && (
          <div className="card-premium text-center p-12 animate-in fade-in">
            <h3 className="font-bold text-lg text-foreground">No Sub-Users Found</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              Please go to your Supabase Dashboard to invite new users to the platform.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
