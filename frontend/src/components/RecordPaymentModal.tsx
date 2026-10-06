import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Search,
  CreditCard,
  Phone,
  Smartphone,
  CheckCircle,
  History,
  TrendingDown
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { fetchFinanceAccounts, recordFinanceRepayment } from '../services/api';
import { CustomSelect } from './CustomSelect';

/**
 * RecordPaymentModal — Universal Payment Component
 *
 * Opened from any page via: useStore().openPaymentModal(financeId?)
 *   - With financeId → auto-selects that Udhar account, pre-fills all details
 *   - Without financeId → shows searchable list of customers with active Udhar balance
 *
 * Always writes to Finance/Udhar DB table → syncs automatically everywhere.
 */
export const RecordPaymentModal: React.FC = () => {
  const { isDarkMode, isPaymentModalOpen, paymentModalFinanceId, closePaymentModal } = useStore();

  // All finance accounts from DB
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Customer search (used when no pre-selection)
  const [searchQuery, setSearchQuery] = useState('');

  // The selected finance account (the Udhar ledger)
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Load all finance accounts when modal opens
  useEffect(() => {
    if (!isPaymentModalOpen) return;
    setLoadingAccounts(true);
    setSuccessMsg('');
    setPayAmount('');
    setPayNotes('');
    setPayMode('CASH');
    setSearchQuery('');
    setSelectedAccount(null);

    fetchFinanceAccounts()
      .then((data) => {
        const accounts = data || [];
        setAllAccounts(accounts);

        // If opened with a specific financeId or customer phone → auto-select
        if (paymentModalFinanceId) {
          const targetStr = paymentModalFinanceId.trim();
          const found = accounts.find((a: any) => 
            a.id === targetStr || 
            (a.customerPhone && a.customerPhone.trim() === targetStr) ||
            (a.productDetails && a.productDetails.includes(targetStr))
          );
          if (found) {
            setSelectedAccount(found);
            const remBal = found.remainingBalance ?? found.currentBalance ?? 0;
            setPayAmount(remBal > 0 ? remBal.toString() : '');
          } else {
            setSearchQuery(targetStr);
          }
        }
      })
      .finally(() => setLoadingAccounts(false));
  }, [isPaymentModalOpen, paymentModalFinanceId]);

  // Filter: only show accounts with outstanding balance for search list
  const activeAccounts = useMemo(() =>
    allAccounts.filter((a: any) => {
      const bal = a.remainingBalance ?? a.currentBalance ?? 0;
      return bal > 0;
    }),
    [allAccounts]
  );

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return activeAccounts;
    const q = searchQuery.toLowerCase();
    return activeAccounts.filter((a: any) =>
      (a.customerName || '').toLowerCase().includes(q) ||
      (a.customerPhone || '').includes(q) ||
      (a.productDetails || '').toLowerCase().includes(q)
    );
  }, [activeAccounts, searchQuery]);

  const handleSelectAccount = (acc: any) => {
    setSelectedAccount(acc);
    const remBal = acc.remainingBalance ?? acc.currentBalance ?? 0;
    setPayAmount(remBal > 0 ? remBal.toString() : '');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !payAmount || parseFloat(payAmount) <= 0) return;
    setSaving(true);
    try {
      await recordFinanceRepayment(selectedAccount.id, {
        amount: parseFloat(payAmount),
        paymentMethod: payMode,
        notes: payNotes || undefined
      });
      setSuccessMsg(`₹${parseFloat(payAmount).toLocaleString()} recorded for ${selectedAccount.customerName}`);

      // Refresh the selected account's data
      const fresh = await fetchFinanceAccounts();
      setAllAccounts(fresh || []);
      const refreshed = (fresh || []).find((a: any) => a.id === selectedAccount.id);
      if (refreshed) setSelectedAccount(refreshed);

      setPayAmount('');
      setPayNotes('');
      setPayMode('CASH');
    } catch (err) {
      console.error('Payment failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isPaymentModalOpen) return null;

  // Computed values for selected account
  const loanAmt = selectedAccount ? (selectedAccount.loanAmount ?? selectedAccount.totalProductPrice ?? 0) : 0;
  const downPay = selectedAccount ? (selectedAccount.downPayment ?? 0) : 0;
  const flatInt = selectedAccount ? (selectedAccount.flatInterestAmount ?? selectedAccount.interestAmount ?? 0) : 0;
  const totRepay = selectedAccount ? (selectedAccount.totalRepayableAmount ?? selectedAccount.totalPayable ?? (loanAmt - downPay + flatInt)) : 0;
  const totPaid = selectedAccount ? (selectedAccount.totalPaidAmount ?? selectedAccount.totalPaid ?? 0) : 0;
  const remBal = selectedAccount ? (selectedAccount.remainingBalance ?? selectedAccount.currentBalance ?? Math.max(0, totRepay - totPaid)) : 0;
  const historyList = selectedAccount ? (selectedAccount.repayments ?? selectedAccount.paymentsHistory ?? []) : [];
  const progressPct = totRepay > 0 ? Math.min(100, (totPaid / totRepay) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
      <div className={`w-full max-w-2xl border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200/80 text-slate-900'
      }`}>

        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b flex-shrink-0 ${
          isDarkMode ? 'border-slate-800' : 'border-slate-200/80'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-brand-primary flex items-center justify-center flex-shrink-0 border border-sky-200/60">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">Record Udhar Payment</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
                Syncs instantly across Finance • Cash Book
              </p>
            </div>
          </div>
          <button
            onClick={closePaymentModal}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              isDarkMode
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
          {/* LEFT PANEL — hidden once a customer is selected or pre-filled */}
          {!paymentModalFinanceId && !selectedAccount && (
            <div className={`w-full md:w-64 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200/80'
            }`}>
              {/* Search */}
              <div className={`p-3 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200/80'}`}>
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl border ${
                  isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <Search className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name or mobile..."
                    className={`flex-1 bg-transparent text-xs font-bold focus:outline-none ${
                      isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                    }`}
                    autoFocus
                  />
                </div>
              </div>

              {/* Customer List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {loadingAccounts ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Loading customers...</p>
                ) : filteredAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No active Udhar accounts found.</p>
                ) : (
                  filteredAccounts.map((acc: any) => {
                    const bal = acc.remainingBalance ?? acc.currentBalance ?? 0;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleSelectAccount(acc)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                          isDarkMode
                            ? 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-brand-primary/50 hover:bg-slate-900'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-brand-primary/40 hover:bg-sky-50'
                        }`}
                      >
                        <p className="font-extrabold truncate">{acc.customerName}</p>
                        <p className="text-[10px] font-bold mt-0.5 text-slate-500">
                          {acc.customerPhone}
                        </p>
                        <p className="text-[11px] font-extrabold mt-1 text-amber-600 dark:text-amber-400">
                          Due: ₹{bal.toLocaleString()}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* RIGHT PANEL — Account Details + Payment Form */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedAccount ? (
              /* Empty state — prompt to select */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                  isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  <TrendingDown className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-extrabold text-slate-500 dark:text-slate-400">Select a customer</p>
                <p className="text-xs text-slate-400">Search by name or mobile number on the left</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Back button when pre-selecting is done */}
                {!paymentModalFinanceId && selectedAccount && (
                  <button
                    type="button"
                    onClick={() => setSelectedAccount(null)}
                    className={`flex items-center space-x-1.5 text-[11px] font-extrabold text-brand-primary cursor-pointer mb-1 transition-opacity hover:opacity-70`}
                  >
                    <span>← Back to customer list</span>
                  </button>
                )}

                {/* Success Banner */}
                {successMsg && (
                  <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 flex items-center space-x-2 text-xs">
                    <CheckCircle className="w-4 h-4 text-brand-primary flex-shrink-0" />
                    <p className="font-bold text-brand-primary">{successMsg}</p>
                  </div>
                )}

                {/* Customer Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-base font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                      {selectedAccount.customerName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{selectedAccount.customerPhone}</span>
                    </p>
                    {selectedAccount.productDetails && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-1 flex items-center space-x-1">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{selectedAccount.productDetails}</span>
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-[11px] font-extrabold uppercase tracking-wider ${
                    remBal <= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    {remBal <= 0 ? 'SETTLED' : 'ACTIVE UDHAR'}
                  </span>
                </div>

                {/* Financial Summary Grid */}
                <div className={`p-4 rounded-2xl border grid grid-cols-2 gap-3 text-xs ${
                  isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Device Price</span>
                    <p className={`font-extrabold text-sm mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>₹{loanAmt.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Down Payment</span>
                    <p className="font-extrabold text-sm text-brand-primary mt-0.5">₹{downPay.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Flat Interest</span>
                    <p className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">₹{flatInt.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Repayable</span>
                    <p className={`font-extrabold text-sm mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>₹{totRepay.toLocaleString()}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span className="text-slate-500 dark:text-slate-400">Paid: ₹{totPaid.toLocaleString()}</span>
                    <span className="text-amber-600 dark:text-amber-400 text-sm">Pending: ₹{remBal.toLocaleString()}</span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 text-right font-bold">{progressPct.toFixed(0)}% cleared</p>
                </div>

                {/* Payment History Timeline */}
                {historyList.length > 0 && (
                  <div className={`p-3.5 rounded-2xl border space-y-2 ${
                    isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <History className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Previous Payments ({historyList.length})</span>
                    </p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {[...historyList].reverse().map((r: any, idx: number) => (
                        <div
                          key={r.id || idx}
                          className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
                            <div>
                              <span className="font-extrabold text-brand-primary">+₹{r.amount?.toLocaleString()}</span>
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {r.paymentMethod || r.paymentMode || 'CASH'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {r.paymentDate || (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No history */}
                {historyList.length === 0 && (
                  <div className={`p-3 rounded-xl border text-xs text-center ${
                    isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
                  }`}>
                    No payments recorded yet.
                  </div>
                )}

                {/* Divider */}
                <div className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`} />

                {/* Payment Entry Form */}
                {remBal > 0 ? (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      New Payment Entry
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Amount (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max={remBal}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="e.g. 5000"
                          className={`w-full px-3 py-2.5 rounded-xl border text-sm font-extrabold focus:outline-none focus:border-brand-primary transition-colors ${
                            isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-[11px] font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Payment Mode *
                        </label>
                        <CustomSelect
                          options={[
                            { value: 'CASH', label: 'Cash' },
                            { value: 'UPI', label: 'UPI / GPay / PhonePe' },
                            { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
                            { value: 'CHEQUE', label: 'Cheque' }
                          ]}
                          value={payMode}
                          onChange={(val) => setPayMode(val)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Notes / Receipt Ref (Optional)
                      </label>
                      <input
                        type="text"
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        placeholder="e.g. Partial payment at shop counter"
                        className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-brand-primary transition-colors ${
                          isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* Quick amount presets */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 font-bold">Quick:</span>
                      {[1000, 2000, 5000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPayAmount(Math.min(amt, remBal).toString())}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border transition-all ${
                            isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-brand-primary hover:text-brand-primary'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-brand-primary hover:text-brand-primary'
                          }`}
                        >
                          ₹{amt.toLocaleString()}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPayAmount(remBal.toString())}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:border-amber-500"
                      >
                        Full ₹{remBal.toLocaleString()}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full py-3 rounded-xl btn-gradient-primary disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span>{saving ? 'Saving...' : `Save ₹${parseFloat(payAmount || '0').toLocaleString()} Payment`}</span>
                    </button>
                  </form>
                ) : (
                  <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-brand-primary flex-shrink-0" />
                    <div>
                      <p className="font-extrabold text-brand-primary text-sm">Account Fully Settled!</p>
                      <p className="text-xs text-brand-primary/70 mt-0.5">No pending balance remaining.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
