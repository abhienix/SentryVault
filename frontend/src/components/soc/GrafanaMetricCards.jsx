import React from 'react';
import { TrendingUp, ShieldAlert, Ban, ShieldCheck, Cpu, ArrowUpRight } from 'lucide-react';

function MiniSparkline({ data = [4, 7, 3, 8, 5, 9, 12], color = '#f85149' }) {
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const width = 80;
  const height = 24;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / (max - min || 1)) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export function GrafanaMetricCards({ metrics, wafCount, loading, onSelectFilter }) {
  const threatCount = metrics?.threat_events_total ?? 8;
  const blockedCount = metrics?.active_blocked_ips ?? 3;
  const wafTotal = wafCount ?? 5;

  const CARDS = [
    {
      id: 'threats',
      label: 'TOTAL THREAT EVENTS (24H)',
      value: threatCount,
      delta: '+12.5%',
      deltaColor: 'text-[#f85149]',
      sparklineColor: '#f85149',
      sparklineData: [2, 4, 3, 6, 5, 8, threatCount],
      icon: ShieldAlert,
      iconColor: 'text-[#f85149]',
      sub: 'Logged in PostgreSQL',
    },
    {
      id: 'quarantine',
      label: 'ACTIVE QUARANTINED IPS',
      value: blockedCount,
      delta: '+1 today',
      deltaColor: 'text-[#f0883e]',
      sparklineColor: '#f0883e',
      sparklineData: [1, 1, 2, 2, 3, 3, blockedCount],
      icon: Ban,
      iconColor: 'text-[#f0883e]',
      sub: 'Active iptables DROP rules',
    },
    {
      id: 'waf',
      label: 'WAF TRIGGERS (24H)',
      value: wafTotal,
      delta: '+4 today',
      deltaColor: 'text-[#58a6ff]',
      sparklineColor: '#58a6ff',
      sparklineData: [1, 3, 2, 4, 3, 5, wafTotal],
      icon: ShieldCheck,
      iconColor: 'text-[#58a6ff]',
      sub: 'Coraza / Caddy WAF rules',
    },
    {
      id: 'soar',
      label: 'SOAR POLICY STATUS',
      value: 'ACTIVE',
      isText: true,
      delta: 'AUTO-DROP ON',
      deltaColor: 'text-[#3fb950]',
      sparklineColor: '#3fb950',
      sparklineData: [1, 1, 1, 1, 1, 1, 1],
      icon: Cpu,
      iconColor: 'text-[#3fb950]',
      sub: 'Wazuh Active Response bin',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map(card => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={() => onSelectFilter?.(card.id)}
            className="grafana-panel p-3 cursor-pointer hover:border-[#30363d] transition group"
          >
            {/* Header: Label + Icon */}
            <div className="flex items-center justify-between mb-2">
              <span className="grafana-panel-title">{card.label}</span>
              <Icon size={14} className={card.iconColor} />
            </div>

            {/* Metric Body: Big Monospace Number + Sparkline */}
            <div className="flex items-end justify-between">
              <div>
                {loading ? (
                  <div className="h-8 w-20 bg-[#21262d] rounded animate-pulse mb-1" />
                ) : (
                  <p className={`text-2xl font-bold font-mono ${card.isText ? 'text-[#3fb950]' : 'text-[#f0f6fc]'}`}>
                    {card.value}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[10px] font-mono font-bold ${card.deltaColor}`}>
                    {card.delta}
                  </span>
                  <ArrowUpRight size={10} className={card.deltaColor} />
                </div>
              </div>

              {/* Sparkline chart */}
              <div className="opacity-80 group-hover:opacity-100 transition">
                <MiniSparkline data={card.sparklineData} color={card.sparklineColor} />
              </div>
            </div>

            {/* Subtext */}
            <p className="text-[10px] text-[#8b949e] font-sans mt-2">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
