import React, { useEffect, useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Phone,
  RefreshCw,
  CreditCard,
  History,
  X,
  MessageSquare,
  Filter,
  ArrowDownLeft,
  Users
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { CustomSelect } from '../components/CustomSelect';
import { PaginationControls } from '../components/PaginationControls';
import { toast } from 'react-hot-toast';
import {
  fetchFinanceAccounts,
  createFinanceAccount
} from '../services/api';

export const FINANCE_PROVIDERS = [
  { id: 'BAJAJ_FINSERV', label: 'Bajaj Finserv EMI', badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
  { id: 'SAMSUNG_FINANCE', label: 'Samsung Finance+ EMI', badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  { id: 'SHOP_KHATA', label: 'Shop Personal Udhar / Khata', badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { id: 'TVS_CREDIT', label: 'TVS Credit EMI', badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  { id: 'HOME_CREDIT', label: 'Home Credit EMI', badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { id: 'IDFC_FIRST', label: 'IDFC First Bank EMI', badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { id: 'HDB_FINANCE', label: 'HDB Financial Services', badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30' },
  { id: 'OTHER_FINANCE', label: 'Other EMI Partner', badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30' }
];

export const FinancePage: React.FC = () => {
  const { isDarkMode, openPaymentModal } = useStore();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string>('ALL');

  // New Udhar / Finance Account Modal state
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  // New Account Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [financeProvider, setFinanceProvider] = useState('BAJAJ_FINSERV');
  const [loanRefNo, setLoanRefNo] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [flatInterestAmount, setFlatInterestAmount] = useState('');
  const setInterestPreset = (v: number) => setFlatInterestAmount(v.toString());

  // Expanded History cards toggle state (card ID -> boolean)
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const toggleCardHistory = (accId: string) => {
    setExpandedHistory((prev) => ({
      ...prev,
      [accId]: !prev[accId]
    }));
  };

  const loadAccountsFromDB = async () => {
    setLoading(true);
    try {
      const data = await fetchFinanceAccounts();
      setAccounts(data || []);
    } catch (err) {
      console.error('Failed loading finance accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountsFromDB();
  }, []);

  // Precise Math Computations for New Account Form
  const computedPrice = parseFloat(loanAmount) || 0;
  const computedDown = parseFloat(downPayment) || 0;
  const computedInterest = parseFloat(flatInterestAmount) || 0;

  // Unpaid Principal Balance = Device Price - Down Payment
  const computedPrincipalBalance = Math.max(0, computedPrice - computedDown);

  // Total Final Balance to Pay = Unpaid Principal + Flat Interest
  const computedTotalRepayable = computedPrincipalBalance + computedInterest;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !loanAmount) return;

    try {
      const selectedProviderObj = FINANCE_PROVIDERS.find(p => p.id === financeProvider) || FINANCE_PROVIDERS[0];
      const itemDesc = productDetails.trim() || 'Smartphone / Electronics';
      const refSuffix = loanRefNo.trim() ? ` (Ref: ${loanRefNo.trim()})` : '';
      const fullProductDetails = `${itemDesc} • [${selectedProviderObj.label}]${refSuffix}`;

      await createFinanceAccount({
        customerName,
        customerPhone,
        productDetails: fullProductDetails,
        totalProductPrice: computedPrice,
        downPayment: computedDown,
        interestAmount: computedInterest
      });

      await loadAccountsFromDB();

      // Reset
      setCustomerName('');
      setCustomerPhone('');
      setProductDetails('');
      setFinanceProvider('BAJAJ_FINSERV');
      setLoanRefNo('');
      setLoanAmount('');
      setDownPayment('');
      setFlatInterestAmount('');
      setIsNewAccountModalOpen(false);
    } catch (err) {
      console.error('Create account failed:', err);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      (acc.customerName && acc.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (acc.customerPhone && acc.customerPhone.includes(searchTerm)) ||
      (acc.productDetails && acc.productDetails.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedProviderFilter === 'ALL') return true;
    if (selectedProviderFilter === 'BAJAJ') return (acc.productDetails || '').includes('Bajaj');
    if (selectedProviderFilter === 'SAMSUNG') return (acc.productDetails || '').includes('Samsung');
    if (selectedProviderFilter === 'KHATA') return (acc.productDetails || '').includes('Khata') || (acc.productDetails || '').includes('Personal');
    if (selectedProviderFilter === 'TVS') return (acc.productDetails || '').includes('TVS');
    if (selectedProviderFilter === 'OTHERS') return !(acc.productDetails || '').includes('Bajaj') && !(acc.productDetails || '').includes('Samsung') && !(acc.productDetails || '').includes('Khata');

    return true;
  });

  // Safe Total Calculations
  const totalOutstandingBalance = accounts.reduce((sum, a) => {
    const rem = a.remainingBalance ?? a.currentBalance ?? 0;
    return sum + rem;
  }, 0);

  const totalCollections = accounts.reduce((acc, curr) => acc + (curr.totalPaidAmount ?? curr.totalPaid ?? 0), 0);

  // Pagination & Mobile Lazy Loading State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
    setMobileVisibleCount(20);
  }, [searchTerm]);

  const paginatedAccountsDesktop = filteredAccounts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const paginatedAccountsMobile = filteredAccounts.slice(0, mobileVisibleCount);

  // Group accounts by Month-Year for Excel-style ledger
  const groupedAccounts = paginatedAccountsDesktop.reduce((groups, acc) => {
    const date = new Date(acc.createdAt || Date.now());
    const monthYear = date.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(acc);
    return groups;
  }, {} as Record<string, typeof accounts>);

  const sendWhatsAppReminder = (acc: any) => {
    const rawPhone = (acc?.customerPhone || '').replace(/\D/g, '');
    if (!rawPhone) {
      toast.error('No phone number registered for this Udhar account.');
      return;
    }
    const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const name = acc.customerName || 'Valued Customer';
    const due = acc.remainingBalance ?? acc.currentBalance ?? 0;
    const item = acc.productDetails || 'Udhar Account';

    const msg = `*PAYMENT REMINDER - DUKAANPRO*\n\n` +
      `Dear *${name}*,\n\n` +
      `This is a gentle reminder regarding your outstanding Udhar balance for *${item}*.\n\n` +
      `*Outstanding Balance:* ₹${due.toLocaleString()}\n` +
      `*Account Status:* PENDING PAYMENT\n\n` +
      `Kindly pay at your earliest convenience via Cash, UPI, or Net Banking. Thank you!`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Full-Width Top Header Background Canvas with Illustration & Bottom Gradient Fade */}
      <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3.5 sm:px-6 pt-4 sm:pt-6 pb-12 sm:pb-14 bg-gradient-to-b from-sky-100/70 via-blue-50/40 to-slate-50/0 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950/0 relative overflow-hidden">
        {/* Background Decorative Graphic Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 sm:opacity-35 dark:opacity-15 pointer-events-none flex items-center justify-end pr-2 sm:pr-6">
          <svg viewBox="0 0 200 160" className="h-full text-brand-primary fill-current">
            <rect x="30" y="60" width="140" height="80" rx="10" opacity="0.12" />
            <rect x="45" y="75" width="110" height="50" rx="6" opacity="0.18" />
            <circle cx="75" cy="100" r="12" opacity="0.25" />
            <rect x="105" y="94" width="35" height="12" rx="2" opacity="0.25" />
            <path d="M40 35 L70 35 L85 50 L160 50" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
            <circle cx="160" cy="50" r="4" opacity="0.4" />
          </svg>
        </div>

        <div className="relative z-10 space-y-0.5 sm:space-y-1 max-w-xl">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Finance &amp; Udhar Book
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            Instant search by mobile / name • Track Udhar payments &amp; customer repayment history
          </p>
        </div>
      </div>

      {/* Floating Action Bar Container (Search + New Udhar Entry + Refresh) */}
      <div className={`-mt-8 sm:-mt-10 relative z-20 p-2 sm:p-3 rounded-2xl border shadow-xs flex flex-row items-center justify-between gap-1.5 sm:gap-3 ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
      }`}>
        {/* Search Input */}
        <div className="flex-1 min-w-0 flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <Search className="w-4 h-4 text-brand-primary flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search mobile, customer name, EMI..."
            className="w-full bg-transparent text-xs sm:text-sm font-bold focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* New Customer Udhar Entry Button */}
        <button
          onClick={() => setIsNewAccountModalOpen(true)}
          className="flex-shrink-0 h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl btn-gradient-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4 text-white flex-shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">New Udhar Entry</span>
          <span className="sm:hidden whitespace-nowrap">New Udhar</span>
        </button>

        {/* Refresh Icon Button */}
        <button
          onClick={loadAccountsFromDB}
          disabled={loading}
          className={`w-10 sm:w-10.5 h-10 sm:h-10.5 rounded-xl border flex items-center justify-center transition-all shadow-xs flex-shrink-0 cursor-pointer ${
            isDarkMode
              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Finance / EMI Provider Filter (Mobile: CustomSelect | Desktop: Horizontal Tabs) */}
      <div className="pb-1 pt-0.5">
        {/* Mobile CustomSelect (< sm screens) */}
        <div className="sm:hidden">
          <CustomSelect
            options={[
              { value: 'ALL', label: 'All Accounts' },
              { value: 'BAJAJ', label: 'Bajaj Finserv' },
              { value: 'SAMSUNG', label: 'Samsung Finance+' },
              { value: 'KHATA', label: 'Shop Udhar' },
              { value: 'TVS', label: 'TVS Credit' },
              { value: 'OTHERS', label: 'Other EMI Partners' }
            ]}
            value={selectedProviderFilter}
            onChange={(val) => setSelectedProviderFilter(val)}
            icon={<Filter className="w-4 h-4 text-brand-primary" />}
            className="w-full"
          />
        </div>

        {/* Desktop / Tablet Horizontal Pill Tabs (>= sm screens) */}
        <div className="hidden sm:flex items-center space-x-2 overflow-x-auto custom-scrollbar">
          {[
            { id: 'ALL', label: 'All Accounts' },
            { id: 'BAJAJ', label: 'Bajaj Finserv' },
            { id: 'SAMSUNG', label: 'Samsung Finance+' },
            { id: 'KHATA', label: 'Shop Udhar' },
            { id: 'TVS', label: 'TVS Credit' },
            { id: 'OTHERS', label: 'Other EMI Partners' }
          ].map((tab) => {
            const isActive = selectedProviderFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedProviderFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer shadow-none ${isActive
                    ? 'bg-brand-primary text-white'
                    : isDarkMode
                      ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      : 'bg-white border border-slate-200/90 text-slate-700 hover:text-slate-900 hover:border-slate-300'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3 Summary KPI Cards (Matching CashBook & Dashboard style) ─── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Card 1: Total Outstanding Udhar */}
        <div className={`p-2.5 sm:p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between min-h-[82px] sm:min-h-[130px] ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-15 sm:opacity-20 text-amber-500">
            <svg width="80" height="40" viewBox="0 0 130 70" fill="none">
              <path d="M0 50 Q 30 20, 65 40 T 130 10 L 130 70 L 0 70 Z" fill="currentColor" opacity="0.3" />
              <path d="M0 50 Q 30 20, 65 40 T 130 10" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>
          <div className="flex items-start justify-between relative z-10 gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
              <span className="sm:hidden">Udhar Due</span>
              <span className="hidden sm:inline">Total Udhar Outstanding</span>
            </span>
            <div className="w-6 h-6 sm:w-7.5 sm:h-7.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-200/60">
              <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="relative z-10 mt-1.5">
            <p className="text-base sm:text-2xl font-black text-amber-500 font-mono truncate">
              ₹{totalOutstandingBalance.toLocaleString('en-IN')}
            </p>
            <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[9px] sm:text-[10px] font-bold border border-amber-200/60">
              Pending Due
            </span>
          </div>
        </div>

        {/* Card 2: Total Udhar Collected */}
        <div className={`p-2.5 sm:p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between min-h-[82px] sm:min-h-[130px] ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="absolute right-1 bottom-0 pointer-events-none opacity-15 sm:opacity-20 flex items-end space-x-1 h-8 sm:h-12 text-emerald-500">
            <div className="w-1.5 sm:w-2 h-4 sm:h-6 bg-current rounded-t-sm" />
            <div className="w-1.5 sm:w-2 h-6 sm:h-9 bg-current rounded-t-sm" />
            <div className="w-1.5 sm:w-2 h-3 sm:h-5 bg-current rounded-t-sm" />
            <div className="w-1.5 sm:w-2 h-7 sm:h-10 bg-current rounded-t-sm" />
          </div>
          <div className="flex items-start justify-between relative z-10 gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
              <span className="sm:hidden">Collected</span>
              <span className="hidden sm:inline">Total Udhar Collected</span>
            </span>
            <div className="w-6 h-6 sm:w-7.5 sm:h-7.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-200/60">
              <ArrowDownLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="relative z-10 mt-1.5">
            <p className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono truncate">
              ₹{totalCollections.toLocaleString('en-IN')}
            </p>
            <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[9px] sm:text-[10px] font-bold border border-emerald-200/60">
              Recovered
            </span>
          </div>
        </div>

        {/* Card 3: Active Customer Accounts */}
        <div className={`p-2.5 sm:p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between min-h-[82px] sm:min-h-[130px] ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="absolute -right-4 -bottom-4 pointer-events-none opacity-15 sm:opacity-20 text-brand-primary">
            <svg width="70" height="70" viewBox="0 0 120 120">
              <circle cx="90" cy="90" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="90" cy="90" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div className="flex items-start justify-between relative z-10 gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
              <span className="sm:hidden">Accounts</span>
              <span className="hidden sm:inline">Active Customer Accounts</span>
            </span>
            <div className="w-6 h-6 sm:w-7.5 sm:h-7.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-brand-primary flex items-center justify-center flex-shrink-0 border border-sky-200/60">
              <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="relative z-10 mt-1.5">
            <p className="text-base sm:text-2xl font-black text-brand-primary font-mono truncate">
              {accounts.length} <span className="text-xs sm:text-sm font-extrabold text-slate-500 dark:text-slate-400 font-sans">Entries</span>
            </p>
            <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-brand-primary text-[9px] sm:text-[10px] font-bold border border-sky-200/60">
              Active Udhar
            </span>
          </div>
        </div>
      </div>

      {/* Customer Accounts Ledger Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 italic text-sm">
            Loading Udhar finance accounts...
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className={`p-12 text-center rounded-xl border ${isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
            <Wallet className="w-12 h-12 mx-auto text-slate-400 opacity-40 mb-3" />
            <p className="font-bold text-sm">No Udhar finance accounts found</p>
            <p className="text-xs text-slate-400 mt-1">Create a new customer Udhar account to track partial payments & interest</p>
          </div>
        ) : (
          <>
            <div className="space-y-8">
              {Object.entries(groupedAccounts).map(([monthYear, groupAccounts]) => (
                <div key={monthYear} className="space-y-3">
                  <h3 className={`text-sm font-extrabold uppercase tracking-widest pl-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {monthYear}
                  </h3>
                  <>
                    {/* Desktop Table View */}
                    <div className={`hidden md:block overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200/70 bg-white shadow-sm ring-1 ring-slate-900/5'}`}>
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className={`text-[10px] uppercase tracking-wider font-extrabold border-b ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200/70 bg-slate-50/80 text-slate-600'}`}>
                            <th className="p-4 w-1/4">Customer & Date</th>
                            <th className="p-4 w-1/5">Product Details</th>
                            <th className="p-4 w-1/5">Financials (₹)</th>
                            <th className="p-4 w-1/5">Status & Balance</th>
                            <th className="p-4 w-32 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {(groupAccounts as typeof accounts).map((acc) => {
                            const loanAmt = acc.loanAmount ?? acc.totalProductPrice ?? 0;
                            const downPay = acc.downPayment ?? 0;
                            const flatInt = acc.flatInterestAmount ?? acc.interestAmount ?? 0;
                            const totRepay = acc.totalRepayableAmount ?? acc.totalPayable ?? (loanAmt - downPay + flatInt);
                            const totPaid = acc.totalPaidAmount ?? acc.totalPaid ?? 0;
                            const remBal = acc.remainingBalance ?? acc.currentBalance ?? Math.max(0, totRepay - totPaid);
                            const historyList = acc.repayments ?? acc.paymentsHistory ?? [];
                            const isHistoryOpen = expandedHistory[acc.id] ?? false;

                            return (
                              <React.Fragment key={acc.id}>
                                <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                                  <td className="p-4 align-top">
                                    <p className={`font-black text-sm tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{acc.customerName || 'Customer'}</p>
                                    <p className="text-xs flex items-center space-x-1.5 mt-1 font-extrabold text-slate-500">
                                      <Phone className="w-3.5 h-3.5 text-brand-primary" />
                                      <span>{acc.customerPhone || '-'}</span>
                                    </p>
                                    <p className="text-[10px] mt-2 font-extrabold text-slate-400 uppercase tracking-wider">
                                      {new Date(acc.createdAt || Date.now()).toLocaleDateString()}
                                    </p>
                                  </td>

                                  <td className="p-4 align-top">
                                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-700 shadow-xs'}`}>
                                      {acc.productDetails || 'N/A'}
                                    </span>
                                  </td>

                                  <td className="p-4 align-top text-xs space-y-2 font-semibold">
                                    <div className="flex justify-between"><span className="text-slate-500">Price:</span> <span className={`font-extrabold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>₹{loanAmt.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Down:</span> <span className="font-extrabold text-emerald-600">₹{downPay.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">Interest:</span> <span className="font-extrabold text-indigo-600">₹{flatInt.toLocaleString()}</span></div>
                                    <div className={`flex justify-between pt-2 mt-1.5 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                      <span className="font-extrabold text-slate-600 dark:text-slate-400">Total:</span>
                                      <span className={`font-black text-[13px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>₹{totRepay.toLocaleString()}</span>
                                    </div>
                                  </td>

                                  <td className="p-4 align-top text-xs">
                                    <div>
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border tracking-wider ${remBal <= 0
                                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                        }`}>
                                        {remBal <= 0 ? 'Settled' : 'Active Udhar'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between mt-3.5">
                                      <span className="text-slate-500 font-extrabold">Paid:</span>
                                      <span className={`font-extrabold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>₹{totPaid.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                      <span className="text-slate-500 font-extrabold">Due:</span>
                                      <span className="font-black text-amber-600 text-[13px]">₹{remBal.toLocaleString()}</span>
                                    </div>
                                  </td>

                                  <td className="p-4 align-top space-y-2">
                                    {remBal > 0 && (
                                      <>
                                        <button onClick={() => openPaymentModal(acc.id)} className="w-full px-3 py-2 rounded-xl btn-gradient-primary text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-brand-primary/20 hover:shadow-lg hover:shadow-brand-primary/30 transition-all cursor-pointer">
                                          <CreditCard className="w-3.5 h-3.5" /> <span>Pay</span>
                                        </button>
                                        <button onClick={() => sendWhatsAppReminder(acc)} className="w-full px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-500/30 font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs hover:shadow-sm cursor-pointer">
                                          <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> <span>Reminder</span>
                                        </button>
                                      </>
                                    )}
                                    <button onClick={() => toggleCardHistory(acc.id)} className={`w-full px-3 py-2 rounded-xl border font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs hover:shadow-sm cursor-pointer ${isDarkMode ? 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300' : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700'
                                      }`}>
                                      <History className="w-3.5 h-3.5 text-brand-primary" />
                                      <span>History</span>
                                    </button>
                                  </td>
                                </tr>

                                {/* Expandable Payment History Row */}
                                {isHistoryOpen && (
                                  <tr>
                                    <td colSpan={5} className="p-0 border-0">
                                      <div className={`p-5 m-3 rounded-xl border shadow-inner ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50/50 border-slate-200/80'
                                        }`}>
                                        <div className="flex items-center justify-between mb-3">
                                          <h5 className="font-extrabold text-xs uppercase tracking-wider text-brand-primary flex items-center space-x-1.5">
                                            <History className="w-4 h-4" />
                                            <span>Payment History Ledger for {acc.customerName}</span>
                                          </h5>
                                          <span className="text-xs text-slate-400 font-semibold">{historyList.length} Repayments Logged</span>
                                        </div>

                                        {historyList.length === 0 ? (
                                          <p className="text-xs text-slate-400 italic py-2">No repayment entries logged yet.</p>
                                        ) : (
                                          <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs min-w-[500px]">
                                              <thead>
                                                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                                                  }`}>
                                                  <th className="py-2">Date</th>
                                                  <th className="py-2">Amount Paid</th>
                                                  <th className="py-2">Payment Mode</th>
                                                  <th className="py-2">Notes</th>
                                                </tr>
                                              </thead>
                                              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-slate-200/60'}`}>
                                                {historyList.map((r: any, idx: number) => (
                                                  <tr key={r.id || idx}>
                                                    <td className="py-2.5 font-mono text-slate-400 font-semibold">
                                                      {r.paymentDate || 'Recorded'}
                                                    </td>
                                                    <td className="py-2.5 font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                                                      +₹{r.amount?.toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5">
                                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-white border text-slate-600'
                                                        }`}>
                                                        {r.paymentMethod || r.paymentMode || 'CASH'}
                                                      </span>
                                                    </td>
                                                    <td className="py-2.5 text-[11px] italic opacity-80">
                                                      {r.notes || '-'}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Udhar Cards View */}
                    <div className="block md:hidden space-y-3">
                      {paginatedAccountsMobile.map((acc) => {
                        const loanAmt = acc.loanAmount ?? acc.totalProductPrice ?? 0;
                        const downPay = acc.downPayment ?? 0;
                        const flatInt = acc.flatInterestAmount ?? acc.interestAmount ?? 0;
                        const totRepay = acc.totalRepayableAmount ?? acc.totalPayable ?? (loanAmt - downPay + flatInt);
                        const totPaid = acc.totalPaidAmount ?? acc.totalPaid ?? 0;
                        const remBal = acc.remainingBalance ?? acc.currentBalance ?? Math.max(0, totRepay - totPaid);
                        const historyList = acc.repayments ?? acc.paymentsHistory ?? [];
                        const isHistoryOpen = expandedHistory[acc.id] ?? false;

                        return (
                          <div
                            key={acc.id}
                            className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                  {acc.customerName || 'Customer'}
                                </h4>
                                <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                                  <Phone className="w-3 h-3 text-brand-primary" />
                                  <span>{acc.customerPhone || '-'}</span>
                                </p>
                              </div>

                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${remBal <= 0
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                }`}>
                                {remBal <= 0 ? 'Settled' : 'Active Udhar'}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                              <div className="font-extrabold text-slate-800 dark:text-slate-200 border-b pb-1.5 border-slate-200 dark:border-slate-800">
                                {acc.productDetails || 'Udhar Account'}
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div><span className="text-slate-400 block">Total Due</span> <span className="font-mono font-bold text-slate-700 dark:text-slate-300">₹{totRepay.toLocaleString()}</span></div>
                                <div><span className="text-slate-400 block">Paid Amount</span> <span className="font-mono font-bold text-emerald-600">₹{totPaid.toLocaleString()}</span></div>
                                <div><span className="text-slate-400 block">Down Payment</span> <span className="font-mono font-bold text-slate-700 dark:text-slate-300">₹{downPay.toLocaleString()}</span></div>
                                <div><span className="text-slate-400 block font-bold">Remaining Due</span> <span className="font-mono font-black text-amber-600 text-xs">₹{remBal.toLocaleString()}</span></div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 gap-2">
                              {remBal > 0 && (
                                <>
                                  <button onClick={() => openPaymentModal(acc.id)} className="flex-1 py-2 rounded-xl btn-gradient-primary text-white font-extrabold text-xs flex items-center justify-center space-x-1 shadow-md shadow-brand-primary/20 cursor-pointer">
                                    <CreditCard className="w-3.5 h-3.5" /> <span>Pay</span>
                                  </button>
                                  <button onClick={() => sendWhatsAppReminder(acc)} className="py-2 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-extrabold text-xs flex items-center justify-center space-x-1 cursor-pointer">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              <button onClick={() => toggleCardHistory(acc.id)} className={`py-2 px-3 rounded-xl border font-extrabold text-xs flex items-center justify-center space-x-1 cursor-pointer ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                                }`}>
                                <History className="w-3.5 h-3.5 text-brand-primary" />
                                <span>({historyList.length})</span>
                              </button>
                            </div>

                            {isHistoryOpen && (
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                                <h5 className="text-[10px] font-black uppercase text-slate-400 flex items-center space-x-1">
                                  <History className="w-3 h-3 text-brand-primary" />
                                  <span>Payment History Ledger</span>
                                </h5>
                                {historyList.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">No payments recorded.</p>
                                ) : (
                                  historyList.map((r: any, idx: number) => (
                                    <div key={r.id || idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                      <div>
                                        <span className="font-mono text-[10px] text-slate-400 block">{r.paymentDate || 'Today'}</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{r.notes || r.paymentMethod || 'Payment'}</span>
                                      </div>
                                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">+₹{r.amount?.toLocaleString()}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                </div>
              ))}
            </div>

            <PaginationControls
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={filteredAccounts.length}
              pageSizeOptions={[5, 10, 15, 20]}
              mobileVisibleCount={mobileVisibleCount}
              onMobileLoadMore={() => setMobileVisibleCount((prev) => prev + 20)}
            />
          </>
        )}
      </div>

      {/* New Customer Udhar Entry Modal */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-xl border rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold">Create Customer Udhar / EMI Account</h3>
              </div>
              <button onClick={() => setIsNewAccountModalOpen(false)} className="opacity-70 hover:opacity-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              {/* Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">Mobile Number (10 Digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="e.g. 9876543210"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-xs font-bold font-mono focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
              </div>

              {/* Finance Partner / EMI Type Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">Finance / EMI Partner *</label>
                  <CustomSelect
                    options={FINANCE_PROVIDERS.map((p) => ({ value: p.id, label: p.label }))}
                    value={financeProvider}
                    onChange={(val) => setFinanceProvider(val)}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">Approval / Loan Reference No.</label>
                  <input
                    type="text"
                    value={loanRefNo}
                    onChange={(e) => setLoanRefNo(e.target.value)}
                    placeholder="e.g. BJF-987456 or SAM-7712"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">Device / Product Description</label>
                <input
                  type="text"
                  value={productDetails}
                  onChange={(e) => setProductDetails(e.target.value)}
                  placeholder="e.g. Samsung Galaxy A54 5G 8GB/128GB"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs font-semibold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>

              {/* Financial Math Input Card */}
              <div className={`p-4 rounded-xl border space-y-4 ${isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-300'
                }`}>
                <h4 className="font-extrabold text-xs text-brand-primary uppercase tracking-wider">
                  Device Price, Down Payment & Interest Calculation
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold mb-1 opacity-80">Total Phone Price *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      placeholder="e.g. 55000"
                      className={`w-full px-3 py-2 rounded-lg border text-sm font-extrabold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">Down Payment Paid</label>
                    <input
                      type="number"
                      min="0"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                      placeholder="e.g. 10000"
                      className={`w-full px-3 py-2 rounded-lg border text-sm font-extrabold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">Flat Interest Fee</label>
                    <input
                      type="number"
                      min="0"
                      value={flatInterestAmount}
                      onChange={(e) => setFlatInterestAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className={`w-full px-3 py-2 rounded-lg border text-sm font-extrabold text-indigo-400 focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                        }`}
                    />
                  </div>
                </div>

                {/* Quick Interest Presets */}
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-[11px] text-slate-400 font-bold">Quick Interest:</span>
                  <button
                    type="button"
                    onClick={() => setInterestPreset(2000)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px] cursor-pointer transition-all"
                  >
                    + ₹2,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterestPreset(3000)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px] cursor-pointer transition-all"
                  >
                    + ₹3,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterestPreset(5000)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px] cursor-pointer transition-all"
                  >
                    + ₹5,000
                  </button>
                </div>

                {/* Clear Math Result Explanation Box */}
                <div className={`p-3.5 rounded-lg border space-y-1.5 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-xs'
                  }`}>
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Unpaid Principal (Price - Down Payment):</span>
                    <span className="text-slate-900 dark:text-slate-200">₹{computedPrincipalBalance.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="text-indigo-600 dark:text-indigo-400">+ Added Interest Fee:</span>
                    <span className="text-indigo-600 dark:text-indigo-400">₹{computedInterest.toLocaleString()}</span>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 flex items-center justify-between font-extrabold text-sm">
                    <span className="text-brand-primary font-black">Total Customer Repayable Balance:</span>
                    <span className="text-brand-primary font-mono font-black text-base">₹{computedTotalRepayable.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className={`px-4 py-2 rounded-lg font-bold cursor-pointer ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-extrabold shadow-md shadow-brand-primary/20 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Udhar Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};
