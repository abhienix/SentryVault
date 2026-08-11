import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { StatCard } from '../components/StatCard';
import { Shield, Users, Wallet, CheckCircle2, Lock, AlertCircle, RefreshCw, Search, Building2, UserX, UserCheck, Landmark } from 'lucide-react';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    setMsg('');
    setErr('');
    try {
      const [statsRes, accRes, usersRes, auditRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/accounts'),
        api.get('/admin/users'),
        api.get('/admin/audit-logs')
      ]);
      setStats(statsRes.data);
      setAccounts(accRes.data);
      setUsers(usersRes.data);
      setAuditLogs(auditRes.data);
    } catch (e) {
      console.error(e);
      setErr("Failed to load admin management data. Ensure you have ADMIN role privileges.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleAccountStatusChange = async (accountId, newStatus) => {
    setMsg('');
    setErr('');
    try {
      const res = await api.put(`/admin/accounts/${accountId}/status`, { status: newStatus });
      setMsg(res.data.message);
      fetchAdminData();
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to update account status");
    }
  };

  const handleUserStatusToggle = async (userId, currentActive) => {
    setMsg('');
    setErr('');
    try {
      const res = await api.put(`/admin/users/${userId}/status`, { is_active: !currentActive });
      setMsg(res.data.message);
      fetchAdminData();
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to update user active status");
    }
  };

  const filteredAccounts = accounts.filter(acc => 
    acc.account_number.includes(searchQuery) ||
    acc.owner.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.owner.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#003366]" />
        <span className="font-semibold text-xs">Querying Finacle System Administrator Module...</span>
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
              Finacle CBS Administrator & Operations Console
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            System-wide Customer Account Approvals, Status Management, and Compliance Oversight
          </p>
        </div>
        <button
          onClick={fetchAdminData}
          className="px-3.5 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded border border-[#001122] transition flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Operations</span>
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}
      {err && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* Finacle Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bank Vault Deposits"
          value={`₹${(stats?.total_deposits || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          subtext="Cumulative Customer Holdings"
        />
        <StatCard
          title="Total Registered Customers"
          value={stats?.total_customers || 0}
          icon={Users}
          subtext={`${stats?.total_accounts || 0} Total Bank Accounts`}
        />
        <StatCard
          title="Active Customer Accounts"
          value={stats?.active_accounts || 0}
          icon={CheckCircle2}
          subtext="Fully Operational Accounts"
        />
        <StatCard
          title="Frozen / Suspended Accounts"
          value={stats?.frozen_accounts || 0}
          icon={Lock}
          subtext="Requires Admin Review"
        />
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b-2 border-slate-300 gap-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'accounts'
              ? 'border-[#003366] text-[#003366] font-bold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Customer Accounts Directory ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'users'
              ? 'border-[#003366] text-[#003366] font-bold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          User Directory ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 px-4 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-[#003366] text-[#003366] font-bold bg-white'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          CBS System Audit Log
        </button>
      </div>

      {/* Tab 1: All Customer Accounts Management */}
      {activeTab === 'accounts' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-bold text-[#003366] text-xs uppercase tracking-wider">Account Status & Approval Management Grid</h3>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search account no or customer..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-[#003366]"
              />
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded border-2 border-slate-300 shadow-sm">
            <table className="w-full text-left text-xs text-slate-800 border-collapse">
              <thead className="bg-[#003366] text-white text-[11px] font-bold uppercase border-b-2 border-[#001122]">
                <tr>
                  <th className="px-4 py-2 border-r border-sky-900">Customer Name</th>
                  <th className="px-4 py-2 border-r border-sky-900">Account No.</th>
                  <th className="px-4 py-2 border-r border-sky-900">Type / IFSC</th>
                  <th className="px-4 py-2 border-r border-sky-900 text-right">Balance (₹)</th>
                  <th className="px-4 py-2 border-r border-sky-900">Status</th>
                  <th className="px-4 py-2 text-center">Admin Approval Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAccounts.map((acc, idx) => (
                  <tr key={acc.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-2 border-r border-slate-200">
                      <p className="font-bold text-slate-900">{acc.owner.full_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">@{acc.owner.username} • {acc.owner.email}</p>
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200 font-mono font-bold text-slate-900">
                      {acc.account_number}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200 text-xs">
                      <span className="font-bold text-slate-800 block">{acc.account_type}</span>
                      <span className="font-mono text-[10px] text-slate-500">{acc.ifsc_code}</span>
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                      ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        acc.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : acc.status === 'FROZEN'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[11px]">
                        {acc.status !== 'ACTIVE' && (
                          <button
                            onClick={() => handleAccountStatusChange(acc.id, 'ACTIVE')}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded shadow-sm transition"
                          >
                            Approve / Activate
                          </button>
                        )}
                        {acc.status !== 'FROZEN' && (
                          <button
                            onClick={() => handleAccountStatusChange(acc.id, 'FROZEN')}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-sm transition"
                          >
                            Freeze Account
                          </button>
                        )}
                        {acc.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleAccountStatusChange(acc.id, 'CLOSED')}
                            className="px-2 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded shadow-sm transition"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: User Directory */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <h3 className="font-bold text-[#003366] text-xs uppercase tracking-wider">Customer Directory & Access Controls</h3>
          <div className="overflow-x-auto bg-white rounded border-2 border-slate-300 shadow-sm">
            <table className="w-full text-left text-xs text-slate-800 border-collapse">
              <thead className="bg-[#003366] text-white text-[11px] font-bold uppercase border-b-2 border-[#001122]">
                <tr>
                  <th className="px-4 py-2 border-r border-sky-900">User Name</th>
                  <th className="px-4 py-2 border-r border-sky-900">Contact Details</th>
                  <th className="px-4 py-2 border-r border-sky-900">Role</th>
                  <th className="px-4 py-2 border-r border-sky-900">Accounts</th>
                  <th className="px-4 py-2 border-r border-sky-900">Status</th>
                  <th className="px-4 py-2 text-center">CBS Operator Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u, idx) => (
                  <tr key={u.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-2 border-r border-slate-200">
                      <p className="font-bold text-slate-900">{u.full_name}</p>
                      <p className="text-[10px] font-mono text-slate-500">@{u.username}</p>
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200 text-xs">
                      <p className="font-mono">{u.email}</p>
                      <p className="text-slate-500">{u.phone || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200 font-bold">
                      {u.accounts_count} Accounts
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        u.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleUserStatusToggle(u.id, u.is_active)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center justify-center gap-1 mx-auto ${
                          u.is_active
                            ? 'bg-slate-200 text-rose-800 hover:bg-rose-100 border border-slate-300'
                            : 'bg-emerald-700 text-white hover:bg-emerald-800'
                        }`}
                      >
                        {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        <span>{u.is_active ? 'Suspend User' : 'Enable User'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: System Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <h3 className="font-bold text-[#003366] text-xs uppercase tracking-wider">CBS System Operations Audit Trail</h3>
          <div className="overflow-x-auto bg-white rounded border-2 border-slate-300 shadow-sm">
            <table className="w-full text-left text-xs text-slate-800 border-collapse">
              <thead className="bg-[#003366] text-white text-[10px] font-bold uppercase border-b-2 border-[#001122]">
                <tr>
                  <th className="px-4 py-2 border-r border-sky-900">Timestamp</th>
                  <th className="px-4 py-2 border-r border-sky-900">Action Code</th>
                  <th className="px-4 py-2 border-r border-sky-900">Terminal IP</th>
                  <th className="px-4 py-2">Operation Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {auditLogs.map((log, idx) => (
                  <tr key={log.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-2 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200 font-bold text-[#003366]">{log.action}</td>
                    <td className="px-4 py-2 border-r border-slate-200 text-slate-600">{log.ip_address || '127.0.0.1'}</td>
                    <td className="px-4 py-2 font-sans text-slate-800">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
