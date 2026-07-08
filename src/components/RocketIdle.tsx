import React from 'react';

export default function RocketIdle() {
  return (
    <div className="relative flex flex-col items-center justify-center py-8 text-center bg-gradient-to-b from-white/[0.01] to-white/[0.03] rounded-2xl border border-white/5 p-6 overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-56 h-56 bg-blue-500/5 rounded-full blur-2xl animate-pulse" />
        <div className="w-40 h-40 bg-purple-500/5 rounded-full blur-xl" />
      </div>

      {/* SVG Rocket Illustration */}
      <div className="relative w-36 h-36 flex items-center justify-center z-10">
        <svg viewBox="0 0 100 100" className="w-28 h-28 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
          <circle cx="20" cy="30" r="1" fill="#fff" opacity="0.6" />
          <circle cx="80" cy="20" r="1.5" fill="#fff" opacity="0.8" />
          <circle cx="15" cy="75" r="1.2" fill="#fff" opacity="0.4" />
          <circle cx="85" cy="70" r="1" fill="#fff" opacity="0.5" />
          <circle cx="50" cy="15" r="1" fill="#fff" opacity="0.7" />
          
          {/* Rocket flame */}
          <path d="M44,65 Q50,85 56,65 Z" fill="url(#flameGradient)" />
          <path d="M46,65 Q50,78 54,65 Z" fill="#ffb703" />

          {/* Rocket body */}
          <path d="M35,62 L42,65 L44,45 L35,52 Z" fill="#4d2f80" />
          <path d="M65,62 L58,65 L56,45 L65,52 Z" fill="#4d2f80" />
          <path d="M50,15 C58,35 58,58 58,65 L42,65 C42,58 42,35 50,15 Z" fill="url(#rocketBodyGradient)" />
          
          {/* Rocket nose cone */}
          <path d="M50,15 C54,23 54,32 54,32 L46,32 C46,32 46,23 50,15 Z" fill="#ff2a6d" />
          
          {/* Rocket window */}
          <circle cx="50" cy="42" r="6" fill="#05d9e8" stroke="#fff" strokeWidth="1.5" />
          <circle cx="48" cy="40" r="2" fill="#fff" opacity="0.8" />
          
          {/* Rocket base thruster */}
          <rect x="45" y="65" width="10" height="2" rx="1" fill="#3b3b3b" />

          {/* Gradients */}
          <defs>
            <linearGradient id="rocketBodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d1f7ff" />
              <stop offset="60%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
            <linearGradient id="flameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff5e00" />
              <stop offset="50%" stopColor="#ffb703" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <h3 className="text-sm font-bold font-display text-white mt-4 tracking-tight">Pipeline is currently idle</h3>
      <p className="text-xs text-white/40 max-w-xs mt-1 leading-relaxed">
        Paste a URL below or configure automation rules to auto-publish videos.
      </p>
    </div>
  );
}
