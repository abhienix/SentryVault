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
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Banking Routes */}
          <Route path="/" element={<ProtectedLayout><DashboardRedirect /></ProtectedLayout>} />
          <Route path="/dashboard" element={<ProtectedLayout><DashboardRedirect /></ProtectedLayout>} />
          <Route path="/admin-dashboard" element={<ProtectedLayout><AdminDashboard /></ProtectedLayout>} />
          <Route path="/accounts" element={<ProtectedLayout><Accounts /></ProtectedLayout>} />
          <Route path="/transfer" element={<ProtectedLayout><Transfer /></ProtectedLayout>} />
          <Route path="/transactions" element={<ProtectedLayout><Transactions /></ProtectedLayout>} />
          <Route path="/beneficiaries" element={<ProtectedLayout><Beneficiaries /></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
          <Route path="/demo-console" element={<ProtectedLayout><DemoConsole /></ProtectedLayout>} />

          {/* 404 Route */}
          <Route path="*" element={<ProtectedLayout><NotFound /></ProtectedLayout>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
