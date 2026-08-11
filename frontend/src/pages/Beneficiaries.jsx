import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { Users, UserPlus, Trash2, Landmark, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const Beneficiaries = () => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New beneficiary form
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('SentryVault Bank');
  const [ifscCode, setIfscCode] = useState('SBIN0001234');
  const [nickname, setNickname] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchBeneficiaries = () => {
    setLoading(true);
    api.get('/beneficiaries/')
      .then(res => setBeneficiaries(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/beneficiaries/', {
        name,
        account_number: accountNumber,
        bank_name: bankName,
        ifsc_code: ifscCode,
        nickname
      });
      setIsModalOpen(false);
      setName('');
      setAccountNumber('');
      setNickname('');
      fetchBeneficiaries();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add beneficiary.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBeneficiary = async (id) => {
    if (!window.confirm("Are you sure you want to remove this beneficiary record?")) return;
    try {
      await api.delete(`/beneficiaries/${id}`);
      fetchBeneficiaries();
    } catch (err) {
      alert("Failed to delete beneficiary.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#003366]" />
        <span className="font-semibold text-xs">Querying Beneficiary Master...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border-2 border-slate-300 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#003366] tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            <span>Finacle Beneficiary Account Directory</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">Pre-validated accounts for instant remittance</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded shadow transition flex items-center gap-1.5 uppercase tracking-wider"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Beneficiary</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {beneficiaries.map((b) => (
          <div key={b.id} className="bg-white rounded border-2 border-slate-300 shadow-sm p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-900 text-sm">{b.name}</span>
                {b.nickname && (
                  <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-300">
                    {b.nickname}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono font-bold text-[#003366] mt-1">A/c: {b.account_number}</p>
              <p className="text-xs text-slate-600 mt-0.5">{b.bank_name} • {b.ifsc_code}</p>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-[10px] text-slate-500 font-mono">
                ADDED: {new Date(b.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={() => handleDeleteBeneficiary(b.id)}
                className="p-1 text-slate-400 hover:text-rose-700 transition"
                title="Delete Record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Beneficiary Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Beneficiary Record">
        <form onSubmit={handleAddBeneficiary} className="space-y-3 text-xs font-semibold">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 uppercase tracking-wider mb-1">Beneficiary Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold focus:bg-white focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div>
            <label className="block text-slate-700 uppercase tracking-wider mb-1">Account Number</label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 3090001005"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div>
            <label className="block text-slate-700 uppercase tracking-wider mb-1">Bank Name</label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold focus:bg-white focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div>
            <label className="block text-slate-700 uppercase tracking-wider mb-1">IFSC Branch Code</label>
            <input
              type="text"
              required
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div>
            <label className="block text-slate-700 uppercase tracking-wider mb-1">Internal Alias / Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Office Rent"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-bold focus:bg-white focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-1/2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-1/2 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded transition"
            >
              {submitting ? 'Registering Record...' : 'Save Beneficiary'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
