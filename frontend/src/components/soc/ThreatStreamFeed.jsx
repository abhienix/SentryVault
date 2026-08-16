import React, { useState } from 'react';
import { Eye, X, AlertTriangle, Flame, Info, AlertCircle, ShieldCheck } from 'lucide-react';

const SEVERITY_STYLE = {
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: Flame },
  HIGH:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
  MEDIUM:   { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle },
  LOW:      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Info },
};

function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLE[severity] || SEVERITY_STYLE.LOW;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
      <Icon size={11} />
      {severity}
    </span>
  );
}

function RawAlertModal({ event, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Threat Event Payload #{event.id}</h3>
            <p className="text-xs text-slate-500 font-mono">{event.source_ip} · {event.threat_type}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-4 flex-wrap text-xs">
            <span className="text-slate-500">Status: <span className="text-slate-900 font-bold font-mono">{event.status}</span></span>
            <span className="text-slate-500">Timestamp: <span className="text-slate-900 font-mono">{new Date(event.timestamp).toLocaleString()}</span></span>
            <SeverityBadge severity={event.severity} />
          </div>
          {event.description && (
            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200">
              {event.description}
            </p>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Raw Alert JSON Payload</p>
            <pre className="bg-slate-900 text-emerald-400 rounded-lg p-4 text-xs font-mono overflow-auto max-h-64 border border-slate-800">
              {event.raw_alert
                ? JSON.stringify(event.raw_alert, null, 2)
                : `// No raw JSON alert attached\n// Source IP: ${event.source_ip}\n// Type:      ${event.threat_type}\n// Severity:  ${event.severity}`}
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
          <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!threats?.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <ShieldCheck size={36} className="mx-auto mb-2 text-slate-300" />
        <p className="text-sm font-semibold text-slate-600">No active threat events.</p>
        <p className="text-xs text-slate-400">System security is nominal.</p>
      </div>
    );
  }

  return (
    <>
      {inspecting && <RawAlertModal event={inspecting} onClose={() => setInspecting(null)} />}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-left">
              {['Timestamp', 'Source IP', 'Attack Type', 'Severity', 'Description', 'Status', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {threats.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                  {new Date(t.timestamp).toLocaleString()}
                </td>
                <td className="px-3 py-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                  {t.source_ip}
                </td>
                <td className="px-3 py-2.5 font-mono text-slate-700 whitespace-nowrap font-medium">
                  {t.threat_type}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <SeverityBadge severity={t.severity} />
                </td>
                <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">
                  {t.description || '—'}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                    t.status === 'BLOCKED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : t.status === 'INVESTIGATING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => setInspecting(t)}
                    className="opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[10px] font-semibold"
                  >
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
