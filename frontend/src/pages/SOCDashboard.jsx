import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Download, ToggleLeft, ToggleRight,
  Shield, Activity, AlertTriangle, Terminal, ExternalLink
} from 'lucide-react';

import { SOCMetricCards }          from '../components/soc/SOCMetricCards';
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

// ─── Section Card Wrapper ───────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, iconColor = 'text-blue-600', children, action }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200">
            <Icon size={16} className={iconColor} />
          </div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Clean Light Top Navbar ─────────────────────────────────────────────────
function DashboardNavbar({ autoRefresh, onToggleAuto, onRefresh, onExport, refreshing }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <Shield size={22} className="text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                SentryVault SOC Command Center
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                INTERNAL NETWORK · 192.168.20.10
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans">
              SIEM Monitoring (Wazuh v4.14.7) · Threat Event Log (PostgreSQL) · SOAR IP Quarantine
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Auto-Refresh Toggle */}
          <button
            onClick={onToggleAuto}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
              autoRefresh
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
          >
            {autoRefresh ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            Live 5s
          </button>

          {/* Refresh Now */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition shadow-sm"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          {/* Export JSON / CSV */}
          <button
            onClick={() => onExport('json')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition"
          >
            <Download size={13} /> JSON
          </button>
          <button
            onClick={() => onExport('csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition"
          >
            <Download size={13} /> CSV
          </button>

          {/* Link to Core Banking App */}
          <a
            href="/bank"
            className="ml-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
          >
            🏦 Banking App <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </header>
  );
}

// ─── Export Helper ───────────────────────────────────────────────────────────
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

// ─── Main SOC Dashboard Page ──────────────────────────────────────────────────
export function SOCDashboard() {
  const [metrics,   setMetrics]   = useState(null);
  const [health,    setHealth]    = useState(null);
  const [threats,   setThreats]   = useState([]);
  const [blocked,   setBlocked]   = useState([]);
  const [wafAlerts, setWafAlerts] = useState([]);

  const [loading,     setLoading]     = useState({ metrics: true, health: true, threats: true, blocked: true, waf: true });
  const [refreshing,  setRefreshing]  = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

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

      if (kpisRes.status === 'fulfilled')    setMetrics(kpisRes.value.data);
      if (healthRes.status === 'fulfilled')  setHealth(healthRes.value.data);
      if (threatsRes.status === 'fulfilled') setThreats(threatsRes.value.data);
      if (blockedRes.status === 'fulfilled') setBlocked(blockedRes.value.data);
      if (wafRes.status === 'fulfilled')     setWafAlerts(wafRes.value.data);

      setLoading({ metrics: false, health: false, threats: false, blocked: false, waf: false });
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(() => { if (autoRef.current) fetchAll(); }, 5000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <DashboardNavbar
        autoRefresh={autoRefresh}
        onToggleAuto={() => setAutoRefresh(p => !p)}
        onRefresh={() => fetchAll(true)}
        onExport={format => exportData(threats, format, `soc_threats_${Date.now()}`)}
        refreshing={refreshing}
      />

      {/* Main Content Area */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* 1. Pure SOC Security Metric Cards (No banking SQL data) */}
        <SOCMetricCards
          metrics={metrics}
          wafCount={wafAlerts.length}
          loading={loading.metrics}
        />

        {/* 2. Infrastructure Node Heartbeat */}
        <SectionCard icon={Activity} title="Infrastructure Node Heartbeat" iconColor="text-blue-600">
          <HealthHeartbeatGrid health={health} loading={loading.health} />
        </SectionCard>

        {/* 3. Main Grid: Threat Stream + Quarantine Manager */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Threat Stream (2/3) */}
          <div className="xl:col-span-2">
            <SectionCard
              icon={AlertTriangle}
              title="Live Threat Event Stream"
              iconColor="text-amber-600"
              action={
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {threats.length} events logged
                </span>
              }
            >
              <ThreatStreamFeed threats={threats} loading={loading.threats} />
            </SectionCard>
          </div>

          {/* Quarantine Manager (1/3) */}
          <div className="xl:col-span-1">
            <SectionCard icon={Shield} title="IP Quarantine Controls" iconColor="text-red-600">
              <QuarantineManager
                blockedIPs={blocked}
                loading={loading.blocked}
                onRefresh={() => getBlockedIPs().then(r => setBlocked(r.data))}
              />
            </SectionCard>
          </div>
        </div>

        {/* 4. WAF Alerts + Vulnerability Test Runner */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* WAF Alert Log */}
          <SectionCard
            icon={Shield}
            title="WAF Attack Triggers (Coraza / Caddy)"
            iconColor="text-indigo-600"
            action={
              <span className="text-xs font-mono font-semibold text-slate-500">
                {wafAlerts.length} triggers
              </span>
            }
          >
            {loading.waf ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : !wafAlerts.length ? (
              <div className="text-center py-8 text-slate-400 text-xs">No WAF alerts logged.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-left">
                      {['Time', 'IP', 'Type', 'Severity', 'Blocked'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {wafAlerts.slice(0, 15).map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-mono text-slate-500 text-[10px] whitespace-nowrap">
                          {new Date(a.detected_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono text-indigo-700 font-bold whitespace-nowrap">{a.source_ip}</td>
                        <td className="px-3 py-2 text-slate-700 font-mono font-medium whitespace-nowrap">{a.attack_type}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            a.severity === 'CRITICAL'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : a.severity === 'HIGH'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-[10px] font-bold ${a.blocked ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {a.blocked ? '✓ YES' : '— NO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Vulnerability Test Runner */}
          <SectionCard icon={Terminal} title="Vulnerability Test Runner" iconColor="text-violet-600">
            <VulnerabilityTestRunner onAttackFired={() => setTimeout(() => fetchAll(), 1500)} />
          </SectionCard>
        </div>

        {/* Footer */}
        <footer className="pt-6 pb-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400 font-mono">
            SentryVault SOC Command Center · Internal Network 192.168.20.10 · PostgreSQL Threat Store · Wazuh v4.14.7
          </p>
        </footer>
      </main>
    </div>
  );
}
