import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Shield, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setSubmitted(true); // Don't expose whether email exists
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bank-navy flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-bank-navy via-slate-900 to-bank-blue p-6 text-white text-center border-b border-slate-700">
          <div className="w-10 h-10 bg-bank-accent text-white rounded-xl mx-auto flex items-center justify-center mb-2 shadow-lg">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Reset Account Password</h1>
          <p className="text-slate-300 text-xs mt-0.5">Secure password recovery workflow</p>
        </div>

        <div className="p-8 space-y-6">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Instructions Dispatched</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an account with email <span className="font-semibold text-slate-800">{email}</span> exists in our database, a secure password reset link has been dispatched to your inbox.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-bank-accent hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Registered Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-bank-border rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-bank-accent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-bank-blue hover:bg-bank-hover text-white font-semibold rounded-xl text-sm shadow-md transition"
              >
                {loading ? 'Processing...' : 'Send Password Reset Link'}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
