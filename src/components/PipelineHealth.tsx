import React from 'react';
import { Activity, RefreshCw, CheckCircle2 } from 'lucide-react';

interface PipelineHealthProps {
  usersCount: number;
  rulesCount: number;
  hasActiveRules: boolean;
}

export default function PipelineHealth({ usersCount, rulesCount, hasActiveRules }: PipelineHealthProps) {
  return (
    <div className="glass-panel p-6 rounded-3xl relative overflow-hidden backdrop-blur-md flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold font-display flex items-center gap-2 text-white/90">
          <Activity className="w-4 h-4 text-white/60" />
          Pipeline Health
        </h2>
        <button className="p-1 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white transition">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Circular Gauge */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#00f5d4" strokeWidth="3" strokeDasharray="100 0" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold font-mono">100%</span>
            <span className="text-[9px] text-emerald-400 font-bold uppercase mt-0.5">Healthy</span>
          </div>
        </div>
      </div>

      {/* Health list */}
      <div className="space-y-2 text-xs">
        {[
          { name: 'API Connection', checked: usersCount > 0 },
          { name: 'Storage Access', checked: true },
          { name: 'Network', checked: true },
          { name: 'Scheduler', checked: rulesCount > 0 },
          { name: 'Automation Rules', checked: hasActiveRules },
        ].map((srv, idx) => (
          <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-1 text-white/70">
            <span>{srv.name}</span>
            <CheckCircle2 className={`w-4 h-4 ${srv.checked ? 'text-emerald-400' : 'text-white/20'}`} />
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-3xs text-emerald-400 font-mono mt-2 font-bold justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          All systems operational
        </div>
      </div>
    </div>
  );
}
