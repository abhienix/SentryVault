import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Landmark, LogOut, ShieldCheck, User } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const nowStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="bg-[#003366] text-white border-b-2 border-[#002244] shadow-md z-30">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white text-[#003366] p-1.5 rounded font-bold flex items-center justify-center shadow-sm">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-extrabold text-lg tracking-wider text-white">SENTRYVAULT BANK</span>
              <span className="text-[11px] font-semibold text-sky-200 bg-white/10 px-2 py-0.5 rounded border border-white/20">
                FINACLE CBS v10.2
              </span>
            </div>
            <p className="text-[11px] text-sky-100 font-medium">Core Banking Solution • Branch Code: SBIN0001234</p>
          </div>
        </div>

        {/* User Session Info & Action */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right text-xs">
            <span className="font-bold text-white flex items-center gap-1 justify-end">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {user?.full_name || 'Authorized Operator'} ({user?.role})
            </span>
            <span className="text-[11px] text-sky-200">
              CIF: 900{user?.id || 1}00234 • Session: {nowStr}
            </span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-[#0A4D8C] hover:bg-[#083C6C] text-white text-xs font-semibold px-3 py-1.5 rounded border border-sky-400/30 transition shadow-sm"
            title="End Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Sub-bar Indicator */}
      <div className="bg-[#002244] text-[11px] text-sky-200 px-4 py-1 border-t border-sky-900 flex justify-between items-center font-mono">
        <span>SYSTEM STATUS: ONLINE | DATABASE: SYNCED | ENCRYPTION: TLS 1.3</span>
        <span className="hidden md:inline">BANKING HOST: IN-MUM-CBS-01</span>
      </div>
    </header>
  );
};
