import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Pause, Play, Search, Eye, X, Copy, Check, Filter } from 'lucide-react';

const SEVERITY_CONFIG = {
  CRITICAL: { bg: 'bg-[#f85149]/15', text: 'text-[#f85149]', border: 'border-[#f85149]/40' },
  HIGH:     { bg: 'bg-[#f0883e]/15', text: 'text-[#f0883e]', border: 'border-[#f0883e]/40' },
  MEDIUM:   { bg: 'bg-[#d29922]/15', text: 'text-[#d29922]', border: 'border-[#d29922]/40' },
  LOW:      { bg: 'bg-[#3fb950]/15', text: 'text-[#3fb950]', border: 'border-[#3fb950]/40' },
};

function JSONModal({ event, onClose }) {
  const [copied, setCopied] = useState(false);
  const jsonStr = event.raw_alert
    ? JSON.stringify(event.raw_alert, null, 2)
    : JSON.stringify({
        id: event.id,
        timestamp: event.timestamp,
        source_ip: event.source_ip,
        threat_type: event.threat_type,
        severity: event.severity,
        description: event.description,
        status: event.status,
      }, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#161b22] border border-[#2a2e37] rounded-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e37] bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#f0f6fc]">
              RAW ALERT PAYLOAD #{event.id}
            </span>
            <span className="text-xs font-mono text-[#58a6ff]">{event.source_ip}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-mono text-[#c9d1d9] transition"
            >
              {copied ? <Check size={12} className="text-[#3fb950]" /> : <Copy size={12} />}
              {copied ? 'COPIED' : 'COPY JSON'}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-[#8b949e]">Type: <strong className="text-[#f0f6fc]">{event.threat_type}</strong></span>
            <span className="text-[#8b949e]">Status: <strong className="text-[#3fb950]">{event.status}</strong></span>
            <span className="text-[#8b949e]">Time: <strong className="text-[#c9d1d9]">{new Date(event.timestamp).toLocaleString()}</strong></span>
          </div>

          <pre className="bg-[#0d1117] text-[#3fb950] font-mono text-xs p-4 rounded border border-[#2a2e37] overflow-auto max-h-72 leading-relaxed">
            {jsonStr}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function GrafanaThreatStream({ threats, loading, paused, onTogglePause }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchIP, setSearchIP] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const streamRef = useRef(null);

  // Filter threats
  const filteredThreats = threats.filter(t => {
    if (searchIP && !t.source_ip.includes(searchIP)) return false;
    if (severityFilter !== 'ALL' && t.severity !== severityFilter) return false;
    if (typeFilter !== 'ALL' && t.threat_type !== typeFilter) return false;
    return true;
  });

  return (
    <>
      {selectedEvent && (
        <JSONModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      <div className="grafana-panel p-3">
        {/* Panel Header & Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#2a2e37]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-[#f85149]" />
            <span className="grafana-panel-title">LIVE THREAT EVENT STREAM</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
              {filteredThreats.length} EVENTS
            </span>
          </div>

          {/* Inline Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* IP Search */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b949e]" />
              <input
                type="text"
                value={searchIP}
                onChange={e => setSearchIP(e.target.value)}
                placeholder="Filter IP..."
                className="bg-[#0d1117] border border-[#2a2e37] text-xs font-mono text-[#c9d1d9] pl-7 pr-2.5 py-1 rounded focus:outline-none focus:border-[#58a6ff] w-32"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-[#0d1117] border border-[#2a2e37] text-xs font-mono text-[#c9d1d9] px-2 py-1 rounded focus:outline-none focus:border-[#58a6ff]"
            >
              <option value="ALL">ALL SEVERITY</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>

            {/* Attack Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-[#0d1117] border border-[#2a2e37] text-xs font-mono text-[#c9d1d9] px-2 py-1 rounded focus:outline-none focus:border-[#58a6ff]"
            >
              <option value="ALL">ALL TYPES</option>
              <option value="SQLI">SQLI</option>
              <option value="XSS">XSS</option>
              <option value="BRUTE_FORCE">BRUTE FORCE</option>
              <option value="PATH_TRAVERSAL">PATH TRAVERSAL</option>
            </select>

            {/* Pause Stream Button (Spacebar trigger) */}
            <button
              onClick={onTogglePause}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold border transition ${
                paused
                  ? 'bg-[#d29922]/15 border-[#d29922]/40 text-[#d29922]'
                  : 'bg-[#0d1117] border-[#2a2e37] text-[#8b949e] hover:text-[#f0f6fc]'
              }`}
            >
              {paused ? <Play size={11} /> : <Pause size={11} />}
              {paused ? 'RESUME STREAM' : 'PAUSE (SPACE)'}
            </button>
          </div>
        </div>

        {/* Real-time Data Table */}
        {loading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-[#0d1117] rounded animate-pulse" />
            ))}
          </div>
        ) : !filteredThreats.length ? (
          <div className="text-center py-10 text-[#8b949e] font-mono text-xs">
            NO THREAT EVENTS MATCHING CURRENT FILTER.
          </div>
        ) : (
          <div
            ref={streamRef}
            className="overflow-x-auto max-h-96 grafana-scrollbar"
          >
            <table className="w-full text-xs font-mono text-left border-collapse">
              <thead>
                <tr className="bg-[#0d1117] border-b border-[#2a2e37] text-[#8b949e] text-[10px] uppercase font-bold sticky top-0">
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Source IP</th>
                  <th className="px-3 py-2">Attack Type</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Action Taken</th>
                  <th className="px-3 py-2 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2e37]/50">
                {filteredThreats.map(t => {
                  const sev = SEVERITY_CONFIG[t.severity] || SEVERITY_CONFIG.LOW;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedEvent(t)}
                      className="hover:bg-[#1c2128] transition-colors cursor-pointer group"
                    >
                      <td className="px-3 py-2 text-[#8b949e] whitespace-nowrap">
                        {new Date(t.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${sev.bg} ${sev.text} ${sev.border}`}>
                          {t.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#58a6ff] font-bold whitespace-nowrap">
                        {t.source_ip}
                      </td>
                      <td className="px-3 py-2 text-[#f0f6fc] whitespace-nowrap">
                        {t.threat_type}
                      </td>
                      <td className="px-3 py-2 text-[#8b949e] max-w-xs truncate font-sans">
                        {t.description || '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          t.status === 'BLOCKED'
                            ? 'bg-[#3fb950]/15 text-[#3fb950] border-[#3fb950]/40'
                            : 'bg-[#d29922]/15 text-[#d29922] border-[#d29922]/40'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#21262d] text-[#c9d1d9] border border-[#30363d] text-[10px]">
                          <Eye size={10} /> View JSON
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
