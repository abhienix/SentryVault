import React, { useState, useEffect } from 'react';
import { Shield, Clock, ExternalLink } from 'lucide-react';

export function GrafanaTopBar({ systemStatus = 'OPERATIONAL', lastUpdated, autoRefresh, onToggleAuto, onRefresh }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const statusStyles = {
    OPERATIONAL: { label: 'SYSTEM OPERATIONAL', color: 'text-[#3fb950]', bg: 'bg-[#3fb950]/10', border: 'border-[#3fb950]/30', dot: 'bg-[#3fb950]' },
    DEGRADED:    { label: 'SYSTEM DEGRADED',    color: 'text-[#d29922]', bg: 'bg-[#d29922]/10', border: 'border-[#d29922]/30', dot: 'bg-[#d29922]' },
    UNDER_ATTACK:{ label: 'UNDER HIGH ATTACK', color: 'text-[#f85149]', bg: 'bg-[#f85149]/10', border: 'border-[#f85149]/30', dot: 'bg-[#f85149] animate-ping' },
  };

  const currentStatus = statusStyles[systemStatus] || statusStyles.OPERATIONAL;

  return (
    <header className="bg-[#161b22] border-b border-[#2a2e37] sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Branding & Status Pill */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#0d1117] border border-[#2a2e37] flex items-center justify-center">
            <Shield size={18} className="text-[#58a6ff]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#f0f6fc] tracking-tight">SENTRYVAULT SOC</span>
              <span className="text-[10px] font-mono text-[#8b949e]">v4.14.7</span>
              {/* System status pill */}
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${currentStatus.bg} ${currentStatus.color} ${currentStatus.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`} />
                {currentStatus.label}
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] font-mono">
              INTERNAL NETWORK · 192.168.20.10 · PostgreSQL Threat Store
            </p>
          </div>
        </div>

        {/* Right: Live Clock, Refresh Controls & Banking Link */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {/* Live Clock */}
          <div className="flex items-center gap-1.5 text-[#8b949e] bg-[#0d1117] px-2.5 py-1 rounded border border-[#2a2e37]">
            <Clock size={12} className="text-[#58a6ff]" />
            <span>{timeStr}</span>
          </div>

          {/* Last updated */}
          {lastUpdated && (
            <span className="text-[11px] text-[#8b949e] hidden lg:inline">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          {/* Live auto-refresh toggle */}
          <button
            onClick={onToggleAuto}
            className={`px-2.5 py-1 rounded border text-[11px] font-semibold font-mono transition ${
              autoRefresh
                ? 'bg-[#3fb950]/10 border-[#3fb950]/40 text-[#3fb950]'
                : 'bg-[#0d1117] border-[#2a2e37] text-[#8b949e]'
            }`}
          >
            {autoRefresh ? 'LIVE (5s)' : 'PAUSED'}
          </button>

          {/* DMZ Node Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0d1117] border border-[#2a2e37] text-[11px] font-mono text-[#8b949e]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]" />
            <span>DMZ HOST: 192.168.10.10</span>
          </div>
        </div>
      </div>
    </header>
  );
}
