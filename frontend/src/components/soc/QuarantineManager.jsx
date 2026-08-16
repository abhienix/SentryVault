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
      onSuccess(`${ip.trim()} quarantined in iptables & PostgreSQL.`);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 border border-red-200 text-red-600">
              <Ban size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Quarantine IP Address</h3>
              <p className="text-xs text-slate-500">Adds iptables DROP rule & logs to PostgreSQL</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:text-slate-900 transition">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              IP Address *
            </label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="e.g. 192.168.10.99"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for quarantine..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition resize-none bg-white"
            />
          </div>
          {err && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={14} /> {err}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleBlock}
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-sm"
            >
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
      showToast(`${ip} unblocked from iptables.`);
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

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-lg text-xs font-semibold border border-slate-800">
          <CheckCircle size={15} className="text-emerald-400" /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            IP Quarantine Manager
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {blockedIPs?.length ?? 0} active quarantine{blockedIPs?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm"
        >
          <Plus size={14} /> Quarantine IP
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !blockedIPs?.length ? (
        <div className="text-center py-8 text-slate-400">
          <ShieldOff size={32} className="mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold text-slate-500">No quarantined IPs.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-left">
                {['IP Address', 'Reason', 'Blocked At', 'Source', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {blockedIPs.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-3 py-2.5 font-mono font-bold text-red-600 whitespace-nowrap">
                    {b.ip_address}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">
                    {b.reason || '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-400 whitespace-nowrap text-[10px]">
                    {new Date(b.blocked_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {b.block_source || 'SOAR'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => handleUnblock(b.ip_address)}
                      disabled={unblocking === b.ip_address}
                      className="opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-1 px-2.5 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-[10px] font-bold"
                    >
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
