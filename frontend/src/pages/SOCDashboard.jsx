import React, { useState, useEffect, useCallback, useRef } from 'react';

import { GrafanaTopBar }       from '../components/soc/GrafanaTopBar';
import { GrafanaMetricCards }  from '../components/soc/GrafanaMetricCards';
import { GrafanaHeartbeat }    from '../components/soc/GrafanaHeartbeat';
import { GrafanaThreatStream } from '../components/soc/GrafanaThreatStream';
import { GrafanaQuarantine }   from '../components/soc/GrafanaQuarantine';
import { GrafanaVulnRunner }   from '../components/soc/GrafanaVulnRunner';
import { GrafanaExportBar }    from '../components/soc/GrafanaExportBar';

import {
  getBankingKPIs,
  getSystemHealth,
  getThreatEvents,
  getBlockedIPs,
  getWafAlerts,
} from '../services/socService';

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

export function SOCDashboard() {
  const [metrics,     setMetrics]     = useState(null);
  const [health,      setHealth]      = useState(null);
  const [threats,     setThreats]     = useState([]);
  const [blocked,     setBlocked]     = useState([]);
  const [wafAlerts,   setWafAlerts]   = useState([]);

  const [loading,     setLoading]     = useState({ metrics: true, health: true, threats: true, blocked: true });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [paused,      setPaused]      = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const autoRef = useRef(autoRefresh);
  const pausedRef = useRef(paused);
  autoRef.current = autoRefresh;
  pausedRef.current = paused;

  // Global Spacebar keyboard shortcut listener to pause/resume threat feed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchAll = useCallback(async () => {
    if (pausedRef.current) return;
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

      setLoading({ metrics: false, health: false, threats: false, blocked: false });
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    document.title = "SentryVault SOC | Security Operations Console";
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const id = setInterval(() => {
      if (autoRef.current && !pausedRef.current) {
        fetchAll();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const systemStatus = health?.overall_status === 'ALL_GREEN' ? 'OPERATIONAL' : 'DEGRADED';

  return (
    <div className="grafana-dark min-h-screen">
      {/* 1. Grafana Dark Top Bar */}
      <GrafanaTopBar
        systemStatus={systemStatus}
        lastUpdated={lastUpdated}
        autoRefresh={autoRefresh}
        onToggleAuto={() => setAutoRefresh(p => !p)}
        onRefresh={fetchAll}
      />

      <main className="max-w-screen-2xl mx-auto px-4 py-4 space-y-3">
        {/* 2. SOC Metric Cards (Row of 4 with SVG sparklines) */}
        <GrafanaMetricCards
          metrics={metrics}
          wafCount={wafAlerts.length}
          loading={loading.metrics}
        />

        {/* 3. Infrastructure Heartbeat Strip with Micro-charts */}
        <GrafanaHeartbeat
          health={health}
          loading={loading.health}
        />

        {/* 4. Main Panel: Live Threat Event Stream */}
        <GrafanaThreatStream
          threats={threats}
          loading={loading.threats}
          paused={paused}
          onTogglePause={() => setPaused(p => !p)}
        />

        {/* 5. IP Quarantine Manager & Vulnerability Test Runner Side-by-Side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <GrafanaQuarantine
            blockedIPs={blocked}
            loading={loading.blocked}
            onRefresh={() => getBlockedIPs().then(r => setBlocked(r.data))}
          />

          <GrafanaVulnRunner
            onAttackFired={() => setTimeout(() => fetchAll(), 1500)}
          />
        </div>

        {/* 6. Scoped Export Bar */}
        <GrafanaExportBar
          activeCount={threats.length}
          onExport={format => exportData(threats, format, `soc_threats_${Date.now()}`)}
        />
      </main>
    </div>
  );
}
