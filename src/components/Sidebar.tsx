import React from 'react';
import { 
  Youtube, TrendingUp, ListChecks, Sliders, CloudUpload, 
  Terminal, UserCheck, Settings as SettingsIcon, Database, AlertCircle, LogOut 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  stats: {
    queued: number;
    processing: number;
    rulesActive: number;
  };
  users: any[];
  handleDisconnectUser: (id: string) => void;
  handleLinkChannel: () => void;
  showNotification: (type: any, msg: string) => void;
  isOpen: boolean;
  onClose: () => void;
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  statusFilter,
  setStatusFilter,
  stats,
  users,
  handleDisconnectUser,
  handleLinkChannel,
  showNotification,
  isOpen,
  onClose,
  selectedUserId,
  setSelectedUserId
}: SidebarProps) {
  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#08080c] border-r border-white/5 flex flex-col h-screen z-50 transition-transform duration-300 transform lg:translate-x-0 lg:sticky lg:top-0 shrink-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
              <Youtube className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold font-display tracking-tight text-white leading-none">YouTube Auto</h1>
              <h1 className="text-sm font-bold font-display tracking-tight text-white leading-none mt-0.5">Republisher</h1>
              <p className="text-[9px] text-white/40 mt-1 uppercase tracking-wider font-semibold">Automation • Secure • Scalable</p>
            </div>
          </div>
          
          {/* Close button for mobile screen */}
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { id: 'queue', label: 'Queue & Library', icon: ListChecks, badge: stats.queued + stats.processing },
            { id: 'scheduler', label: 'Scheduler Rules', icon: Sliders, badge: stats.rulesActive },
            { id: 'transfers', label: 'Transfers', icon: CloudUpload, badge: stats.processing },
            { id: 'logs', label: 'Audit Logs', icon: Terminal },
            { id: 'accounts', label: 'Linked Accounts', icon: UserCheck, badge: users.length },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
            { id: 'developer', label: 'Developer', icon: Database },
            { id: 'notifications', label: 'Notifications', icon: AlertCircle },
          ].map((item) => {
            const Icon = item.icon;
            // Determine active state
            let isActive = false;
            if (item.id === 'transfers') {
              isActive = activeTab === 'queue' && statusFilter === 'downloading';
            } else if (item.id === 'accounts') {
              isActive = activeTab === 'dashboard' && false;
            } else if (item.id === 'developer') {
              isActive = activeTab === 'settings' && false;
            } else if (item.id === 'notifications') {
              isActive = false;
            } else {
              isActive = activeTab === item.id;
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'transfers') {
                    setActiveTab('queue');
                    setStatusFilter('downloading');
                  } else if (item.id === 'accounts') {
                    setActiveTab('dashboard');
                    setTimeout(() => {
                      document.getElementById('linked-accounts-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  } else if (item.id === 'developer') {
                    setActiveTab('settings');
                  } else if (item.id === 'notifications') {
                    showNotification('info', 'All notifications synchronized and up to date.');
                  } else {
                    setActiveTab(item.id as any);
                  }
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-xs transition-all tracking-wide ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/25 text-white shadow-lg' 
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-white/60'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/40'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System Status in Sidebar */}
        <div className="px-4 mb-2 shrink-0">
          <div className="bg-[#0b0b10] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest font-mono">System Status</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-400">Healthy</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold text-white/30 uppercase tracking-widest font-mono">Uptime</p>
                <p className="text-[10px] font-bold text-white/70 font-mono mt-0.5">2d 14h 36m</p>
              </div>
            </div>

            {/* Glowing Green Sparkline */}
            <div className="h-6 w-full opacity-60">
              <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M 0 15 L 10 13 L 20 16 L 30 11 L 40 14 L 50 10 L 60 15 L 70 12 L 80 14 L 90 9 L 100 11" fill="none" stroke="#10b981" strokeWidth="1.5" />
                <path d="M 0 15 L 10 13 L 20 16 L 30 11 L 40 14 L 50 10 L 60 15 L 70 12 L 80 14 L 90 9 L 100 11 L 100 20 L 0 20 Z" fill="rgba(16, 185, 129, 0.05)" />
              </svg>
            </div>

            <div className="flex items-center justify-between pt-1 text-[9px] text-white/40 font-mono border-t border-white/5">
              <span>Version</span>
              <span className="text-white/60 font-bold">v2.4.1</span>
            </div>

            <button 
              onClick={() => {
                setActiveTab('logs');
                onClose();
              }}
              className="w-full py-1.5 text-[10px] font-bold text-white bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600 hover:to-indigo-600 border border-white/10 rounded-lg transition-all"
            >
              View Full Console
            </button>
          </div>
        </div>

        {/* User Profile in Sidebar */}
        <div className="p-4 border-t border-white/5 bg-[#050508]/60 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-white/5 border border-white/15 shrink-0 flex items-center justify-center">
              {users.length > 0 ? (
                selectedUserId === 'all' ? (
                  <div className="w-full h-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">ALL</div>
                ) : (
                  <img 
                    src={users.find(u => u.id === selectedUserId)?.channelThumbnail || users.find(u => u.id === selectedUserId)?.picture || users[0].channelThumbnail || users[0].picture} 
                    alt="" 
                    referrerPolicy="no-referrer" 
                    className="w-full h-full object-cover" 
                  />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/30">YT</div>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate max-w-[120px]">
                {users.length > 0 ? (
                  selectedUserId === 'all' 
                    ? 'All Channels' 
                    : (users.find(u => u.id === selectedUserId)?.channelTitle || users.find(u => u.id === selectedUserId)?.name || users[0].channelTitle || users[0].name)
                ) : 'No Account Linked'}
              </p>
              <p className={`text-[9px] font-mono flex items-center gap-1 mt-0.5 font-semibold ${users.length > 0 ? 'text-emerald-400' : 'text-rose-400/80'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${users.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} /> 
                {users.length > 0 ? 'Active' : 'Offline'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (users.length > 0) {
                const targetId = selectedUserId !== 'all' ? selectedUserId : users[0].id;
                handleDisconnectUser(targetId);
              } else {
                handleLinkChannel();
              }
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition"
            title={users.length > 0 ? "Disconnect Channel" : "Link Channel"}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
}
