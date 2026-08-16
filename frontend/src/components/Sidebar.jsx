import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Wallet, Send, History, Users, User, Shield, FileText, Terminal } from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const navItems = isAdmin
    ? [
        { name: 'CBS Admin Operations',    path: '/admin-dashboard', icon: Shield,   code: 'ADM-01' },
        { name: 'SOC Command Center',       path: '/admin/soc',       icon: Terminal, code: 'SOC-02' },
        { name: 'All Accounts Inquiry',     path: '/accounts',        icon: Wallet,   code: 'ACC-03' },
        { name: 'System Transaction Ledger',path: '/transactions',    icon: History,  code: 'LDG-04' },
        { name: 'Operator Profile',         path: '/profile',         icon: User,     code: 'PRF-05' },
      ]
    : [
        { name: 'CBS Dashboard Overview', path: '/dashboard', icon: LayoutDashboard, code: 'INQ-01' },
        { name: 'Account Summary & Balance', path: '/accounts', icon: Wallet, code: 'ACC-02' },
        { name: 'Fund Transfer (IMPS/NEFT)', path: '/transfer', icon: Send, code: 'TRF-03' },
        { name: 'Account Statement & Ledger', path: '/transactions', icon: History, code: 'STMT-04' },
        { name: 'Beneficiary Directory', path: '/beneficiaries', icon: Users, code: 'BEN-05' },
        { name: 'Customer Profile & Security', path: '/profile', icon: User, code: 'PRF-06' },
      ];

  return (
    <aside className="w-64 bg-[#F4F6F8] border-r-2 border-slate-300 flex flex-col justify-between hidden md:flex shrink-0 min-h-[calc(100vh-4.5rem)]">
      <div className="p-3 space-y-1">
        <div className="px-3 py-1.5 bg-slate-200 border-l-4 border-[#003366] text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
          Finacle Menu Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded text-xs font-semibold border transition ${
                  isActive
                    ? 'bg-[#003366] text-white border-[#002244] shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </div>
              <span className="text-[10px] font-mono opacity-75">{item.code}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-300 bg-white">
        <div className="bg-slate-100 p-2.5 rounded border border-slate-300 text-[11px] text-slate-700">
          <p className="font-bold text-[#003366] mb-0.5">SentryVault Core Banking</p>
          <p className="text-[10px] text-slate-500 font-mono">FINACLE CBS MODULE • VER 10.2.18</p>
        </div>
      </div>
    </aside>
  );
};
