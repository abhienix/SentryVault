import React from 'react';
import { Database, Server, Shield, Wifi, Globe } from 'lucide-react';

const NODE_META = {
  'MySQL DB':       { icon: Database, color: '#3b82f6' },
  'PostgreSQL SOC': { icon: Database, color: '#818cf8' },
  'Wazuh Manager':  { icon: Shield,   color: '#22c55e' },
  'Internal Host':  { icon: Server,   color: '#38bdf8' },
  'DMZ FastAPI':    { icon: Globe,    color: '#a78bfa' },
};

function NodeCard({ service }) {
  const meta = NODE_META[service.name] || { icon: Wifi, color: '#94a3b8' };
  const Icon = meta.icon;
  const online = service.connected;

  return (
    <div className="relative flex flex-col items-center gap-2 p-4 rounded-xl border"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderColor: online ? meta.color + '55' : '#ef444444',
        boxShadow: online ? `0 0 18px ${meta.color}22` : '0 0 12px #ef444415',
      }}>
      {/* Pulse ring */}
      <div className="relative">
        {online && (
          <span className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: meta.color, opacity: 0.2 }} />
        )}
        <div className="relative w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: online ? meta.color + '22' : '#ef444422', border: `2px solid ${online ? meta.color : '#ef4444'}` }}>
          <Icon size={18} style={{ color: online ? meta.color : '#ef4444' }} />
        </div>
      </div>

      {/* Name */}
      <p className="text-[11px] font-bold text-slate-300 text-center leading-tight">{service.name}</p>

      {/* Status pill */}
      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
        style={{
          background: online ? meta.color + '22' : '#ef444422',
          color: online ? meta.color : '#ef4444',
          border: `1px solid ${online ? meta.color + '55' : '#ef444455'}`,
        }}>
        {online ? 'ONLINE' : 'OFFLINE'}
      </span>

      {/* Latency */}
      <p className="text-[10px] font-mono"
        style={{ color: online ? '#94a3b8' : '#64748b' }}>
        {online && service.latency_ms != null
          ? `${service.latency_ms}ms`
          : service.error
          ? 'unreachable'
          : '—'}
      </p>
    </div>
  );
}

export function HealthHeartbeatGrid({ health, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl animate-pulse"
            style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }} />
        ))}
      </div>
    );
  }

  const services = health?.services ?? [];
  const overall = health?.overall_status;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Infrastructure Heartbeat
        </h3>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
          style={{
            background: overall === 'ALL_GREEN' ? '#22c55e22' : overall === 'DEGRADED' ? '#f59e0b22' : '#ef444422',
            color:      overall === 'ALL_GREEN' ? '#22c55e'   : overall === 'DEGRADED' ? '#fbbf24'   : '#ef4444',
            border:     `1px solid ${overall === 'ALL_GREEN' ? '#22c55e55' : overall === 'DEGRADED' ? '#f59e0b55' : '#ef444455'}`,
          }}>
          {overall ?? 'CHECKING'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {services.map(svc => <NodeCard key={svc.name} service={svc} />)}
      </div>
    </div>
  );
}
