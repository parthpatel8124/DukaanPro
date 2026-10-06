import React, { useEffect, useState } from 'react';
import {
  Users,
  Building2,
  Plus,
  Search,
  Phone,
  RefreshCw,
  X,
  Receipt,
  Wallet,
  MapPin,
  ChevronDown,
  ChevronUp,
  FileText,
  List,
  LayoutGrid
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { CustomSelect } from '../components/CustomSelect';
import { PaginationControls } from '../components/PaginationControls';
import {
  fetchDirectoryCustomers,
  fetchDirectorySuppliers,
  fetchBillBookInvoices,
  fetchFinanceAccounts,
  createDirectoryCustomer,
  createDirectorySupplier
} from '../services/api';

export const DirectoryPage: React.FC = () => {
  const { isDarkMode, openPaymentModal } = useStore();

  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'SUPPLIERS'>('CUSTOMERS');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination & Mobile Lazy Loading State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
    setMobileVisibleCount(20);
  }, [searchTerm, activeTab]);

  // Expanded customer card details toggle state
  const [expandedCustomerCards, setExpandedCustomerCards] = useState<Record<string, boolean>>({});

  const toggleCustomerCard = (cId: string) => {
    setExpandedCustomerCards((prev) => ({
      ...prev,
      [cId]: !prev[cId]
    }));
  };

  // Modals
  const [isAddCustModalOpen, setIsAddCustModalOpen] = useState(false);
  const [isAddSupModalOpen, setIsAddSupModalOpen] = useState(false);

  // Supplier Payment Modal State
  const [supPaymentTarget, setSupPaymentTarget] = useState<any | null>(null);
  const [supPaymentAmount, setSupPaymentAmount] = useState('');
  const [supPaymentMode, setSupPaymentMode] = useState('CASH');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custCity, setCustCity] = useState('');
  const [custState, setCustState] = useState('Gujarat');
  const [custGst, setCustGst] = useState('');

  // Form State: Supplier
  const [supCompany, setSupCompany] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supCity, setSupCity] = useState('');
  const [supGst, setSupGst] = useState('');

  const loadDataFromDB = async () => {
    setLoading(true);
    try {
      const [cData, sData, iData, fData] = await Promise.all([
        fetchDirectoryCustomers(),
        fetchDirectorySuppliers(),
        fetchBillBookInvoices(),
        fetchFinanceAccounts()
      ]);

      // Link Sales Invoices & Finance Udhar Accounts dynamically to Customer profiles
      const linkedCustomers = (cData || []).map((c: any) => {
        const cPhoneClean = c.mobileNumber ? c.mobileNumber.trim() : '';
        const cNameClean = c.fullName ? c.fullName.toLowerCase().trim() : '';

        const linkedInvoices = (iData || []).filter((inv: any) => {
          const invPhone = inv.customerPhone ? inv.customerPhone.trim() : '';
          const invName = inv.customerName ? inv.customerName.toLowerCase().trim() : '';
          return (cPhoneClean && invPhone === cPhoneClean) || (cNameClean && invName === cNameClean);
        });

        const linkedFinances = (fData || []).filter((fin: any) => {
          const finPhone = fin.customerPhone ? fin.customerPhone.trim() : '';
          const finName = fin.customerName ? fin.customerName.toLowerCase().trim() : '';
          return (cPhoneClean && finPhone === cPhoneClean) || (cNameClean && finName === cNameClean);
        });

        const totalInvoicesCount = linkedInvoices.length;
        const totalPurchases = linkedInvoices.reduce(
          (sum: number, inv: any) => sum + (inv.grandTotal || inv.totalAmount || 0),
          0
        );

        const financeDue = linkedFinances.reduce(
          (sum: number, fin: any) => sum + (fin.remainingBalance ?? fin.currentBalance ?? 0),
          0
        );

        const dueBalance = financeDue > 0 ? financeDue : (c.totalOutstanding || c.dueBalance || 0);

        return {
          ...c,
          linkedInvoices,
          linkedFinances,
          totalInvoicesCount,
          totalPurchases,
          dueBalance
        };
      });

      setCustomers(linkedCustomers);
      setSuppliers(sData || []);
    } catch (err) {
      console.error('Error loading directory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromDB();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) return;

    try {
      await createDirectoryCustomer({
        fullName: custName,
        mobileNumber: custPhone,
        city: custCity || 'VALOD',
        state: custState,
        gstNumber: custGst || undefined
      });
      await loadDataFromDB();
      setCustName('');
      setCustPhone('');
      setCustCity('');
      setCustGst('');
      setIsAddCustModalOpen(false);
    } catch (err) {
      console.error('Failed to create customer:', err);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supCompany || !supPhone) return;

    try {
      await createDirectorySupplier({
        companyName: supCompany,
        contactName: supContact || undefined,
        phone: supPhone,
        city: supCity || undefined,
        gstin: supGst || undefined
      });
      await loadDataFromDB();
      setSupCompany('');
      setSupContact('');
      setSupPhone('');
      setSupCity('');
      setSupGst('');
      setIsAddSupModalOpen(false);
    } catch (err) {
      console.error('Failed to create supplier:', err);
    }
  };

  const handleCustReceivePayment = (c: any) => {
    const firstActive = (c.linkedFinances || []).find(
      (f: any) => (f.remainingBalance ?? f.currentBalance ?? 0) > 0
    );
    openPaymentModal(firstActive?.id);
  };

  const openSupPaymentModal = (s: any) => {
    setSupPaymentTarget(s);
    setSupPaymentAmount('');
    setSupPaymentMode('CASH');
  };

  const handleSupPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supPaymentTarget || !supPaymentAmount || parseFloat(supPaymentAmount) <= 0) return;
    try {
      // Supplier payments: log as cash-out entry (no finance table equivalent yet)
      await loadDataFromDB();
      setSupPaymentTarget(null);
    } catch (err) {
      console.error('Supplier payment failed:', err);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobileNumber.includes(searchTerm) ||
      (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm) ||
      (s.contactName && s.contactName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedCustomersDesktop = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const paginatedCustomersMobile = filteredCustomers.slice(0, mobileVisibleCount);

  const paginatedSuppliersDesktop = filteredSuppliers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const paginatedSuppliersMobile = filteredSuppliers.slice(0, mobileVisibleCount);

  const renderCustomerCard = (c: any) => {
    const isExpanded = expandedCustomerCards[c.id] ?? false;
    return (
      <div
        key={c.id}
        className={`p-5 rounded-xl border shadow-sm space-y-3.5 transition-all ${
          isDarkMode
            ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            : 'bg-white border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
        }`}
      >
        {/* Customer Card Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`font-extrabold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{c.fullName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1.5 mt-0.5">
              <Phone className="w-3.5 h-3.5 text-brand-primary" />
              <span>{c.mobileNumber}</span>
            </p>
          </div>

          {c.dueBalance > 0 ? (
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] border border-amber-500/30">
              Udhar: ₹{c.dueBalance.toLocaleString()}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] border border-emerald-500/30">
              Clear
            </span>
          )}
        </div>

        {/* Address & GST */}
        <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400 font-medium">
          <p className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{c.address ? `${c.address}, ` : ''}{c.city || 'VALOD'}, {c.state || 'Gujarat'}</span>
          </p>
          {c.gstNumber && <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300">GSTIN: {c.gstNumber}</p>}
        </div>

        {/* Summary Box */}
        <div className={`p-3 rounded-xl border grid grid-cols-2 gap-2 text-xs ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Sales Bills</span>
            <p className={`font-extrabold text-sm mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {c.totalInvoicesCount === 1 ? '1 Invoice' : `${c.totalInvoicesCount || 0} Invoices`}
            </p>
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Purchases</span>
            <p className={`font-extrabold text-sm mt-0.5 text-brand-primary`}>₹{(c.totalPurchases || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Action Controls & Link Expansion Button */}
        <div className="pt-1 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/60">
          <button
            onClick={() => toggleCustomerCard(c.id)}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-primary flex items-center space-x-1 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-brand-primary" />
            <span>Linked Bills & Udhar</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {c.dueBalance > 0 && (
            <button
              onClick={() => handleCustReceivePayment(c)}
              className="px-3.5 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs shadow-md shadow-brand-primary/20 cursor-pointer"
            >
              Receive Payment
            </button>
          )}
        </div>

        {/* 📜 Linked POS Invoices & Udhar Finance History Drawer */}
        {isExpanded && (
          <div className={`p-3.5 rounded-xl border space-y-3 text-xs ${
            isDarkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            {/* Linked Invoices Section */}
            <div>
              <span className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider flex items-center space-x-1 mb-1.5">
                <Receipt className="w-3 h-3 text-brand-primary" />
                <span>POS Tax Invoices ({c.linkedInvoices?.length || 0})</span>
              </span>
              {(!c.linkedInvoices || c.linkedInvoices.length === 0) ? (
                <p className="text-[11px] text-slate-400 italic">No linked POS invoices found for this customer.</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {c.linkedInvoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{inv.invoiceNo || 'INV'}</span>
                        <span className={`ml-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{inv.saleDate || new Date().toLocaleDateString()}</span>
                      </div>
                      <span className="font-extrabold text-brand-primary">
                        ₹{(inv.grandTotal || inv.totalAmount || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Udhar Accounts Section */}
            <div>
              <span className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider flex items-center space-x-1 mb-1.5">
                <Wallet className="w-3 h-3 text-amber-500" />
                <span>Udhar Finance Accounts ({c.linkedFinances?.length || 0})</span>
              </span>
              {(!c.linkedFinances || c.linkedFinances.length === 0) ? (
                <p className="text-[11px] text-slate-400 italic">No active Udhar accounts.</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {c.linkedFinances.map((fin: any) => (
                    <div
                      key={fin.id}
                      className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div>
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{fin.productDetails || 'Udhar Account'}</span>
                      </div>
                      <span className={`font-extrabold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        Due: ₹{(fin.remainingBalance ?? fin.currentBalance ?? 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSupplierCard = (s: any) => (
    <div
      key={s.id}
      className={`p-5 rounded-xl border shadow-sm space-y-3.5 transition-all ${
        isDarkMode
          ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          : 'bg-white border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className={`font-extrabold text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{s.companyName}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1.5 mt-0.5">
            <Phone className="w-3.5 h-3.5 text-brand-primary" />
            <span>{s.phone}</span>
          </p>
        </div>
        {s.payableBalance > 0 ? (
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-[11px] border border-rose-500/30">
            Payable: ₹{s.payableBalance.toLocaleString()}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] border border-emerald-500/30">
            Settled
          </span>
        )}
      </div>

      <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400 font-medium">
        {s.contactName && <p>Contact Person: {s.contactName}</p>}
        <p className="flex items-center space-x-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span>{s.city || 'Gujarat'}</span>
        </p>
        {s.gstin && <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300">GSTIN: {s.gstin}</p>}
      </div>

      <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/60">
        <span className="text-[11px] font-bold text-slate-400">Distributor Supplier Account</span>
        {s.payableBalance > 0 && (
          <button
            onClick={() => openSupPaymentModal(s)}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-500/20 cursor-pointer"
          >
            Pay Supplier
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Full-Width Top Header Background Canvas with Illustration & Bottom Gradient Fade */}
      <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3.5 sm:px-6 pt-4 sm:pt-6 pb-12 sm:pb-14 bg-gradient-to-b from-sky-100/70 via-blue-50/40 to-slate-50/0 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950/0 relative overflow-hidden">
        {/* Background Decorative Graphic Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 sm:opacity-35 dark:opacity-15 pointer-events-none flex items-center justify-end pr-2 sm:pr-6">
          <svg viewBox="0 0 200 160" className="h-full text-brand-primary fill-current">
            <circle cx="70" cy="65" r="22" opacity="0.2" />
            <path d="M40 120 C40 95 60 90 70 90 C80 90 100 95 100 120 Z" opacity="0.15" />
            <circle cx="130" cy="75" r="16" opacity="0.25" />
            <path d="M110 120 C110 102 122 98 130 98 C138 98 150 102 150 120 Z" opacity="0.2" />
            <rect x="25" y="35" width="150" height="95" rx="8" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.25" />
          </svg>
        </div>

        <div className="relative z-10 space-y-0.5 sm:space-y-1 max-w-xl">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Customers &amp; Suppliers
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            Manage shop customer profiles &amp; distributor supplier payables auto-linked with POS invoices
          </p>
        </div>
      </div>

      {/* Floating Action Bar Container (Full Width Search + Action Buttons) */}
      <div className={`-mt-8 sm:-mt-10 relative z-20 p-2 sm:p-3 rounded-2xl border shadow-xs flex flex-row items-center justify-between gap-2 sm:gap-3 ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
      }`}>
        {/* Full-width Search Input */}
        <div className="flex-1 min-w-0 flex items-center space-x-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <Search className="w-4 h-4 text-brand-primary flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeTab.toLowerCase()} by name or mobile...`}
            className="w-full bg-transparent text-xs sm:text-sm font-bold focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Right Action Buttons (+ Create Customer / Supplier + Refresh) */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {activeTab === 'CUSTOMERS' ? (
            <button
              onClick={() => setIsAddCustModalOpen(true)}
              className="h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl btn-gradient-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 text-white flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Create Customer</span>
              <span className="sm:hidden whitespace-nowrap">Customer</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddSupModalOpen(true)}
              className="h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl btn-gradient-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 text-white flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Create Supplier</span>
              <span className="sm:hidden whitespace-nowrap">Supplier</span>
            </button>
          )}

          <button
            onClick={loadDataFromDB}
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
      </div>

      {/* New Card Below Floating Action Bar (Left: Customers/Suppliers Tabs | Right: Table/Grid View Mode) */}
      <div className={`p-2 sm:p-2.5 rounded-2xl border shadow-xs flex items-center justify-between gap-2 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
      }`}>
        {/* Left side: Customers vs Suppliers Toggle Tabs */}
        <div className={`flex items-center space-x-1 p-1 rounded-xl border flex-shrink-0 ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'CUSTOMERS'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'SUPPLIERS'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Suppliers ({suppliers.length})
          </button>
        </div>

        {/* Right side: Table vs Grid View Mode Toggle (Hidden on Mobile) */}
        <div className={`hidden sm:flex items-center space-x-1 p-1 rounded-xl border flex-shrink-0 ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setViewMode('TABLE')}
            className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === 'TABLE'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Table View"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('GRID')}
            className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === 'GRID'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Grid Cards View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>
        </div>
      </div>

      {/* Directory Content (Table or Grid View) */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 italic text-sm">
          Loading directory records & linking sales history...
        </div>
      ) : activeTab === 'CUSTOMERS' ? (
        filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic text-sm border rounded-xl bg-white dark:bg-slate-900">
            No customers found. Click + Create Customer to add one!
          </div>
        ) : viewMode === 'TABLE' ? (
          <>
            {/* CUSTOMERS TABLE VIEW (Desktop Only, Mobile uses Cards View) */}
            <div className={`hidden sm:block rounded-xl border shadow-xs overflow-hidden ${
              isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[880px]">
                <thead className={`border-b font-extrabold uppercase text-[10px] tracking-wider ${
                  isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="p-3.5 text-center w-12">#</th>
                    <th className="p-3.5">Customer Name & Contact</th>
                    <th className="p-3.5">Location & GSTIN</th>
                    <th className="p-3.5 text-center">Total Invoices</th>
                    <th className="p-3.5 text-right">Total Purchases</th>
                    <th className="p-3.5 text-center">Udhar Status</th>
                    <th className="p-3.5 text-center">Linked Records</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  {paginatedCustomersDesktop.map((c, idx) => {
                    const isExpanded = expandedCustomerCards[c.id] ?? false;
                    return (
                      <React.Fragment key={c.id}>
                        <tr className={`transition-all ${
                          isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                        }`}>
                          <td className="p-3.5 text-center text-slate-400 font-bold">{(currentPage - 1) * pageSize + idx + 1}</td>
                          <td className="p-3.5">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                              <Users className="w-4 h-4 text-brand-primary flex-shrink-0" />
                              <span>{c.fullName}</span>
                            </div>
                            <div className="text-xs text-slate-500 font-bold flex items-center space-x-1 mt-0.5 ml-5">
                              <Phone className="w-3 h-3 text-brand-primary" />
                              <span>{c.mobileNumber}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300">
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{c.city || 'VALOD'}, {c.state || 'Gujarat'}</span>
                            </div>
                            {c.gstNumber && <div className="font-mono text-[10px] text-slate-400 mt-0.5">GSTIN: {c.gstNumber}</div>}
                          </td>
                          <td className="p-3.5 text-center font-extrabold text-slate-700 dark:text-slate-300">
                            {c.totalInvoicesCount === 1 ? '1 Invoice' : `${c.totalInvoicesCount || 0} Invoices`}
                          </td>
                          <td className="p-3.5 text-right font-extrabold text-brand-primary">
                            ₹{(c.totalPurchases || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            {c.dueBalance > 0 ? (
                              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] border border-amber-500/30">
                                Udhar: ₹{c.dueBalance.toLocaleString()}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] border border-emerald-500/30">
                                Clear
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => toggleCustomerCard(c.id)}
                              className="px-2.5 py-1 rounded-lg border text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-brand-primary border-slate-200 dark:border-slate-800 hover:border-brand-primary flex items-center space-x-1 mx-auto cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-brand-primary" />
                              <span>History</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="p-3.5 text-center">
                            {c.dueBalance > 0 ? (
                              <button
                                onClick={() => handleCustReceivePayment(c)}
                                className="px-3 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs shadow-xs cursor-pointer"
                              >
                                Receive Payment
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs italic">—</span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Drawer Inside Table Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-4 bg-slate-50 dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider flex items-center space-x-1 mb-1.5">
                                    <Receipt className="w-3 h-3 text-brand-primary" />
                                    <span>POS Tax Invoices ({c.linkedInvoices?.length || 0})</span>
                                  </span>
                                  {(!c.linkedInvoices || c.linkedInvoices.length === 0) ? (
                                    <p className="text-[11px] text-slate-400 italic">No linked POS invoices found for this customer.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                      {c.linkedInvoices.map((inv: any) => (
                                        <div
                                          key={inv.id}
                                          className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                                            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                                          }`}
                                        >
                                          <div>
                                            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{inv.invoiceNo || 'INV'}</span>
                                            <span className={`ml-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{inv.saleDate || new Date().toLocaleDateString()}</span>
                                          </div>
                                          <span className="font-extrabold text-brand-primary">
                                            ₹{(inv.grandTotal || inv.totalAmount || 0).toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <span className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider flex items-center space-x-1 mb-1.5">
                                    <Wallet className="w-3 h-3 text-amber-500" />
                                    <span>Udhar Finance Accounts ({c.linkedFinances?.length || 0})</span>
                                  </span>
                                  {(!c.linkedFinances || c.linkedFinances.length === 0) ? (
                                    <p className="text-[11px] text-slate-400 italic">No active Udhar accounts.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                      {c.linkedFinances.map((fin: any) => (
                                        <div
                                          key={fin.id}
                                          className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                                            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                                          }`}
                                        >
                                          <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{fin.productDetails || 'Udhar Account'}</span>
                                          <span className="font-extrabold text-amber-600 dark:text-amber-400">
                                            Due: ₹{(fin.remainingBalance ?? fin.currentBalance ?? 0).toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
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
          </div>
          {/* CUSTOMERS CARDS VIEW (Mobile fallback when Table View selected) */}
          <div className="grid sm:hidden grid-cols-1 gap-5 mt-4">
            {paginatedCustomersMobile.map((c) => renderCustomerCard(c))}
          </div>

          <PaginationControls
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredCustomers.length}
            pageSizeOptions={[5, 10, 15, 20]}
            mobileVisibleCount={mobileVisibleCount}
            onMobileLoadMore={() => setMobileVisibleCount((prev) => prev + 20)}
          />
          </>
        ) : (
          /* CUSTOMERS GRID CARDS VIEW (Desktop & Mobile) */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(viewMode === 'GRID' ? paginatedCustomersDesktop : paginatedCustomersMobile).map((c) => renderCustomerCard(c))}
            </div>
            <PaginationControls
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={filteredCustomers.length}
              pageSizeOptions={[5, 10, 15, 20]}
              mobileVisibleCount={mobileVisibleCount}
              onMobileLoadMore={() => setMobileVisibleCount((prev) => prev + 20)}
            />
          </>
        )
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-12 text-center text-slate-400 italic text-sm border rounded-xl bg-white dark:bg-slate-900">
          No supplier distributors found. Click + Create Supplier to add one!
        </div>
      ) : viewMode === 'TABLE' ? (
        <>
          {/* SUPPLIERS TABLE VIEW (Desktop Only, Mobile uses Cards View) */}
          <div className={`hidden sm:block rounded-xl border shadow-xs overflow-hidden ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[780px]">
              <thead className={`border-b font-extrabold uppercase text-[10px] tracking-wider ${
                isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3.5 text-center w-12">#</th>
                  <th className="p-3.5">Company / Business Name</th>
                  <th className="p-3.5">Contact Person</th>
                  <th className="p-3.5">Phone Number</th>
                  <th className="p-3.5">Location & GSTIN</th>
                  <th className="p-3.5 text-center">Payable Balance</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                {paginatedSuppliersDesktop.map((s, idx) => (
                  <tr key={s.id} className={`transition-all ${
                    isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                  }`}>
                    <td className="p-3.5 text-center text-slate-400 font-bold">{(currentPage - 1) * pageSize + idx + 1}</td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <Building2 className="w-4 h-4 text-brand-primary flex-shrink-0" />
                        <span>{s.companyName}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-bold">
                      {s.contactName || '—'}
                    </td>
                    <td className="p-3.5">
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-mono font-bold flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-brand-primary" />
                        <span>{s.phone}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.city || 'Gujarat'}</span>
                      </div>
                      {s.gstin && <div className="font-mono text-[10px] text-slate-400 mt-0.5">GSTIN: {s.gstin}</div>}
                    </td>
                    <td className="p-3.5 text-center">
                      {s.payableBalance > 0 ? (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold text-[11px] border border-rose-500/30">
                          Payable: ₹{s.payableBalance.toLocaleString()}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] border border-emerald-500/30">
                          Settled
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {s.payableBalance > 0 ? (
                        <button
                          onClick={() => openSupPaymentModal(s)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                        >
                          Pay Supplier
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
          {/* SUPPLIERS CARDS VIEW (Mobile fallback when Table View selected) */}
          <div className="grid sm:hidden grid-cols-1 gap-5 mt-4">
            {paginatedSuppliersMobile.map((s) => renderSupplierCard(s))}
          </div>

          <PaginationControls
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredSuppliers.length}
            pageSizeOptions={[5, 10, 15, 20]}
            mobileVisibleCount={mobileVisibleCount}
            onMobileLoadMore={() => setMobileVisibleCount((prev) => prev + 20)}
          />
        </>
      ) : (
        /* SUPPLIERS GRID CARDS VIEW (Desktop & Mobile) */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(viewMode === 'GRID' ? paginatedSuppliersDesktop : paginatedSuppliersMobile).map((s) => renderSupplierCard(s))}
          </div>
          <PaginationControls
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredSuppliers.length}
            pageSizeOptions={[5, 10, 15, 20]}
            mobileVisibleCount={mobileVisibleCount}
            onMobileLoadMore={() => setMobileVisibleCount((prev) => prev + 20)}
          />
        </>
      )}

      {/* Add Customer Modal */}
      {isAddCustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-md border rounded-xl p-6 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-base font-extrabold">Create Customer Profile</h3>
              <button onClick={() => setIsAddCustModalOpen(false)} className="opacity-70 hover:opacity-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 opacity-80">Full Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs font-bold focus:outline-none focus:border-brand-primary ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">Mobile Number (10 Digits) *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="e.g. 9876543210"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold font-mono focus:outline-none focus:border-brand-primary ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 opacity-80">City</label>
                  <input
                    type="text"
                    value={custCity}
                    onChange={(e) => setCustCity(e.target.value)}
                    placeholder="VALOD"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-brand-primary ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 opacity-80">State</label>
                  <input
                    type="text"
                    value={custState}
                    onChange={(e) => setCustState(e.target.value)}
                    placeholder="Gujarat"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-brand-primary ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">GSTIN Number (15 Characters)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={custGst}
                  onChange={(e) => setCustGst(e.target.value.toUpperCase().slice(0, 15))}
                  placeholder="24ABCDE1234F1Z5"
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-brand-primary ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddCustModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold shadow-md shadow-brand-primary/20 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddSupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-md border rounded-2xl p-6 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className="text-base font-extrabold">Create Supplier / Distributor Profile</h3>
              <button onClick={() => setIsAddSupModalOpen(false)} className="opacity-70 hover:opacity-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 opacity-80">Company / Business Name *</label>
                <input
                  type="text"
                  required
                  value={supCompany}
                  onChange={(e) => setSupCompany(e.target.value)}
                  placeholder="e.g. Samsung India Pvt Ltd"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-brand-primary ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">Contact Person Name</label>
                <input
                  type="text"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  placeholder="e.g. Anil Distributor Manager"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-brand-primary ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">Phone Number (10 Digits) *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="e.g. 9825012345"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold font-mono focus:outline-none focus:border-brand-primary ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">City</label>
                <input
                  type="text"
                  value={supCity}
                  onChange={(e) => setSupCity(e.target.value)}
                  placeholder="Surat"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-brand-primary ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 opacity-80">GSTIN Number (15 Characters)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={supGst}
                  onChange={(e) => setSupGst(e.target.value.toUpperCase().slice(0, 15))}
                  placeholder="24AAACG1234F1Z8"
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-brand-primary ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddSupModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold shadow-md shadow-brand-primary/20 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Supplier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Supplier Pay Modal */}
      {supPaymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-sm border rounded-2xl p-6 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className="text-base font-extrabold">Pay Supplier</h3>
                <p className="text-xs text-slate-500 mt-0.5">{supPaymentTarget.companyName} • Due: ₹{supPaymentTarget.payableBalance?.toLocaleString()}</p>
              </div>
              <button onClick={() => setSupPaymentTarget(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSupPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={supPaymentAmount}
                  onChange={(e) => setSupPaymentAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-extrabold focus:outline-none focus:border-brand-primary ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Payment Mode</label>
                <CustomSelect
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'UPI', label: 'UPI / GPay / PhonePe' },
                    { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
                    { value: 'CHEQUE', label: 'Cheque' }
                  ]}
                  value={supPaymentMode}
                  onChange={(val) => setSupPaymentMode(val)}
                />
              </div>

              <div className="pt-1 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSupPaymentTarget(null)}
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold shadow-md shadow-rose-500/20 cursor-pointer"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
