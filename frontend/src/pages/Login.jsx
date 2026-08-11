import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Landmark, Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Invalid Operator ID or credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center items-center px-4 py-8">
      {/* Top Bank Header */}
      <div className="w-full max-w-md mb-4 text-center">
        <div className="inline-flex items-center gap-2 bg-[#003366] text-white px-4 py-2 rounded-t border-b-2 border-sky-400">
          <Landmark className="w-6 h-6" />
          <span className="font-extrabold text-lg tracking-wider">SENTRYVAULT BANK</span>
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded border-2 border-slate-300 shadow-lg overflow-hidden">
        {/* Header Banner */}
        <div className="bg-[#003366] p-6 text-white text-center border-b-2 border-sky-900">
          <h1 className="text-lg font-extrabold uppercase tracking-wider">Finacle e-Banking Gateway</h1>
          <p className="text-sky-200 text-xs mt-1 font-mono">CBS OPERATOR & CUSTOMER ACCESS PORTAL</p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-slate-700 uppercase tracking-wider mb-1">User ID / Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter User ID (e.g. abhimanyu)"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded font-mono text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#003366] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-slate-700 uppercase tracking-wider">Password / PIN</label>
                <Link to="/forgot-password" className="text-xs font-bold text-[#003366] hover:underline">
                  Forgot Credentials?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded font-mono text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#003366] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded text-xs shadow transition flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              {loading ? 'Authenticating CBS Session...' : (
                <>
                  <span>Sign In to Finacle CBS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-200 text-center text-[11px] text-slate-500 font-medium">
            New Customer Account?{' '}
            <Link to="/register" className="text-[#003366] font-bold hover:underline">
              Self-Register Online
            </Link>
          </div>
        </div>

        {/* Footer Security Seal */}
        <div className="bg-slate-100 p-3 text-center border-t border-slate-300 text-[10px] text-slate-600 font-mono flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>FINACLE CBS VER 10.2 • 256-BIT ENCRYPTION • SECURED</span>
        </div>
      </div>
    </div>
  );
};
