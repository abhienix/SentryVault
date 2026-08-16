import React from 'react';
import { ShieldAlert, Ban, ShieldCheck, Cpu } from 'lucide-react';

const CARDS = [
  {
    key: 'threat_events_total',
    label: 'Total Threat Events',
    icon: ShieldAlert,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    format: v => v?.toLocaleString() ?? 0,
    sub: 'Logged in PostgreSQL',
  },
  {
    key: 'active_blocked_ips',
    label: 'Active Quarantined IPs',
    icon: Ban,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    format: v => v?.toLocaleString() ?? 0,
    sub: 'Blocked in iptables',
  },
  {
    key: 'waf_alerts_count',
    label: 'WAF Triggers Logged',
    icon: ShieldCheck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    format: v => v?.toLocaleString() ?? 0,
    sub: 'Coraza / Caddy WAF',
  },
  {
    key: 'soar_status',
    label: 'SOAR Auto-Quarantine',
    icon: Cpu,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    format: () => 'ACTIVE',
    sub: 'Auto iptables DROP on high severity',
  },
];

export function SOCMetricCards({ metrics, wafCount, loading }) {
  const data = {
    ...metrics,
    waf_alerts_count: wafCount ?? 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map(card => {
        const Icon = card.icon;
        const value = data?.[card.key];
        return (
          <div
            key={card.key}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow transition"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`p-2 rounded-lg ${card.bgColor} ${card.borderColor} border`}>
                <Icon size={16} className={card.color} />
              </div>
            </div>
            {loading ? (
              <div className="h-7 w-20 bg-slate-100 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-bold font-mono text-slate-900">
                {card.format(value)}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1 font-sans">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
