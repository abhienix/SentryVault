import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Landmark, CreditCard, Building2, CheckCircle2, RefreshCw, Copy, Check } from 'lucide-react';

export const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedAcc, setCopiedAcc] = useState(null);

  useEffect(() => {
    api.get('/accounts/')
      .then(res => setAccounts(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedAcc(id);
    setTimeout(() => setCopiedAcc(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#003366]" />
        <span className="font-semibold text-xs">Retrieving Account Records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded border-2 border-slate-300 p-4 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#003366] tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            <span>Finacle Account Master Directory</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">Comprehensive listing of operating savings and current accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white rounded border-2 border-slate-300 shadow-sm overflow-hidden flex flex-col justify-between"
          >
            {/* Header */}
            <div className="bg-[#003366] p-4 text-white border-b-2 border-[#001122]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded border border-white/20">
                  {acc.account_type} ACCOUNT
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  STATUS: {acc.status}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[11px] text-sky-200 uppercase font-semibold">Available Ledger Balance</p>
                <h3 className="text-2xl font-extrabold font-mono tracking-tight mt-0.5 text-white">
                  ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {acc.currency}
                </h3>
              </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-2.5 bg-slate-50 text-xs text-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-600 uppercase text-[11px]">Account Number</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-900 text-sm">{acc.account_number}</span>
                  <button
                    onClick={() => copyToClipboard(acc.account_number, acc.id)}
                    className="p-1 text-slate-400 hover:text-[#003366] rounded transition"
                    title="Copy Account Number"
                  >
                    {copiedAcc === acc.id ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-600 uppercase text-[11px]">IFSC Branch Code</span>
                <span className="font-mono font-bold text-slate-800">{acc.ifsc_code}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-600 uppercase text-[11px]">Home Branch</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {acc.branch_name}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600 uppercase text-[11px]">A/c Opening Date</span>
                <span className="font-mono text-slate-600 text-[11px]">
                  {new Date(acc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
