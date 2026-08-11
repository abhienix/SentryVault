import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { TransactionTable } from '../components/TransactionTable';
import { Search, Filter, RefreshCw, Landmark, X } from 'lucide-react';

export const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (minAmount) params.append('min_amount', minAmount);
      if (maxAmount) params.append('max_amount', maxAmount);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const [txRes, accRes] = await Promise.all([
        api.get(`/transactions/search?${params.toString()}`),
        api.get('/accounts/')
      ]);

      setTransactions(txRes.data);
      setAccounts(accRes.data);
    } catch (err) {
      console.error("Fetch transactions error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
    api.get('/transactions/history?limit=100').then(res => setTransactions(res.data));
  };

  const userAccountIds = accounts.map(a => a.id);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border-2 border-slate-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#003366] tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            <span>Finacle Account Ledger & Statement Inquiry</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">Historical ledger records of debits and credits</p>
        </div>
        <button
          onClick={handleResetFilters}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold rounded transition flex items-center gap-1 self-start sm:self-auto"
        >
          <X className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Finacle Inquiry Filter Bar */}
      <form onSubmit={handleApplyFilters} className="bg-white p-4 rounded border-2 border-slate-300 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-semibold">
          <div>
            <label className="block text-slate-600 uppercase mb-1">Txn Ref / Particulars</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="TXN Ref or description..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-[#003366]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 uppercase mb-1">From Value Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div>
            <label className="block text-slate-600 uppercase mb-1">To Value Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div>
            <label className="block text-slate-600 uppercase mb-1">Min Amount (₹)</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:bg-white focus:outline-none focus:border-[#003366]"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded shadow transition flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Execute Ledger Search</span>
          </button>
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-[#003366]" />
          <span className="font-semibold text-xs">Querying Statement Ledger...</span>
        </div>
      ) : (
        <TransactionTable transactions={transactions} userAccountIds={userAccountIds} />
      )}
    </div>
  );
};
