import React from 'react';
import { Wallet, Users, ArrowLeftRight, ShieldAlert, Ban, CheckCircle } from 'lucide-react';

const CARDS = [
  {
    key: 'total_deposits',
    label: 'Total Vault Deposits',
    icon: Wallet,
    color: '#3b82f6',
    format: v => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  },
  {
    key: 'total_accounts',
    label: 'Bank Accounts',
    icon: CheckCircle,
    color: '#22c55e',
    sub: d => `${d.active_accounts} active`,
    format: v => v?.toLocaleString(),
  },
  {
    key: 'total_transactions',
    label: 'Total Transactions',
    icon: ArrowLeftRight,
    color: '#38bdf8',
    sub: d => `${d.transactions_24h} in last 24h`,
    format: v => v?.toLocaleString(),
  },
  {
    key: 'total_users',
    label: 'Customers',
    icon: Users,
    color: '#a78bfa',
    format: v => v?.toLocaleString(),
  },
  {
    key: 'threat_events_total',
    label: 'Threat Events',
    icon: ShieldAlert,
    color: '#f59e0b',
    format: v => v?.toLocaleString(),
  },
  {
    key: 'active_blocked_ips',
    label: 'Quarantined IPs',
    icon: Ban,
    color: '#ef4444',
    format: v => v?.toLocaleString(),
  },
];

export function BankingKPIBar({ kpis, loading }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {CARDS.map(card => {
        const Icon = card.icon;
        const value = kpis?.[card.key];
        return (
          <div key={card.key}
            className="relative overflow-hidden rounded-xl p-3 border"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderColor: card.color + '44',
              boxShadow: `0 0 16px ${card.color}18`,
            }}>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10"
              style={{ background: card.color }} />
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: card.color + '22' }}>
                <Icon size={13} style={{ color: card.color }} />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                {card.label}
              </p>
            </div>
            {loading ? (
              <div className="h-6 w-20 rounded animate-pulse bg-slate-700" />
            ) : (
              <p className="text-lg font-bold font-mono" style={{ color: card.color }}>
                {value != null ? card.format(value) : '—'}
              </p>
            )}
            {card.sub && kpis && (
              <p className="text-[10px] text-slate-500 mt-0.5">{card.sub(kpis)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
