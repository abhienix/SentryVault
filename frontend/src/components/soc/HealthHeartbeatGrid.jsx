import React from 'react';
import { Database, Server, Shield, Wifi, Globe } from 'lucide-react';

const NODE_META = {
  'MySQL DB':       { icon: Database, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  'PostgreSQL SOC': { icon: Database, color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  'Wazuh Manager':  { icon: Shield,   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'Internal Host':  { icon: Server,   color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-200' },
  'DMZ FastAPI':    { icon: Globe,    color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-200' },
};

function NodeCard({ service }) {
  const meta = NODE_META[service.name] || { icon: Wifi, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
  const Icon = meta.icon;
  const online = service.connected;

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col items-center gap-2 hover:shadow transition">
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${online ? meta.bg : 'bg-red-50'} border ${online ? meta.border : 'border-red-200'}`}>
        <Icon size={18} className={online ? meta.color : 'text-red-600'} />
      </div>

      {/* Service Name */}
      <p className="text-xs font-bold text-slate-800 text-center">{service.name}</p>

      {/* Online / Offline status badge */}
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${
        online
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-red-50 text-red-700 border-red-200'
      }`}>
        {online ? 'ONLINE' : 'OFFLINE'}
      </span>

      {/* Latency */}
      <p className="text-xs font-mono text-slate-500">
        {online && service.latency_ms != null
          ? `${service.latency_ms} ms`
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
          <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
        ))}
      </div>
    );
  }

  const services = health?.services ?? [];
  const overall = health?.overall_status;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Infrastructure Node Heartbeat
        </h3>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
          overall === 'ALL_GREEN'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : overall === 'DEGRADED'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {overall ?? 'CHECKING'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {services.map(svc => <NodeCard key={svc.name} service={svc} />)}
      </div>
    </div>
  );
}
