import React, { useState } from 'react';
import { Zap, Loader2, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';
import { triggerDemoAttack } from '../../services/socService';

const ATTACKS = [
  {
    id: 'sqli',
    name: 'SQL INJECTION PROBE',
    desc: "GET /demo/sqli?id=1' UNION SELECT NULL--",
    tag: 'SQLI',
  },
  {
    id: 'xss',
    name: 'REFLECTED XSS PAYLOAD',
    desc: 'GET /demo/xss?msg=<script>alert(1)</script>',
    tag: 'XSS',
  },
  {
    id: 'path',
    name: 'PATH TRAVERSAL (LFI)',
    desc: 'GET /demo/path-traversal?file=../../../../etc/passwd',
    tag: 'LFI',
  },
  {
    id: 'brute',
    name: 'AUTH BRUTE FORCE BURST',
    desc: 'POST /demo/brute-force (5 rapid requests)',
    tag: 'BRUTE',
  },
];

export function GrafanaVulnRunner({ onAttackFired }) {
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});

  const handleFire = async (attack) => {
    if (attack.id === 'brute') {
      setLoading(prev => ({ ...prev, brute: true }));
      const fires = await Promise.all(
        Array.from({ length: 5 }, () => triggerDemoAttack('brute'))
      );
      const last = fires[fires.length - 1];
      setResults(prev => ({ ...prev, brute: { ...last, time: new Date() } }));
      setLoading(prev => ({ ...prev, brute: false }));
    } else {
      setLoading(prev => ({ ...prev, [attack.id]: true }));
      const r = await triggerDemoAttack(attack.id);
      setResults(prev => ({ ...prev, [attack.id]: { ...r, time: new Date() } }));
      setLoading(prev => ({ ...prev, [attack.id]: false }));
    }
    onAttackFired?.();
  };

  return (
    <div className="grafana-panel p-3 font-mono">
      <div className="flex items-center justify-between mb-3 border-b border-[#2a2e37] pb-2">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-[#a371f7]" />
          <span className="grafana-panel-title">VULNERABILITY TEST RUNNER (VALIDATION LAB)</span>
        </div>
        <span className="text-[10px] text-[#8b949e]">REQUIRES DEMO_MODE=TRUE</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ATTACKS.map(attack => {
          const res = results[attack.id];
          const isRunning = loading[attack.id];
          const isBlocked = res?.blocked || res?.status === 403;

          return (
            <div key={attack.id} className="bg-[#0d1117] border border-[#2a2e37] rounded p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#f0f6fc]">{attack.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#a371f7] border border-[#30363d]">
                    {attack.tag}
                  </span>
                </div>
                <p className="text-[10px] text-[#8b949e] truncate mb-2 font-sans">{attack.desc}</p>
              </div>

              {/* Action Button & Inline Validation Result */}
              <div>
                <button
                  onClick={() => handleFire(attack)}
                  disabled={isRunning}
                  className="w-full py-1 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-bold text-[#c9d1d9] flex items-center justify-center gap-1.5 transition"
                >
                  {isRunning ? <Loader2 size={12} className="animate-spin text-[#58a6ff]" /> : <Zap size={12} className="text-[#f0883e]" />}
                  {isRunning ? 'EXECUTING PAYLOAD...' : 'FIRE TEST PAYLOAD'}
                </button>

                {res && (
                  <div className={`mt-2 p-2 rounded border text-[10px] flex items-start gap-2 ${
                    isBlocked
                      ? 'bg-[#3fb950]/10 border-[#3fb950]/40 text-[#3fb950]'
                      : 'bg-[#f85149]/10 border-[#f85149]/40 text-[#f85149]'
                  }`}>
                    {isBlocked ? <CheckCircle2 size={14} className="shrink-0 text-[#3fb950]" /> : <AlertTriangle size={14} className="shrink-0 text-[#f85149]" />}
                    <div>
                      <p className="font-bold">
                        {isBlocked ? `PASS: HTTP 403 — BLOCKED BY CORAZA WAF` : `FAIL: HTTP ${res.status} — REACHED BACKEND`}
                      </p>
                      <p className="text-[9px] text-[#8b949e] font-sans">
                        Timestamp: {res.time?.toLocaleTimeString()} · Logged in Threat Stream
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
