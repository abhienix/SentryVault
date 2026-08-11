import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Modal } from '../components/Modal';
import { Send, CheckCircle2, ShieldCheck, AlertCircle, ArrowRight, RefreshCw, Landmark } from 'lucide-react';

export const Transfer = () => {
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [sourceAccount, setSourceAccount] = useState('');
  const [transferMode, setTransferMode] = useState('beneficiary'); // 'beneficiary' or 'manual'
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [manualAccount, setManualAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Confirmation & PIN Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionPin, setTransactionPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successTx, setSuccessTx] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/accounts/'), api.get('/beneficiaries/')])
      .then(([accRes, benRes]) => {
        setAccounts(accRes.data);
        setBeneficiaries(benRes.data);
        if (accRes.data.length > 0) {
          setSourceAccount(accRes.data[0].account_number);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleBeneficiarySelect = (bId) => {
    setSelectedBeneficiary(bId);
    const b = beneficiaries.find(item => item.id.toString() === bId.toString());
    if (b) {
      setManualAccount(b.account_number);
    }
  };

  const handleInitiateTransfer = (e) => {
    e.preventDefault();
    setError('');

    const targetAcc = manualAccount;

    if (!sourceAccount) {
      setError("Please select a valid debit source account.");
      return;
    }
    if (!targetAcc) {
      setError("Please specify a target beneficiary account number.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid positive transfer amount.");
      return;
    }

    const srcObj = accounts.find(a => a.account_number === sourceAccount);
    if (srcObj && parseFloat(amount) > srcObj.balance) {
      setError(`Insufficient available balance. Ledger balance: ₹${srcObj.balance.toFixed(2)}`);
      return;
    }

    setIsModalOpen(true);
  };

  const handleConfirmTransfer = async () => {
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/transactions/transfer', {
        source_account_number: sourceAccount,
        target_account_number: manualAccount,
        amount: parseFloat(amount),
        description: description || 'Finacle CBS Fund Transfer'
      });
      setSuccessTx(res.data);
      setIsModalOpen(false);
      
      // Reset form
      setAmount('');
      setDescription('');
      setTransactionPin('');
      
      // Refresh balances
      const accRes = await api.get('/accounts/');
      setAccounts(accRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Transaction processing failed. Check account status.');
      setIsModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#003366]" />
        <span className="font-semibold text-xs">Initializing Finacle Transfer Module...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="bg-white rounded border-2 border-slate-300 p-4 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#003366] tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5" />
            <span>Finacle Interbank / Intrabank Fund Transfer</span>
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">Instant IMPS / NEFT Transfer Channel</p>
        </div>
      </div>

      {successTx ? (
        <div className="bg-white rounded border-2 border-slate-300 p-6 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full mx-auto flex items-center justify-center border border-emerald-300">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Transaction Executed Successfully!</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">CBS Ref No: {successTx.transaction_ref}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-300 text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-600 font-bold uppercase">Amount Debited:</span>
              <span className="font-bold text-slate-900 font-mono">₹{successTx.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-bold uppercase">Credited Account:</span>
              <span className="font-mono font-bold text-slate-800">{manualAccount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-bold uppercase">Processing Mode:</span>
              <span className="font-bold text-emerald-700">IMPS REALTIME</span>
            </div>
          </div>

          <button
            onClick={() => setSuccessTx(null)}
            className="w-full py-2.5 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded text-xs shadow transition uppercase tracking-wider"
          >
            Initiate New Transfer
          </button>
        </div>
      ) : (
        <div className="bg-white rounded border-2 border-slate-300 shadow-sm overflow-hidden">
          <div className="bg-[#003366] p-3 text-white border-b border-sky-900">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>CBS Encrypted Fund Transfer Entry</span>
            </div>
          </div>

          <form onSubmit={handleInitiateTransfer} className="p-5 space-y-4 text-xs font-semibold">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Source Account */}
            <div>
              <label className="block text-slate-700 uppercase tracking-wider mb-1">Debit From Account</label>
              <select
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#003366]"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.account_number}>
                    {acc.account_type} - {acc.account_number} (Avail Bal: ₹{acc.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Selection Mode */}
            <div>
              <label className="block text-slate-700 uppercase tracking-wider mb-1.5">Recipient Selection Mode</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTransferMode('beneficiary')}
                  className={`py-2 rounded font-bold border transition ${
                    transferMode === 'beneficiary'
                      ? 'bg-[#003366] text-white border-[#002244]'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Registered Beneficiary
                </button>
                <button
                  type="button"
                  onClick={() => setTransferMode('manual')}
                  className={`py-2 rounded font-bold border transition ${
                    transferMode === 'manual'
                      ? 'bg-[#003366] text-white border-[#002244]'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Direct Account Number
                </button>
              </div>
            </div>

            {/* Target Account Input */}
            {transferMode === 'beneficiary' ? (
              <div>
                <label className="block text-slate-700 uppercase tracking-wider mb-1">Select Beneficiary</label>
                <select
                  value={selectedBeneficiary}
                  onChange={(e) => handleBeneficiarySelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#003366]"
                >
                  <option value="">-- Select Beneficiary Record --</option>
                  {beneficiaries.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.nickname ? `${b.nickname} - ` : ''}{b.account_number})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-slate-700 uppercase tracking-wider mb-1">Target Account Number</label>
                <input
                  type="text"
                  required
                  value={manualAccount}
                  onChange={(e) => setManualAccount(e.target.value)}
                  placeholder="e.g. 3090001002"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#003366]"
                />
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-slate-700 uppercase tracking-wider mb-1">Transfer Amount (INR ₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded font-bold font-mono text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-[#003366]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-700 uppercase tracking-wider mb-1">Remarks / Purpose of Remittance</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Vendor Invoice or Rent Payment"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#003366]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded text-xs shadow transition flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <span>Validate & Process Remittance</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Verify Finacle Transfer Instruction">
        <div className="space-y-4 text-xs font-semibold">
          <div className="p-3 bg-slate-100 rounded border border-slate-300 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600 uppercase">Debit A/c:</span>
              <span className="font-mono font-bold text-slate-900">{sourceAccount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 uppercase">Credit A/c:</span>
              <span className="font-mono font-bold text-slate-900">{manualAccount}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-2 mt-2">
              <span className="text-slate-600 uppercase">Remittance Amount:</span>
              <span className="text-base font-bold text-[#003366] font-mono">₹{parseFloat(amount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 uppercase tracking-wider mb-1">Enter Transaction Security PIN (1234)</label>
            <input
              type="password"
              maxLength={4}
              value={transactionPin}
              onChange={(e) => setTransactionPin(e.target.value)}
              placeholder="••••"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-center font-bold tracking-widest text-base focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-1/2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmTransfer}
              disabled={submitting}
              className="w-1/2 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded transition"
            >
              {submitting ? 'Processing CBS Remittance...' : 'Authorize Remittance'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
