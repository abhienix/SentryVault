import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SOCDashboard } from './pages/SOCDashboard';
import { Accounts } from './pages/Accounts';
import { Transfer } from './pages/Transfer';
import { Transactions } from './pages/Transactions';
import { Beneficiaries } from './pages/Beneficiaries';
import { Profile } from './pages/Profile';
import { DemoConsole } from './pages/DemoConsole';
import { NotFound } from './pages/NotFound';
import { RefreshCw } from 'lucide-react';

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }
  return <Dashboard />;
};

const AdminOnly = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
};

const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bank-bg flex items-center justify-center text-slate-500 gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-bank-accent" />
        <span className="font-semibold text-sm">Authenticating Session...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-bank-bg">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Standalone Internal Security Operations Center (SOC) Application */}
          <Route path="/" element={<SOCDashboard />} />
          <Route path="/soc" element={<SOCDashboard />} />
          <Route path="/admin/soc" element={<SOCDashboard />} />

          {/* Fallback to SOC Dashboard */}
          <Route path="*" element={<SOCDashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
