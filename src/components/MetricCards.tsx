import React from 'react';
import { Database, ListChecks, CloudUpload, CheckCircle2, X } from 'lucide-react';

interface MetricCardsProps {
  stats: {
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export default function MetricCards({ stats }: MetricCardsProps) {
  const successRate = stats.completed + stats.failed > 0 
    ? Math.round((stats.completed / (stats.completed + stats.failed)) * 100) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Stats Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Scanned', 
            value: stats.total, 
            color: 'text-white', 
            desc: 'Catalog size', 
            icon: Database,
            sparkline: (
              <svg className="w-full h-8 mt-3" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M 0 18 L 10 16 L 20 17 L 30 14 L 40 15 L 50 12 L 60 14 L 70 11 L 80 13 L 90 9 L 100 11" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
                <path d="M 0 18 L 10 16 L 20 17 L 30 14 L 40 15 L 50 12 L 60 14 L 70 11 L 80 13 L 90 9 L 100 11 L 100 20 L 0 20 Z" fill="rgba(59, 130, 246, 0.05)" />
              </svg>
            )
          },
          { 
            label: 'Queue Size', 
            value: stats.queued, 
            color: 'text-purple-400', 
            desc: 'Pending transfer', 
            icon: ListChecks,
            sparkline: (
              <svg className="w-full h-8 mt-3" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M 0 18 L 15 17 L 30 14 L 45 16 L 60 12 L 75 14 L 90 10 L 100 12" fill="none" stroke="#a855f7" strokeWidth="1.5" />
                <path d="M 0 18 L 15 17 L 30 14 L 45 16 L 60 12 L 75 14 L 90 10 L 100 12 L 100 20 L 0 20 Z" fill="rgba(168, 85, 247, 0.05)" />
              </svg>
            )
          },
          { 
            label: 'Transfers Active', 
            value: stats.processing, 
            color: 'text-amber-400', 
            desc: 'Active pipelines', 
            icon: CloudUpload,
            pulse: stats.processing > 0,
            sparkline: (
              <svg className="w-full h-8 mt-3" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M 0 18 L 20 16 L 40 17 L 60 14 L 80 15 L 100 11" fill="none" stroke="#f97316" strokeWidth="1.5" />
                <path d="M 0 18 L 20 16 L 40 17 L 60 14 L 80 15 L 100 11 L 100 20 L 0 20 Z" fill="rgba(249, 115, 22, 0.05)" />
              </svg>
            )
          },
          { 
            label: 'Republished', 
            value: stats.completed, 
            color: 'text-emerald-400', 
            desc: 'Successful uploads', 
            icon: CheckCircle2,
            sparkline: (
              <svg className="w-full h-8 mt-3" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M 0 18 L 10 17 L 25 15 L 40 16 L 55 12 L 70 14 L 85 10 L 100 8" fill="none" stroke="#10b981" strokeWidth="1.5" />
                <path d="M 0 18 L 10 17 L 25 15 L 40 16 L 55 12 L 70 14 L 85 10 L 100 8 L 100 20 L 0 20 Z" fill="rgba(16, 185, 129, 0.05)" />
              </svg>
            )
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-panel p-5 rounded-2xl relative overflow-hidden group backdrop-blur-md">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest font-mono">{card.label}</p>
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  <Icon className="w-3.5 h-3.5 text-white/50" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className={`text-2xl font-bold font-display ${card.color}`}>
                  {card.value}
                </p>
                {card.pulse && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/30 mt-1 font-semibold">{card.desc}</p>
              {card.sparkline}
            </div>
          );
        })}
      </div>

      {/* Stats Cards Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipelines Failed Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest font-mono">Pipelines Failed</p>
            <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <X className="w-3.5 h-3.5 text-red-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold font-display text-red-400">
              {stats.failed}
            </p>
          </div>
          <p className="text-[10px] text-white/30 mt-1 font-semibold">Retryable transfers</p>
          <svg className="w-full h-10 mt-3" viewBox="0 0 100 20" preserveAspectRatio="none">
            <path d="M 0 18 L 20 16 L 40 18 L 60 14 L 80 16 L 100 13" fill="none" stroke="#ef4444" strokeWidth="1.5" />
            <path d="M 0 18 L 20 16 L 40 18 L 60 14 L 80 16 L 100 13 L 100 20 L 0 20 Z" fill="rgba(239, 68, 68, 0.05)" />
          </svg>
        </div>

        {/* Today's Summary Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group backdrop-blur-md">
          <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest font-mono mb-3">Today's Summary</p>
          <div className="flex items-center justify-between gap-6">
            <div className="relative w-16 h-16 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
                {stats.total === 0 ? (
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" strokeDasharray="100 0" />
                ) : (
                  <>
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.5" strokeDasharray={`${(stats.completed / stats.total) * 100} ${100 - (stats.completed / stats.total) * 100}`} strokeDashoffset="0" />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeDasharray={`${(stats.queued / stats.total) * 100} ${100 - (stats.queued / stats.total) * 100}`} strokeDashoffset={-((stats.completed / stats.total) * 100)} />
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeDasharray={`${(stats.failed / stats.total) * 100} ${100 - (stats.failed / stats.total) * 100}`} strokeDashoffset={-(((stats.completed + stats.queued) / stats.total) * 100)} />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold font-mono leading-none">{stats.total}</span>
                <span className="text-[8px] text-white/40 uppercase font-bold mt-0.5">Total</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-y-1.5 gap-x-3 text-[10px] font-bold font-mono">
              <div className="flex items-center justify-between border-b border-white/5 pb-0.5">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Scanned</span>
                <span className="text-white">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-0.5">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Queued</span>
                <span className="text-white">{stats.queued}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-0.5">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Republished</span>
                <span className="text-white">{stats.completed}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-0.5">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Failed</span>
                <span className="text-white">{stats.failed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Success Rate Card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest font-mono">Success Rate</p>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[9px] font-bold flex items-center gap-0.5 font-mono">
              ↑ {successRate}%
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold font-display text-emerald-400">
              {successRate}%
            </p>
          </div>
          <p className="text-[10px] text-white/30 mt-1 font-semibold">Last 7 days</p>
          <svg className="w-full h-10 mt-3" viewBox="0 0 100 20" preserveAspectRatio="none">
            <path d="M 0 18 Q 15 15 30 14 T 60 10 T 90 7 T 100 5" fill="none" stroke="#10b981" strokeWidth="1.5" />
            <path d="M 0 18 Q 15 15 30 14 T 60 10 T 90 7 T 100 5 L 100 20 L 0 20 Z" fill="rgba(16, 185, 129, 0.05)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
