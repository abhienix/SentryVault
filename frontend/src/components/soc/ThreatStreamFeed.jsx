import React, { useState } from 'react';
import { Eye, X, AlertTriangle, Flame, Info, AlertCircle } from 'lucide-react';

const SEVERITY_STYLE = {
  CRITICAL: { bg: '#ef444422', text: '#f87171', border: '#ef444455', icon: Flame },
  HIGH:     { bg: '#f97316 22', text: '#fb923c', border: '#f9731655', icon: AlertTriangle },
  MEDIUM:   { bg: '#f59e0b22', text: '#fbbf24', border: '#f59e0b55', icon: AlertCircle },
  LOW:      { bg: '#22c55e22', text: '#4ade80', border: '#22c55e55', icon: Info },
};

function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLE[severity] || SEVERITY_STYLE.LOW;
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      <Icon size={10} />
      {severity}
    </span>
  );
}

function RawAlertModal({ event, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-white">Threat Event #{event.id}</h3>
            <p className="text-xs text-slate-400 font-mono">{event.source_ip} · {event.threat_type}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-4 flex-wrap text-xs">
            <span className="text-slate-400">Status: <span className="text-white font-mono">{event.status}</span></span>
            <span className="text-slate-400">Time: <span className="text-white font-mono">{new Date(event.timestamp).toLocaleString()}</span></span>
            <SeverityBadge severity={event.severity} />
          </div>
          {event.description && (
            <p className="text-sm text-slate-300 bg-slate-800 rounded-lg p-3 border border-slate-700">
              {event.description}
            </p>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Raw Alert Payload</p>
            <pre className="bg-black rounded-xl p-4 text-xs text-green-400 font-mono overflow-auto max-h-64 border border-slate-700">
              {event.raw_alert
                ? JSON.stringify(event.raw_alert, null, 2)
                : `// No structured alert payload\n// Source: ${event.source_ip}\n// Type:   ${event.threat_type}\n// Sev:    ${event.severity}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThreatStreamFeed({ threats, loading }) {
  const [inspecting, setInspecting] = useState(null);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: '#1e293b' }} />
        ))}
      </div>
    );
  }

  if (!threats?.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <ShieldCheck size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-semibold">No threat events detected.</p>
        <p className="text-xs mt-1">System is clean.</p>
      </div>
    );
  }

  return (
    <>
      {inspecting && <RawAlertModal event={inspecting} onClose={() => setInspecting(null)} />}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left">
              {['Timestamp', 'Source IP', 'Type', 'Severity', 'Description', 'Status', ''].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-700/60">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {threats.map((t, i) => (
              <tr key={t.id}
                className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors group"
                style={{ animationDelay: `${i * 30}ms` }}>
                <td className="px-3 py-2.5 font-mono text-slate-400 whitespace-nowrap">
                  {new Date(t.timestamp).toLocaleString()}
                </td>
                <td className="px-3 py-2.5 font-mono text-cyan-400 whitespace-nowrap font-bold">
                  {t.source_ip}
                </td>
                <td className="px-3 py-2.5 font-mono text-slate-300 whitespace-nowrap">
                  {t.threat_type}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <SeverityBadge severity={t.severity} />
                </td>
                <td className="px-3 py-2.5 text-slate-400 max-w-xs truncate">
                  {t.description || '—'}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded"
                    style={{
                      background: t.status === 'BLOCKED' ? '#22c55e22' : t.status === 'INVESTIGATING' ? '#f59e0b22' : '#94a3b822',
                      color: t.status === 'BLOCKED' ? '#4ade80' : t.status === 'INVESTIGATING' ? '#fbbf24' : '#94a3b8',
                    }}>
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => setInspecting(t)}
                    className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 px-2 py-1 rounded border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 text-[10px]">
                    <Eye size={11} /> Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
