import React, { useState } from 'react';
import { Ban, ShieldOff, Plus, X, Loader2, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { blockIP, unblockIP } from '../../services/socService';

function ManualQuarantineModal({ onClose, onSuccess }) {
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleBlock = async () => {
    if (!ip.trim()) return setErr('IP address is required.');
    setLoading(true);
    setErr('');
    try {
      await blockIP(ip.trim(), reason || 'Manually quarantined via SOC Grafana Console');
      onSuccess(`${ip.trim()} added to active iptables DROP list.`);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#161b22] border border-[#2a2e37] rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e37] bg-[#0d1117]">
          <div className="flex items-center gap-2">
            <Ban size={16} className="text-[#f85149]" />
            <span className="font-mono text-xs font-bold text-[#f0f6fc]">MANUALLY QUARANTINE IP</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#8b949e] hover:text-[#f0f6fc]">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-3 font-mono text-xs">
          <div>
            <label className="block text-[10px] font-bold text-[#8b949e] mb-1">TARGET IP ADDRESS *</label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="192.168.10.99"
              className="w-full bg-[#0d1117] border border-[#2a2e37] rounded px-3 py-1.5 text-[#f0f6fc] focus:outline-none focus:border-[#f85149]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#8b949e] mb-1">REASON / INCIDENT ID</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Malicious payload probe"
              rows={2}
              className="w-full bg-[#0d1117] border border-[#2a2e37] rounded px-3 py-1.5 text-[#f0f6fc] focus:outline-none focus:border-[#f85149] resize-none font-sans"
            />
          </div>
          {err && (
            <div className="flex items-center gap-2 p-2 rounded bg-[#f85149]/15 border border-[#f85149]/30 text-[#f85149]">
              <AlertCircle size={14} /> {err}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-1.5 rounded border border-[#2a2e37] bg-[#0d1117] text-[#8b949e] hover:text-[#f0f6fc]"
            >
              CANCEL
            </button>
            <button
              onClick={handleBlock}
              disabled={loading}
              className="flex-1 py-1.5 rounded bg-[#f85149] hover:bg-[#da3633] text-white font-bold flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
              {loading ? 'EXECUTING...' : 'ENFORCE DROP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmUnblockModal({ ip, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(ip);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#161b22] border border-[#d29922]/50 rounded-lg shadow-2xl p-4 space-y-3 font-mono text-xs text-center">
        <AlertTriangle size={32} className="mx-auto text-[#d29922]" />
        <h4 className="font-bold text-[#f0f6fc]">CONFIRM IP UNBLOCK</h4>
        <p className="text-[#8b949e] text-[11px] font-sans">
          This will remove iptables DROP rule for <strong className="text-[#58a6ff]">{ip}</strong> and restore full network access.
        </p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 rounded border border-[#2a2e37] bg-[#0d1117] text-[#8b949e]"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-1.5 rounded bg-[#3fb950] hover:bg-[#2ea043] text-white font-bold flex items-center justify-center gap-1"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ShieldOff size={13} />}
            UNBLOCK IP
          </button>
        </div>
      </div>
    </div>
  );
}

export function GrafanaQuarantine({ blockedIPs, loading, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmUnblockIP, setConfirmUnblockIP] = useState(null);

  const handleUnblockConfirmed = async (ip) => {
    try {
      await unblockIP(ip);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {showAddModal && (
        <ManualQuarantineModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => onRefresh()}
        />
      )}

      {confirmUnblockIP && (
        <ConfirmUnblockModal
          ip={confirmUnblockIP}
          onClose={() => setConfirmUnblockIP(null)}
          onConfirm={handleUnblockConfirmed}
        />
      )}

      <div className="grafana-panel p-3">
        <div className="flex items-center justify-between mb-3 border-b border-[#2a2e37] pb-2">
          <div className="flex items-center gap-2">
            <Ban size={14} className="text-[#f0883e]" />
            <span className="grafana-panel-title">IP QUARANTINE MANAGER</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
              {blockedIPs?.length ?? 0} BLOCKED
            </span>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#f85149] hover:bg-[#da3633] text-white text-xs font-mono font-bold transition"
          >
            <Plus size={12} /> QUARANTINE IP
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 bg-[#0d1117] rounded animate-pulse" />
            ))}
          </div>
        ) : !blockedIPs?.length ? (
          <div className="text-center py-6 text-[#8b949e] font-mono text-xs">
            NO ACTIVE QUARANTINED IPS.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-64 grafana-scrollbar">
            <table className="w-full text-xs font-mono text-left border-collapse">
              <thead>
                <tr className="bg-[#0d1117] border-b border-[#2a2e37] text-[#8b949e] text-[10px] uppercase font-bold sticky top-0">
                  <th className="px-3 py-2">IP Address</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Blocked At</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2e37]/50">
                {blockedIPs.map(b => (
                  <tr key={b.id} className="hover:bg-[#1c2128] transition-colors">
                    <td className="px-3 py-2 text-[#f85149] font-bold whitespace-nowrap">
                      {b.ip_address}
                    </td>
                    <td className="px-3 py-2 text-[#8b949e] max-w-xs truncate font-sans">
                      {b.reason || '—'}
                    </td>
                    <td className="px-3 py-2 text-[#8b949e] whitespace-nowrap text-[10px]">
                      {new Date(b.blocked_at).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] text-[9px] border border-[#30363d]">
                        {b.block_source || 'SOAR'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => setConfirmUnblockIP(b.ip_address)}
                        className="px-2 py-0.5 rounded bg-[#3fb950]/15 text-[#3fb950] border border-[#3fb950]/40 hover:bg-[#3fb950]/25 text-[10px] font-bold transition"
                      >
                        UNBLOCK
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
