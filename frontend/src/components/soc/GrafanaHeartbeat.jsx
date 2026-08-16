import React, { useState } from 'react';
import { Database, Server, Shield, Globe, Activity } from 'lucide-react';

const NODE_META = {
  'MySQL DB':       { icon: Database, name: 'MySQL DB',       role: 'Core Banking Ledger :3306' },
  'PostgreSQL SOC': { icon: Database, name: 'PostgreSQL SOC', role: 'Threat Store :5432' },
  'Wazuh Manager':  { icon: Shield,   name: 'Wazuh Manager',  role: 'SIEM Agent Ingest :1514' },
  'Internal Host':  { icon: Server,   name: 'Internal Host',  role: 'Ubuntu VM 192.168.20.10' },
  'DMZ FastAPI':    { icon: Globe,    name: 'DMZ FastAPI',    role: 'Debian VM 192.168.10.10' },
};

function NodeItem({ service, history = [1.2, 0.9, 1.4, 1.1, 1.5] }) {
  const [showPopover, setShowPopover] = useState(false);
  const meta = NODE_META[service.name] || { icon: Server, name: service.name, role: 'Node Service' };
  const Icon = meta.icon;
  const online = service.connected;

  const dotColor = online
    ? service.latency_ms > 200 ? 'bg-[#d29922]' : 'bg-[#3fb950]'
    : 'bg-[#f85149]';

  return (
    <div
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
      className="relative flex-1 bg-[#161b22] border border-[#2a2e37] hover:border-[#30363d] rounded p-2.5 flex items-center justify-between cursor-pointer transition"
    >
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColor} ${online ? '' : 'animate-ping'}`} />
        <Icon size={14} className="text-[#8b949e]" />
        <div>
          <p className="text-xs font-bold text-[#f0f6fc] leading-tight">{service.name}</p>
          <p className="text-[10px] text-[#8b949e] font-mono">{meta.role}</p>
        </div>
      </div>

      <div className="text-right">
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
          online ? 'bg-[#3fb950]/10 text-[#3fb950]' : 'bg-[#f85149]/10 text-[#f85149]'
        }`}>
          {online ? 'ONLINE' : 'OFFLINE'}
        </span>
        <p className="text-xs font-mono text-[#c9d1d9] mt-0.5">
          {online && service.latency_ms != null ? `${service.latency_ms} ms` : '—'}
        </p>
      </div>

      {/* Latency History Micro-chart Popover */}
      {showPopover && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#0d1117] border border-[#2a2e37] rounded p-2.5 shadow-2xl z-50 pointer-events-none">
          <p className="text-[10px] font-mono font-bold text-[#8b949e] uppercase mb-1">
            {service.name} Latency History (ms)
          </p>
          <div className="flex items-end justify-between h-8 gap-1 pt-1 border-t border-[#2a2e37]">
            {(history.length ? history : [service.latency_ms || 2]).map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full bg-[#58a6ff] rounded-t"
                  style={{ height: `${Math.min(100, Math.max(20, (val / 10) * 100))}%` }}
                />
                <span className="text-[8px] font-mono text-[#8b949e]">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GrafanaHeartbeat({ health, loading }) {
  const services = health?.services ?? [];

  // Mock latency samples for micro-chart popovers
  const sampleHistories = {
    'MySQL DB':       [0.8, 1.1, 0.9, 1.2, 0.25],
    'PostgreSQL SOC': [3.5, 4.2, 2.8, 3.9, 4.04],
    'Wazuh Manager':  [0.9, 1.0, 0.8, 0.9, 0.94],
    'Internal Host':  [1.8, 2.1, 1.9, 2.0, 2.01],
    'DMZ FastAPI':    [12.4, 15.1, 14.0, 13.2, 12.8],
  };

  return (
    <div className="grafana-panel p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-[#58a6ff]" />
          <span className="grafana-panel-title">INFRASTRUCTURE NODE HEARTBEAT</span>
        </div>
        <span className="text-[10px] font-mono text-[#8b949e]">FIXED POLL INTERVAL: 5S</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-[#0d1117] rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {services.map(svc => (
            <NodeItem
              key={svc.name}
              service={svc}
              history={sampleHistories[svc.name]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
