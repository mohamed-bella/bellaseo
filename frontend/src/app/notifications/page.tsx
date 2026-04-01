'use client';

import { useEffect, useState } from 'react';
import { Bell, MessageSquare, ShieldCheck, Zap, AlertCircle, Save, QrCode, CheckCircle2, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import apiClient from '@/services/apiClient';
import { getSocket } from '@/services/websocketClient';

export default function NotificationsPage() {
  const socket = getSocket();
  const [settings, setSettings] = useState({
    phone_number: '',
    enabled: false,
    notify_success: true,
    notify_errors: true,
  });
  const [whatsappStatus, setWhatsappStatus] = useState<{
    connected: boolean;
    qr: string | null;
    user: string | null;
  }>({
    connected: false,
    qr: null,
    user: null
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data } = await apiClient.get('/notifications/whatsapp');
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch notification settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWhatsappStatus = async () => {
    try {
      const { data } = await apiClient.get('/notifications/whatsapp/status');
      setWhatsappStatus(data);
      
      // If connected and no phone number set, update settings local state
      if (data.connected && data.user && !settings.phone_number) {
        setSettings(prev => ({ ...prev, phone_number: data.user || '' }));
      }
    } catch (err) {
      console.error('Failed to fetch whatsapp status:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWhatsappStatus();

    // Socket Listeners
    socket.on('whatsapp:qr', (data: { qr: string }) => {
      setWhatsappStatus(prev => ({ ...prev, qr: data.qr, connected: false }));
    });

    socket.on('whatsapp:status', (data: { connected: boolean, user?: string, sessionDeleted?: boolean }) => {
      setWhatsappStatus({
        connected: data.connected,
        user: data.user || null,
        qr: data.connected ? null : whatsappStatus.qr
      });
      
      if (data.connected && data.user) {
        setSettings(prev => ({ ...prev, phone_number: data.user || '' }));
      }
      if (data.sessionDeleted) {
        setWhatsappStatus({ connected: false, user: null, qr: null });
      }
    });

    return () => {
      socket.off('whatsapp:qr');
      socket.off('whatsapp:status');
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.post('/notifications/whatsapp', settings);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const testWhatsApp = async () => {
    if (!settings.phone_number) return alert('Enter a phone number first');
    setIsTesting(true);
    try {
      await apiClient.post('/notifications/whatsapp/test', { phone: settings.phone_number });
      alert('Test message sent!');
    } catch (err) {
      alert('Test failed. Make sure the backend WhatsApp service is running and connected.');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading settings...</div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1 text-lg">Configure how the system alerts you about automation events.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="card-premium space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center border border-[#25D366]/20">
                  <MessageSquare className="w-5 h-5 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="font-bold text-white">WhatsApp Notifications</h3>
                  <p className="text-xs text-muted-foreground">Powered by Baileys Web Automation</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.enabled}
                  onChange={e => setSettings({...settings, enabled: e.target.checked})}
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Alert Target Number</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={settings.phone_number}
                    onChange={e => setSettings({...settings, phone_number: e.target.value})}
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    placeholder="e.g. 1234567890"
                  />
                  {whatsappStatus.connected && (
                    <Button variant="outline" type="button" onClick={testWhatsApp} isLoading={isTesting}>
                      Test Bot
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">
                  {whatsappStatus.connected 
                    ? `Connected to ${whatsappStatus.user}. Notifications will be sent to the target above.`
                    : "Connect the bot using the QR code to enable testing."}
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest">Alert Preferences</h4>
                <div className="flex items-center justify-between p-3 glass-dark rounded-xl border border-white/5">
                   <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-white/80">Notify on publishing success</span>
                   </div>
                   <input 
                      type="checkbox" 
                      checked={settings.notify_success}
                      onChange={e => setSettings({...settings, notify_success: e.target.checked})}
                      className="accent-primary w-4 h-4" 
                   />
                </div>
                <div className="flex items-center justify-between p-3 glass-dark rounded-xl border border-white/5">
                   <div className="flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      <span className="text-sm text-white/80">Notify on system errors</span>
                   </div>
                   <input 
                      type="checkbox" 
                      checked={settings.notify_errors}
                      onChange={e => setSettings({...settings, notify_errors: e.target.checked})}
                      className="accent-primary w-4 h-4" 
                   />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex justify-end">
              <Button type="submit" isLoading={isSaving} className="flex gap-2">
                <Save className="w-4 h-4" /> Save Settings
              </Button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
           <div className="card-premium">
              <div className="flex items-center gap-3 mb-4">
                 <ShieldCheck className={cn("w-5 h-5", whatsappStatus.connected ? "text-emerald-500" : "text-amber-500")} />
                 <h4 className="font-bold text-white text-sm">Bot Session</h4>
              </div>
              
              <div className="flex flex-col items-center justify-center p-4 bg-black/40 rounded-xl border border-white/5 space-y-4">
                {whatsappStatus.connected ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-white uppercase tracking-wider">Connected</p>
                      <p className="text-xs text-muted-foreground mt-1">{whatsappStatus.user}</p>
                    </div>
                  </>
                ) : whatsappStatus.qr ? (
                  <>
                    <div className="p-3 bg-white rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={whatsappStatus.qr} alt="WhatsApp QR Code" className="w-40 h-40" />
                    </div>
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2">
                         <QrCode className="w-4 h-4 text-primary" />
                         <p className="text-xs font-bold text-white">Scan to Connect</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed px-4">
                        Open WhatsApp on your phone {'>'} Linked Devices {'>'} Link a Device.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                      <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin-slow" />
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Initializing...</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-[10px]"
                      onClick={async () => {
                        setIsLoading(true);
                        await apiClient.post('/notifications/whatsapp/start');
                        setTimeout(() => fetchWhatsappStatus(), 2000);
                        setIsLoading(false);
                      }}
                    >
                      Start Session
                    </Button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full text-xs bg-red-500/5 hover:bg-red-500/10 border-red-500/20 text-red-500"
                  onClick={async () => {
                    if (!confirm('Are you sure? This will wipe your current WhatsApp session and you will need to scan again.')) return;
                    await apiClient.post('/notifications/whatsapp/delete-session');
                    setWhatsappStatus({ connected: false, qr: null, user: null });
                    alert('Session deleted. Backend will restart in 5s.');
                    setTimeout(() => fetchWhatsappStatus(), 6000);
                  }}
                >
                  Delete Session
                </Button>

                <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full text-xs"
                    onClick={fetchWhatsappStatus}
                  >
                    <RefreshCw className="w-3 h-3 mr-2" /> Refresh Status
                </Button>
              </div>

              {!whatsappStatus.connected && (
                <p className="text-[10px] text-muted-foreground mt-4 italic text-center">
                  The session will persist once scanned.
                </p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

// Minimal CSS-in-JS or global utils for this page
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
