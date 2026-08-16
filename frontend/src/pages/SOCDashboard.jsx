import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Download, ToggleLeft, ToggleRight,
  Shield, Activity, AlertTriangle, Terminal
} from 'lucide-react';

import { BankingKPIBar }          from '../components/soc/BankingKPIBar';
import { HealthHeartbeatGrid }     from '../components/soc/HealthHeartbeatGrid';
import { ThreatStreamFeed }        from '../components/soc/ThreatStreamFeed';
import { QuarantineManager }       from '../components/soc/QuarantineManager';
import { VulnerabilityTestRunner } from '../components/soc/VulnerabilityTestRunner';

import {
  getBankingKPIs,
  getSystemHealth,
  getThreatEvents,
  getBlockedIPs,
  getWafAlerts,
} from '../services/socService';

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Section({ icon: Icon, title, color = '#00d4ff', children, action }) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{
        background: 'linear-gradient(135deg,#0a0f1e 0%,#0f172a 100%)',
        borderColor: color + '33',
        boxShadow: `0 0 30px ${color}0a`,
      }}>
      <div className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: color + '22', background: color + '08' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: color + '22', border: `1px solid ${color}44` }}>
            <Icon size={14} style={{ color }} />
          </div>
          <span className="text-sm font-bold text-white">{title}</span>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Standalone SOC Top Navbar ───────────────────────────────────────────────
function DashboardHeader({ autoRefresh, onToggleAuto, onRefresh, onExport, lastUpdated, refreshing }) {
  return (
    <header className="border-b border-cyan-500/20 bg-[#060a14]/90 backdrop-blur sticky top-0 z-40 mb-6">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & System Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/10 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,212,255,0.2)]">
            <Shield size={22} className="text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white tracking-tight">
                SentryVault SOC Command Center
              </h1>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                INTERNAL · 192.168.20.10
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              SIEM Log Monitor (Wazuh v4.14.7) · PostgreSQL Threat Store · SOAR Auto-Quarantine
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Auto-Refresh Toggle */}
          <button
            onClick={onToggleAuto}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
            style={{
              background: autoRefresh ? 'rgba(0,212,255,0.12)' : '#1e293b',
              borderColor: autoRefresh ? 'rgba(0,212,255,0.4)' : '#334155',
              color: autoRefresh ? '#00d4ff' : '#64748b',
            }}>
            {autoRefresh ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            Live 5s
          </button>

          {/* Manual Refresh */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-semibold transition">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          {/* Export JSON / CSV */}
          <button
            onClick={() => onExport('json')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs transition">
            <Download size={13} /> JSON
          </button>
          <button
            onClick={() => onExport('csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs transition">
            <Download size={13} /> CSV
          </button>

          {/* Link to Banking Portal */}
          <a
            href="/bank"
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition">
            🏦 Core Banking App
          </a>
        </div>
      </div>
    </header>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────
function exportData(data, format, filename) {
  let content, type, ext;
  if (format === 'csv') {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
    content = csv; type = 'text/csv'; ext = 'csv';
  } else {
    content = JSON.stringify(data, null, 2); type = 'application/json'; ext = 'json';
  }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${filename}.${ext}`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function SOCDashboard() {
  const [kpis,       setKpis]       = useState(null);
  const [health,     setHealth]     = useState(null);
  const [threats,    setThreats]    = useState([]);
  const [blocked,    setBlocked]    = useState([]);
  const [wafAlerts,  setWafAlerts]  = useState([]);

  const [loading,    setLoading]    = useState({ kpis: true, health: true, threats: true, blocked: true, waf: true });
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const autoRef = useRef(autoRefresh);
  autoRef.current = autoRefresh;

  const fetchAll = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [kpisRes, healthRes, threatsRes, blockedRes, wafRes] = await Promise.allSettled([
        getBankingKPIs(),
        getSystemHealth(),
        getThreatEvents({ limit: 50 }),
        getBlockedIPs(),
        getWafAlerts({ limit: 30 }),
      ]);

      if (kpisRes.status === 'fulfilled')    setKpis(kpisRes.value.data);
      if (healthRes.status === 'fulfilled')  setHealth(healthRes.value.data);
      if (threatsRes.status === 'fulfilled') setThreats(threatsRes.value.data);
      if (blockedRes.status === 'fulfilled') setBlocked(blockedRes.value.data);
      if (wafRes.status === 'fulfilled')     setWafAlerts(wafRes.value.data);

      setLoading({ kpis: false, health: false, threats: false, blocked: false, waf: false });
      setLastUpdated(new Date());
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 5s
  useEffect(() => {
    const id = setInterval(() => { if (autoRef.current) fetchAll(); }, 5000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const handleExport = (format) => {
    exportData(threats, format, `soc_threats_${Date.now()}`);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#050810 0%,#0a0f1e 100%)' }}>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">

        <DashboardHeader
          autoRefresh={autoRefresh}
          onToggleAuto={() => setAutoRefresh(p => !p)}
          onRefresh={() => fetchAll(true)}
          onExport={handleExport}
          lastUpdated={lastUpdated}
          refreshing={refreshing}
        />

        {/* KPI Bar */}
        <div className="mb-5">
          <BankingKPIBar kpis={kpis} loading={loading.kpis} />
        </div>

        {/* Health Heartbeat */}
        <div className="mb-5">
          <Section icon={Activity} title="Infrastructure Heartbeat" color="#00d4ff">
            <HealthHeartbeatGrid health={health} loading={loading.health} />
          </Section>
        </div>

        {/* Main Grid: Threats + Quarantine */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
          {/* Threat Stream — 2/3 width */}
          <div className="xl:col-span-2">
            <Section
              icon={AlertTriangle}
              title="Live Threat Event Stream"
              color="#f59e0b"
              action={
                <span className="text-[10px] font-mono text-slate-500">
                  {threats.length} events
                </span>
              }>
              <ThreatStreamFeed threats={threats} loading={loading.threats} />
            </Section>
          </div>

          {/* Quarantine Manager — 1/3 width */}
          <div className="xl:col-span-1">
            <Section icon={Shield} title="IP Quarantine" color="#ef4444">
              <QuarantineManager
                blockedIPs={blocked}
                loading={loading.blocked}
                onRefresh={() => getBlockedIPs().then(r => setBlocked(r.data))}
              />
            </Section>
          </div>
        </div>

        {/* WAF Alerts + Vuln Lab */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* WAF Alerts */}
          <Section icon={Shield} title="WAF Alert Feed" color="#818cf8"
            action={
              <span className="text-[10px] font-mono text-slate-500">
                {wafAlerts.length} events
              </span>
            }>
            {loading.waf ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: '#1e293b' }} />
                ))}
              </div>
            ) : !wafAlerts.length ? (
              <div className="text-center py-8 text-slate-500 text-sm">No WAF alerts.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {['Time', 'IP', 'Type', 'Severity', 'Blocked'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-700/60">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wafAlerts.slice(0, 15).map(a => (
                      <tr key={a.id} className="border-b border-slate-800/60 hover:bg-slate-800/20 transition">
                        <td className="px-3 py-2 font-mono text-slate-500 text-[10px] whitespace-nowrap">
                          {new Date(a.detected_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono text-indigo-400 font-bold whitespace-nowrap">{a.source_ip}</td>
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{a.attack_type}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold"
                            style={{
                              background: a.severity === 'CRITICAL' ? '#ef444422' : a.severity === 'HIGH' ? '#f9731622' : '#f59e0b22',
                              color: a.severity === 'CRITICAL' ? '#f87171' : a.severity === 'HIGH' ? '#fb923c' : '#fbbf24',
                            }}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-bold ${a.blocked ? 'text-green-400' : 'text-slate-500'}`}>
                            {a.blocked ? '✓ YES' : '— NO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Vulnerability Test Runner */}
          <Section icon={Terminal} title="Vulnerability Test Runner" color="#a78bfa">
            <VulnerabilityTestRunner onAttackFired={() => setTimeout(() => fetchAll(), 1500)} />
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-700 font-mono">
            SentryVault SOC Command Center · Internal 192.168.20.10 · Wazuh v4.14.7 · FastAPI /api/v1/soc
          </p>
        </div>
      </div>
    </div>
  );
}
