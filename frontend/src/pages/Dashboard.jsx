import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { TransactionTable } from '../components/TransactionTable';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Wallet, CreditCard, Send, ArrowUpRight, Bell, ShieldCheck, RefreshCw, FileText, Landmark } from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [accRes, txRes, notifRes] = await Promise.all([
        api.get('/accounts/'),
        api.get('/transactions/history?limit=5'),
        api.get('/notifications/')
      ]);
      setAccounts(accRes.data);
      setTransactions(txRes.data);
      setNotifications(notifRes.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const primaryAccount = accounts.length > 0 ? accounts[0] : null;
  const userAccountIds = accounts.map(a => a.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#003366]" />
        <span className="font-semibold text-xs">Querying Finacle CBS Host Database...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Finacle Header Banner */}
      <div className="bg-white rounded border-2 border-slate-300 shadow-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#003366]" />
            <h2 className="text-xl font-bold text-[#003366] tracking-tight">
              CBS Account Overview — {user?.full_name}
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Primary Operating Account: <span className="font-mono font-bold text-slate-900">{primaryAccount?.account_number || 'N/A'}</span> ({primaryAccount?.account_type || 'SAVINGS'} • IFSC: {primaryAccount?.ifsc_code})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/transfer"
            className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white font-semibold rounded text-xs shadow transition flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Initiate Fund Transfer</span>
          </Link>
        </div>
      </div>

      {/* Finacle Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Net Ledger Balance"
          value={`₹${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          subtext={`Linked Accounts: ${accounts.length}`}
        />
        <StatCard
          title="Primary Savings Account"
          value={`₹${(primaryAccount?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={CreditCard}
          subtext={`A/c No: ${primaryAccount?.account_number || 'N/A'}`}
        />
        <StatCard
          title="CBS Security Verification"
          value="AUTHENTICATED"
          icon={ShieldCheck}
          subtext="256-Bit TLS Cipher Active"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Ledger Inquiry */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between bg-slate-200 px-3 py-1.5 rounded border border-slate-300">
            <h3 className="font-bold text-[#003366] text-xs uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#003366]" />
              <span>Recent Transaction Records (Last 5 Entries)</span>
            </h3>
            <Link to="/transactions" className="text-xs font-bold text-[#003366] hover:underline flex items-center gap-1">
              <span>Full Ledger Statement</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <TransactionTable transactions={transactions} userAccountIds={userAccountIds} />
        </div>

        {/* System Advisories & Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-200 px-3 py-1.5 rounded border border-slate-300">
            <h3 className="font-bold text-[#003366] text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-[#003366]" />
              <span>CBS Advisories & Alerts</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-300">
              {notifications.length} Total
            </span>
          </div>

          <div className="bg-white rounded border-2 border-slate-300 p-3 space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No pending CBS advisories.</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 rounded border border-slate-300 bg-slate-50 text-xs space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-[#003366]">{notif.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-snug">{notif.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
