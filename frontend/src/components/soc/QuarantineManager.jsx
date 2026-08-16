import React, { useState } from 'react';
import { Ban, ShieldOff, Plus, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { blockIP, unblockIP } from '../../services/socService';

function QuarantineModal({ onClose, onSuccess }) {
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleBlock = async () => {
    if (!ip.trim()) return setErr('IP address is required.');
    setLoading(true);
    setErr('');
    try {
      await blockIP(ip.trim(), reason || 'Manually quarantined via SOC Dashboard');
      onSuccess(`${ip.trim()} has been quarantined.`);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-700 overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/30">
              <Ban size={16} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Quarantine IP Address</h3>
              <p className="text-[10px] text-slate-400">Add to iptables blocklist + SOC DB</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-600 text-slate-400 hover:text-white transition">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              IP Address *
            </label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="e.g. 192.168.10.99"
              className="w-full px-3 py-2 rounded-lg border text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-red-400 transition"
              style={{ background: '#0f172a', borderColor: '#334155' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for quarantine..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-400 transition resize-none"
              style={{ background: '#0f172a', borderColor: '#334155' }}
            />
          </div>
          {err && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle size={13} /> {err}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-400 hover:text-white text-sm transition">
              Cancel
            </button>
            <button onClick={handleBlock} disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-bold text-white transition flex items-center justify-center gap-2"
              style={{ background: loading ? '#991b1b' : '#dc2626' }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
              {loading ? 'Quarantining...' : 'Quarantine IP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuarantineManager({ blockedIPs, loading, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [unblocking, setUnblocking] = useState(null);

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleUnblock = async (ip) => {
    setUnblocking(ip);
    try {
      await unblockIP(ip);
      showToast(`${ip} removed from quarantine.`);
      onRefresh();
    } catch (e) {
      showToast(`Error: ${e.response?.data?.detail || e.message}`);
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <>
      {showModal && (
        <QuarantineModal
          onClose={() => setShowModal(false)}
          onSuccess={msg => { showToast(msg); onRefresh(); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border border-green-500/30 text-green-400 text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)' }}>
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">IP Quarantine Manager</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {blockedIPs?.length ?? 0} active quarantine{blockedIPs?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition"
          style={{ background: '#dc2626', border: '1px solid #ef444460' }}>
          <Plus size={13} /> Quarantine IP
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: '#1e293b' }} />
          ))}
        </div>
      ) : !blockedIPs?.length ? (
        <div className="text-center py-10 text-slate-500">
          <ShieldOff size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No quarantined IPs.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {['IP Address', 'Reason', 'Blocked At', 'Source', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-700/60">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blockedIPs.map(b => (
                <tr key={b.id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors group">
                  <td className="px-3 py-2.5 font-mono text-red-400 font-bold whitespace-nowrap">
                    {b.ip_address}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 max-w-xs truncate">
                    {b.reason || '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap text-[10px]">
                    {new Date(b.blocked_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-700/60 text-slate-400">
                      {b.block_source || 'SOAR'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => handleUnblock(b.ip_address)}
                      disabled={unblocking === b.ip_address}
                      className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1 px-2 py-1 rounded border border-green-700 text-green-400 hover:bg-green-500/10 text-[10px] whitespace-nowrap">
                      {unblocking === b.ip_address
                        ? <Loader2 size={10} className="animate-spin" />
                        : <ShieldOff size={10} />}
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
