import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  SlidersHorizontal,
  Wallet
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { fetchCashBookEntries, createCashBookEntry } from '../services/api';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { CustomSelect } from '../components/CustomSelect';
import { PaginationControls } from '../components/PaginationControls';

export interface CashBookItem {
  id: string;
  type: 'CASH_IN' | 'CASH_OUT';
  category: string;
  amount: number;
  notes?: string;
  date: string; // YYYY-MM-DD
}

export const CashBookPage: React.FC = () => {
  const { isDarkMode } = useStore();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [entries, setEntries] = useState<CashBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Entry Form State
  const [entryType, setEntryType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');
  const [category, setCategory] = useState('Counter Sales');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const loadEntriesFromDB = async (dateStr: string) => {
    setLoading(true);
    try {
      const data = await fetchCashBookEntries(dateStr);
      setEntries(data || []);
    } catch (err) {
      console.error('Error loading cash book entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntriesFromDB(selectedDate);
  }, [selectedDate]);

  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      await createCashBookEntry({
        type: entryType,
        category,
        amount: parseFloat(amount),
        notes: notes || undefined,
        date: entryDate
      });

      if (entryDate === selectedDate) {
        await loadEntriesFromDB(selectedDate);
      } else {
        setSelectedDate(entryDate);
      }

      setAmount('');
      setNotes('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to create cash book entry:', err);
    }
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
    setMobileVisibleCount(20);
  }, [searchTerm, selectedDate]);

  const paginatedEntriesDesktop = filteredEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const paginatedEntriesMobile = filteredEntries.slice(0, mobileVisibleCount);

  const totalCashIn = entries
    .filter((e) => e.type === 'CASH_IN')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalCashOut = entries
    .filter((e) => e.type === 'CASH_OUT')
    .reduce((acc, e) => acc + e.amount, 0);

  const netBalance = totalCashIn - totalCashOut;

  const getFormattedDateLabel = (dateStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const d = new Date(dateStr);
    const prettyDate = d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return isToday ? `Today • ${prettyDate}` : prettyDate;
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-12 font-sans">

      {/* Full-Width Top Header Background Canvas with Daily Cash Book Illustration & Bottom Gradient Fade */}
      <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3.5 sm:px-6 pt-4 sm:pt-6 pb-12 sm:pb-14 bg-gradient-to-b from-sky-100/70 via-blue-50/40 to-slate-50/0 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950/0 relative overflow-hidden">
        {/* Background Decorative Cash Book & Cash Register Graphic Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 sm:opacity-35 dark:opacity-15 pointer-events-none flex items-center justify-end pr-2 sm:pr-6">
          <svg viewBox="0 0 200 160" className="h-full text-brand-primary fill-current">
            <rect x="30" y="70" width="140" height="70" rx="8" opacity="0.12" />
            <rect x="45" y="85" width="110" height="40" rx="4" opacity="0.15" />
            <rect x="55" y="93" width="26" height="24" rx="3" opacity="0.25" />
            <rect x="87" y="93" width="26" height="24" rx="3" opacity="0.25" />
            <rect x="119" y="93" width="26" height="24" rx="3" opacity="0.25" />
            <circle cx="150" cy="45" r="22" opacity="0.15" />
            <text x="150" y="53" textAnchor="middle" fontSize="22" fontWeight="bold" fill="currentColor" opacity="0.4">₹</text>
            <path d="M40 35 H110 M40 48 H95 M40 61 H105" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.25" />
          </svg>
        </div>

        <div className="relative z-10 space-y-0.5 sm:space-y-1 max-w-xl">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Daily Cash Book
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            Counter cash in, cash out &amp; daily closing balance
          </p>
        </div>
      </div>

      {/* ── Action Bar (floats over hero header background, pulled up) ───────────────── */}
      <div className={`-mt-8 sm:-mt-10 relative z-20 p-2 sm:p-3 rounded-2xl border shadow-xs flex flex-row items-center justify-between gap-1.5 sm:gap-3 ${isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
        }`}>
        {/* Date picker custom */}
        <CustomDatePicker
          value={selectedDate}
          onChange={(dateStr) => setSelectedDate(dateStr)}
          className="flex-1 min-w-0"
        />

        {/* Record Entry Button */}
        <button
          onClick={() => {
            setEntryDate(selectedDate);
            setIsAddModalOpen(true);
          }}
          className="flex-shrink-0 h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl btn-gradient-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4 text-white flex-shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Add Cash Entry</span>
          <span className="sm:hidden whitespace-nowrap">Add Entry</span>
        </button>

        {/* Refresh */}
        <button
          onClick={() => loadEntriesFromDB(selectedDate)}
          disabled={loading}
          className={`w-10 sm:w-10.5 h-10 sm:h-10.5 rounded-xl border flex items-center justify-center transition-all shadow-xs flex-shrink-0 cursor-pointer ${isDarkMode
              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>


      {/* ── KPI Cards — 3-col (Cash In • Cash Out • Net Balance) ─── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Cash In */}
        <div className={`p-2.5 sm:p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between min-h-[82px] sm:min-h-[130px] group interactive-card cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
          <div className="absolute right-1 bottom-0 pointer-events-none opacity-15 sm:opacity-20 flex items-end space-x-1 h-8 sm:h-12 text-emerald-500">
            <div className="w-1.5 sm:w-2 h-4 sm:h-6 bg-current rounded-t-sm" />
            <div className="w-1.5 sm:w-2 h-6 sm:h-9 bg-current rounded-t-sm" />
            <div className="w-1.5 sm:w-2 h-3 sm:h-5 bg-current rounded-t-sm" />
            <div className="w-1.5 sm:w-2 h-7 sm:h-10 bg-current rounded-t-sm" />
          </div>
          <div className="flex items-start justify-between relative z-10 gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">Cash In</span>
            <div className="w-6 h-6 sm:w-7.5 sm:h-7.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-200/60 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <ArrowDownLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="relative z-10 mt-1.5">
            {loading ? (
              <div className="h-5 sm:h-7 w-20 sm:w-28 skeleton-shimmer my-1" />
            ) : (
              <p className="text-base sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono truncate">
                ₹{totalCashIn.toLocaleString('en-IN')}
              </p>
            )}
            <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[9px] sm:text-[10px] font-bold border border-emerald-200/60">
              Received
            </span>
          </div>
        </div>

        {/* Cash Out */}
        <div className={`p-2.5 sm:p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between min-h-[82px] sm:min-h-[130px] group interactive-card cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-15 sm:opacity-20 text-rose-500">
            <svg width="80" height="40" viewBox="0 0 130 70" fill="none">
              <path d="M0 50 Q 30 20, 65 40 T 130 10 L 130 70 L 0 70 Z" fill="currentColor" opacity="0.3" />
              <path d="M0 50 Q 30 20, 65 40 T 130 10" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>
          <div className="flex items-start justify-between relative z-10 gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">Cash Out</span>
            <div className="w-6 h-6 sm:w-7.5 sm:h-7.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 border border-rose-200/60 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="relative z-10 mt-1.5">
            {loading ? (
              <div className="h-5 sm:h-7 w-20 sm:w-28 skeleton-shimmer my-1" />
            ) : (
              <p className="text-base sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono truncate">
                ₹{totalCashOut.toLocaleString('en-IN')}
              </p>
            )}
            <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[9px] sm:text-[10px] font-bold border border-rose-200/60">
              Paid Out
            </span>
          </div>
        </div>

        {/* Net Balance */}
        <div className={`p-2.5 sm:p-5 rounded-2xl border relative overflow-hidden flex flex-col justify-between min-h-[82px] sm:min-h-[130px] group interactive-card cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
          <div className="absolute -right-4 -bottom-4 pointer-events-none opacity-15 sm:opacity-20 text-brand-primary">
            <svg width="70" height="70" viewBox="0 0 120 120">
              <circle cx="90" cy="90" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="90" cy="90" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div className="flex items-start justify-between relative z-10 gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">Net Balance</span>
            <div className="w-6 h-6 sm:w-7.5 sm:h-7.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-brand-primary flex items-center justify-center flex-shrink-0 border border-sky-200/60 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="relative z-10 mt-1.5">
            {loading ? (
              <div className="h-5 sm:h-7 w-20 sm:w-28 skeleton-shimmer my-1" />
            ) : (
              <p className={`text-base sm:text-2xl font-black font-mono truncate ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                ₹{netBalance.toLocaleString('en-IN')}
              </p>
            )}
            <span className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold border ${netBalance >= 0
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/60'
              }`}>
              {netBalance >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Date Navigator ─────────────────────────────────────────── */}
      <div className={`p-2.5 sm:p-3.5 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-brand-primary block">
              Selected Ledger Date
            </span>
            <h3 className="text-[11px] sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mt-0.5">
              {getFormattedDateLabel(selectedDate)}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => changeDateByDays(-1)}
            className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl border font-extrabold text-[11px] sm:text-xs flex items-center justify-center space-x-0.5 sm:space-x-1 transition-all cursor-pointer ${isDarkMode
              ? 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
          >
            <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Prev Day</span>
          </button>

          <button
            type="button"
            onClick={() => changeDateByDays(1)}
            className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl border font-extrabold text-[11px] sm:text-xs flex items-center justify-center space-x-0.5 sm:space-x-1 transition-all cursor-pointer ${isDarkMode
              ? 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
          >
            <span>Next Day</span>
            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className={`py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl border font-extrabold text-[11px] sm:text-xs flex items-center justify-center space-x-0.5 sm:space-x-1 transition-all cursor-pointer ${isToday
              ? isDarkMode
                ? 'bg-brand-primary/15 border-brand-primary/40 text-brand-primary'
                : 'bg-sky-50 border-brand-primary/30 text-brand-primary'
              : isDarkMode
                ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20'
                : 'bg-sky-50 border-brand-primary/20 text-brand-primary hover:bg-sky-100'
              }`}
          >
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Today's Log</span>
          </button>
        </div>
      </div>


      {/* ── Entries List Card ──────────────────────────────────────── */}
      <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
        {/* Search Bar */}
        <div className={`p-3 sm:p-4 border-b flex items-center gap-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200/80'
          }`}>
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-brand-primary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search entries for ${selectedDate}...`}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-brand-primary font-semibold transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
            />
          </div>
          <button className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          {loading ? (
            <div className="space-y-3 py-2">
              <div className="h-12 w-full skeleton-shimmer" />
              <div className="h-12 w-full skeleton-shimmer" />
              <div className="h-12 w-full skeleton-shimmer" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Entries Yet</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  No cash entries recorded for {getFormattedDateLabel(selectedDate)}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEntryDate(selectedDate);
                  setIsAddModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-bold text-xs shadow-md shadow-brand-primary/20 cursor-pointer inline-flex items-center space-x-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entry on this Page</span>
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className={`hidden md:block overflow-x-auto rounded-xl border ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200/80 bg-white'
                }`}>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`text-[10px] uppercase tracking-wider font-extrabold border-b ${isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200/80 bg-slate-50 text-slate-500'
                      }`}>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Notes / Remarks</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                    {paginatedEntriesDesktop.map((e) => (
                      <tr key={e.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/50 text-slate-300' : 'hover:bg-slate-50 text-slate-800'
                        }`}>
                        <td className="py-3.5 px-4 align-middle">
                          {e.type === 'CASH_IN' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 font-extrabold text-[11px] flex items-center space-x-1 w-fit">
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>CASH IN</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 font-extrabold text-[11px] flex items-center space-x-1 w-fit">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>CASH OUT</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-middle font-black">{e.category}</td>
                        <td className="py-3.5 px-4 align-middle text-slate-500 dark:text-slate-400 font-medium">{e.notes || '-'}</td>
                        <td className={`py-3.5 px-4 align-middle text-right font-black font-mono text-sm ${e.type === 'CASH_IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                          {e.type === 'CASH_IN' ? '+' : '-'}₹{e.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="block md:hidden space-y-2.5">
                {paginatedEntriesMobile.map((e) => (
                  <div
                    key={e.id}
                    className={`p-3.5 rounded-2xl border space-y-2 transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      {e.type === 'CASH_IN' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 font-extrabold text-[11px] flex items-center space-x-1">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>CASH IN</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 font-extrabold text-[11px] flex items-center space-x-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>CASH OUT</span>
                        </span>
                      )}
                      <span className={`font-mono font-black text-base ${e.type === 'CASH_IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                        {e.type === 'CASH_IN' ? '+' : '-'}₹{e.amount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {e.category}
                    </div>

                    {e.notes && (
                      <div className={`text-[11px] font-medium p-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200/80 text-slate-600'
                        }`}>
                        {e.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Pagination & Mobile Load More Controls */}
              <PaginationControls
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalItems={filteredEntries.length}
                pageSizeOptions={[5, 10, 15, 20]}
                mobileVisibleCount={mobileVisibleCount}
                onMobileLoadMore={() => setMobileVisibleCount((prev) => prev + 20)}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Add Cash Entry Modal ───────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className={`w-full max-w-md border rounded-2xl p-6 shadow-2xl space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200/80 text-slate-900'
            }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200/80'
              }`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-brand-primary flex items-center justify-center flex-shrink-0 border border-sky-200/60">
                  <BookOpen className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">Record Cash Book Entry</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Daily counter cash drawer log</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${isDarkMode
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4 text-xs">
              {/* Type Toggle */}
              <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100/80 border-slate-200'
                }`}>
                <button
                  type="button"
                  onClick={() => { setEntryType('CASH_IN'); setCategory('Counter Sales'); }}
                  className={`py-3 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${entryType === 'CASH_IN'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/80 shadow-xs'
                    : isDarkMode
                      ? 'border-transparent text-slate-400 hover:text-slate-200'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  <span>CASH IN (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setEntryType('CASH_OUT'); setCategory('Shop Expense'); }}
                  className={`py-3 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${entryType === 'CASH_OUT'
                    ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700/80 shadow-xs'
                    : isDarkMode
                      ? 'border-transparent text-slate-400 hover:text-slate-200'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400 stroke-[2.5]" />
                  <span>CASH OUT (-)</span>
                </button>
              </div>

              {/* Date */}
              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Ledger Entry Date *
                </label>
                <CustomDatePicker
                  value={entryDate}
                  onChange={(d) => setEntryDate(d)}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Category / Reason *
                </label>
                <CustomSelect
                  options={
                    entryType === 'CASH_IN'
                      ? [
                        { value: 'Counter Sales', label: 'Counter Sales' },
                        { value: 'Udhar Repayment Received', label: 'Udhar Repayment Received' },
                        { value: 'Old Device Buyback Sale', label: 'Old Device Buyback Sale' },
                        { value: 'Other Cash Deposit', label: 'Other Cash Deposit' }
                      ]
                      : [
                        { value: 'Shop Expense', label: 'Shop Expense (Tea/Snacks/Electricity)' },
                        { value: 'Supplier Payment Cash Out', label: 'Supplier Payment Cash Out' },
                        { value: 'Customer Refund', label: 'Customer Refund' },
                        { value: 'Personal Owner Cash Out', label: 'Personal Owner Cash Out' }
                      ]
                  }
                  value={category}
                  onChange={(val) => setCategory(val)}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (₹ Rupees) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-extrabold font-mono focus:outline-none focus:border-brand-primary transition-colors ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Ramesh sharma down payment or Tea expense"
                  className={`w-full px-3.5 py-2.5 rounded-xl border font-semibold focus:outline-none focus:border-brand-primary transition-colors resize-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                />
              </div>

              {/* Actions */}
              <div className="pt-1 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-black text-xs shadow-md shadow-brand-primary/20 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Cash Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
