import React from 'react';
import { CheckCircle } from 'lucide-react';

export const TransactionTable = ({ transactions = [], userAccountIds = [] }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 bg-white rounded border border-slate-300">
        <p className="text-xs font-semibold">No CBS transaction records retrieved for this query.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded border-2 border-slate-300 shadow-sm">
      <table className="w-full text-left text-xs text-slate-800 border-collapse">
        <thead className="bg-[#003366] text-white text-[11px] font-bold uppercase border-b-2 border-[#001122]">
          <tr>
            <th className="px-4 py-2 border-r border-sky-900">Type</th>
            <th className="px-4 py-2 border-r border-sky-900">Txn Reference No.</th>
            <th className="px-4 py-2 border-r border-sky-900">Remarks / Particulars</th>
            <th className="px-4 py-2 border-r border-sky-900">Value Date</th>
            <th className="px-4 py-2 border-r border-sky-900">Status</th>
            <th className="px-4 py-2 text-right">Amount (INR ₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 font-sans">
          {transactions.map((tx, idx) => {
            const isOutgoing = userAccountIds.includes(tx.source_account_id);
            const isIncoming = userAccountIds.includes(tx.target_account_id);
            
            let sign = "Dr ";
            let textColor = "text-rose-700 font-bold";

            if (isIncoming && !isOutgoing) {
              sign = "Cr ";
              textColor = "text-emerald-700 font-bold";
            } else if (tx.transaction_type === "DEPOSIT") {
              sign = "Cr ";
              textColor = "text-emerald-700 font-bold";
            }

            const formattedDate = new Date(tx.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <tr key={tx.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-4 py-2 border-r border-slate-200 font-bold text-slate-900">
                  {tx.transaction_type}
                </td>
                <td className="px-4 py-2 border-r border-slate-200 font-mono text-[11px] font-bold text-slate-800">
                  {tx.transaction_ref}
                </td>
                <td className="px-4 py-2 border-r border-slate-200 text-slate-800 font-medium">
                  {tx.description || 'N/A'}
                </td>
                <td className="px-4 py-2 border-r border-slate-200 text-[11px] text-slate-600 font-mono">
                  {formattedDate}
                </td>
                <td className="px-4 py-2 border-r border-slate-200">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle className="w-3 h-3" />
                    {tx.status}
                  </span>
                </td>
                <td className={`px-4 py-2 text-right font-mono font-bold ${textColor}`}>
                  {sign}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
