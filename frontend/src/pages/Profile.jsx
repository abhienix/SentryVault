import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { User, ShieldCheck, Key, Lock, CheckCircle2, AlertCircle, RefreshCw, FileText, Landmark } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');
  const [passSubmitting, setPassSubmitting] = useState(false);

  useEffect(() => {
    api.get('/profile/audit-logs')
      .then(res => setAuditLogs(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassMsg('');
    setPassErr('');

    if (newPassword !== confirmPassword) {
      setPassErr("New password confirmation does not match.");
      return;
    }

    setPassSubmitting(true);

    try {
      const res = await api.put('/profile/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setPassMsg(res.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassErr(err.response?.data?.detail || "Failed to update password.");
    } finally {
      setPassSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#003366]" />
        <span className="font-semibold text-xs">Querying Profile Security Master...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="bg-white rounded border-2 border-slate-300 p-4 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#003366] tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            <span>Finacle Operator Profile & Security Master</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">Operator details, credentials, and CBS security audit trail</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Profile Card */}
        <div className="bg-white rounded border-2 border-slate-300 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="bg-[#003366] p-4 text-white border-b-2 border-[#001122]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white text-[#003366] font-bold rounded flex items-center justify-center text-lg shadow">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="font-extrabold text-base">{user?.full_name}</h3>
                <p className="text-xs text-sky-200 font-mono">Operator ID: {user?.username}</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2.5 bg-slate-50 text-xs text-slate-800">
            <div className="flex justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-600 uppercase text-[11px]">System Role</span>
              <span className="font-bold text-[#003366]">{user?.role}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-600 uppercase text-[11px]">Email Address</span>
              <span className="font-mono font-bold">{user?.email}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-600 uppercase text-[11px]">Registered Mobile</span>
              <span className="font-mono">{user?.phone || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-600 uppercase text-[11px]">CIF Creation Date</span>
              <span className="font-mono">{new Date(user?.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded border-2 border-slate-300 shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-[#003366] text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <Key className="w-4 h-4 text-[#003366]" />
            <span>Update CBS Password Credentials</span>
          </h3>

          {passMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passMsg}</span>
            </div>
          )}
          {passErr && (
            <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 rounded text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passErr}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3 text-xs font-semibold">
            <div>
              <label className="block text-slate-700 uppercase mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#003366]"
              />
            </div>
            <div>
              <label className="block text-slate-700 uppercase mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#003366]"
              />
            </div>
            <div>
              <label className="block text-slate-700 uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#003366]"
              />
            </div>

            <button
              type="submit"
              disabled={passSubmitting}
              className="w-full py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded text-xs shadow transition uppercase tracking-wider"
            >
              {passSubmitting ? 'Updating Credentials...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Audit Log */}
      <div className="space-y-2">
        <h3 className="font-bold text-[#003366] text-xs uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-[#003366]" />
          <span>Operator Security Audit Log (Last 10 Actions)</span>
        </h3>
        <div className="overflow-x-auto bg-white rounded border-2 border-slate-300 shadow-sm">
          <table className="w-full text-left text-xs text-slate-800 border-collapse font-mono">
            <thead className="bg-[#003366] text-white text-[10px] font-bold uppercase border-b-2 border-[#001122]">
              <tr>
                <th className="px-4 py-2 border-r border-sky-900">Timestamp</th>
                <th className="px-4 py-2 border-r border-sky-900">Action</th>
                <th className="px-4 py-2 border-r border-sky-900">IP Address</th>
                <th className="px-4 py-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
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
    </div>
  );
};
