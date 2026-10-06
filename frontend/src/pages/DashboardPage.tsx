import React, { useEffect, useState, useRef } from 'react';
import {
  TrendingUp,
  IndianRupee,
  Wallet,
  AlertTriangle,
  Activity,
  RefreshCw,
  Calendar,
  MoreHorizontal,
  Sun,
  CloudSun,
  Sunset
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { CustomSelect } from '../components/CustomSelect';
import { CustomDatePicker } from '../components/CustomDatePicker';
import {
  fetchDashboardStats,
  fetchRevenueTrend
} from '../services/api';
import type {
  DashboardStatsAPI,
  RevenueTrendAPI
} from '../services/api';

export const DashboardPage: React.FC = () => {
  const { isDarkMode, openPaymentModal } = useStore();
  const { user } = useAuthStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: Sun };
    if (hour < 17) return { text: 'Good Afternoon', icon: CloudSun };
    return { text: 'Good Evening', icon: Sunset };
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const [selectedPeriod, setSelectedPeriod] = useState<'TODAY' | 'CUSTOM' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_FY' | 'ALL'>('TODAY');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const datePickerRef = useRef<HTMLInputElement>(null);

  const handlePeriodChange = (val: string) => {
    if (val === 'CUSTOM') {
      setSelectedPeriod('CUSTOM');
      setTimeout(() => {
        if (datePickerRef.current) {
          try {
            datePickerRef.current.showPicker();
          } catch {
            datePickerRef.current.click();
          }
        }
      }, 50);
    } else {
      setSelectedPeriod(val as any);
    }
  };

  const [stats, setStats] = useState<DashboardStatsAPI | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueTrendAPI[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBackendData = async () => {
    setLoading(true);
    try {
      const [sData, rData] = await Promise.all([
        fetchDashboardStats(selectedPeriod, customDate),
        fetchRevenueTrend(selectedPeriod, customDate)
      ]);
      setStats(sData);
      setRevenueData(rData);
    } catch (err) {
      console.error('API loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, [selectedPeriod, customDate]);

  const getSalesTitle = () => {
    switch (selectedPeriod) {
      case 'TODAY': return "Today's Sales Revenue";
      case 'CUSTOM': return `Sales Revenue (${customDate})`;
      case 'THIS_WEEK': return "This Week's Sales Revenue";
      case 'THIS_MONTH': return "This Month's Sales Revenue";
      case 'THIS_FY': return "FY 2026-27 Sales Revenue";
      case 'ALL': return "Lifetime Sales Revenue";
      default: return "Today's Sales Revenue";
    }
  };

  const getCollectionTitle = () => {
    switch (selectedPeriod) {
      case 'TODAY': return "Today's Cash Collected";
      case 'CUSTOM': return `Cash Collection (${customDate})`;
      case 'THIS_WEEK': return "This Week's Cash Collection";
      case 'THIS_MONTH': return "This Month's Cash Collection";
      case 'THIS_FY': return "FY 2026-27 Cash Collection";
      case 'ALL': return "Lifetime Cash Collection";
      default: return "Today's Cash Collected";
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Full-Width Top Header Background Canvas with Store Illustration & Bottom Gradient Fade */}
      <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3.5 sm:px-6 pt-4 sm:pt-6 pb-12 sm:pb-14 bg-gradient-to-b from-sky-100/70 via-blue-50/40 to-slate-50/0 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950/0 relative overflow-hidden">
        {/* Background Decorative Store Front Graphic Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 sm:opacity-35 dark:opacity-15 pointer-events-none flex items-center justify-end pr-2 sm:pr-6">
          <svg viewBox="0 0 200 160" className="h-full text-brand-primary fill-current">
            <path d="M20 140 H180 V80 H20 Z" opacity="0.1" />
            <path d="M10 80 Q100 40 190 80 L180 50 H20 Z" opacity="0.2" />
            <circle cx="150" cy="95" r="14" opacity="0.2" />
            <path d="M145 95 L155 95 M150 90 L150 100" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />
            <path d="M40 140 V100 H90 V140" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.3" />
            <path d="M110 120 L130 100 L150 110 L170 85" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.4" />
          </svg>
        </div>

        <div className="relative z-10 space-y-0.5 sm:space-y-1 max-w-xl">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-brand-primary">
            <span>{greeting.text}, {user?.fullName || 'Shop Owner'}</span>
            <GreetingIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Store Performance & Analytics
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            Real-time tracking of daily sales, cash register balance, inventory &amp; Udhar payables
          </p>
        </div>
      </div>

      {/* Action Bar Container (Floating Date Dropdown + Receive Payment + Refresh - ALL IN ONE ROW) */}
      <div className={`-mt-8 sm:-mt-10 relative z-20 p-2 sm:p-3 rounded-2xl border shadow-xs flex flex-row items-center justify-between gap-1.5 sm:gap-3 ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
      }`}>
        {/* Date Filter Dropdown & Custom Date Picker */}
        <div className="flex-1 min-w-0 flex items-center space-x-2">
          <CustomSelect
            options={[
              { value: 'TODAY', label: "Today's Data" },
              { value: 'CUSTOM', label: selectedPeriod === 'CUSTOM' ? `Date: ${customDate}` : 'Pick Specific Date' },
              { value: 'THIS_WEEK', label: 'This Week' },
              { value: 'THIS_MONTH', label: 'This Month' },
              { value: 'THIS_FY', label: 'Current FY (2026-27)' },
              { value: 'ALL', label: 'All Time Data' }
            ]}
            value={selectedPeriod}
            onChange={handlePeriodChange}
            icon={<Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            className="flex-1 min-w-0"
          />

          {selectedPeriod === 'CUSTOM' && (
            <CustomDatePicker
              value={customDate}
              onChange={(dateStr) => {
                setCustomDate(dateStr);
                setSelectedPeriod('CUSTOM');
              }}
              className="w-36 sm:w-44 flex-shrink-0 animate-fadeIn"
            />
          )}
        </div>

        {/* Receive Payment Button */}
        <button
          onClick={() => openPaymentModal()}
          className="flex-shrink-0 h-10 sm:h-10.5 px-2.5 sm:px-5 rounded-xl btn-gradient-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 cursor-pointer active:scale-98"
        >
          <div className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <IndianRupee className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
          </div>
          <span className="whitespace-nowrap">Receive Payment</span>
        </button>

        {/* Refresh Icon Button */}
        <button
          onClick={loadBackendData}
          disabled={loading}
          className={`w-10 sm:w-10.5 h-10 sm:h-10.5 rounded-xl border flex items-center justify-center transition-all shadow-xs flex-shrink-0 cursor-pointer ${
            isDarkMode
              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 text-brand-primary ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className={`p-3 sm:p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between min-h-[115px] sm:min-h-[155px] group interactive-card cursor-pointer ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-15 sm:opacity-20 text-brand-primary">
            <svg width="100" height="50" viewBox="0 0 130 70" fill="none">
              <path d="M0 50 Q 30 20, 65 40 T 130 10 L 130 70 L 0 70 Z" fill="currentColor" opacity="0.3" />
              <path d="M0 50 Q 30 20, 65 40 T 130 10" stroke="currentColor" strokeWidth="3" />
            </svg>
          </div>

          <div className="flex items-start justify-between relative z-10 gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{getSalesTitle()}</span>
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl bg-sky-50 dark:bg-sky-950/60 text-brand-primary flex items-center justify-center flex-shrink-0 border border-sky-200/60 dark:border-sky-800/60 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="space-y-0.5 sm:space-y-1 relative z-10 mt-1.5 sm:mt-3">
            {loading ? (
              <div className="h-7 sm:h-9 w-28 sm:w-36 skeleton-shimmer my-1" />
            ) : (
              <h3 className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate font-mono">
                ₹{stats ? stats.todaysSales.toLocaleString('en-IN') : 0}
              </h3>
            )}
            <div className="flex flex-wrap items-center gap-1">
              <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-brand-primary text-[10px] sm:text-xs font-bold border border-sky-200/60">
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>{stats?.salesGrowth || '0%'}</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 hidden xs:inline">vs Yesterday</span>
            </div>
          </div>
        </div>

        <div className={`p-3 sm:p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between min-h-[115px] sm:min-h-[155px] group interactive-card cursor-pointer ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="absolute right-2 bottom-0 pointer-events-none opacity-15 sm:opacity-20 flex items-end space-x-1 h-10 sm:h-16 text-emerald-500">
            <div className="w-1.5 h-5 sm:w-2.5 sm:h-8 bg-current rounded-t-sm" />
            <div className="w-1.5 h-8 sm:w-2.5 sm:h-12 bg-current rounded-t-sm" />
            <div className="w-1.5 h-4 sm:w-2.5 sm:h-6 bg-current rounded-t-sm" />
            <div className="w-1.5 h-9 sm:w-2.5 sm:h-14 bg-current rounded-t-sm" />
          </div>

          <div className="flex items-start justify-between relative z-10 gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{getCollectionTitle()}</span>
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-200/60 dark:border-emerald-800/60 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="space-y-0.5 sm:space-y-1 relative z-10 mt-1.5 sm:mt-3">
            {loading ? (
              <div className="h-7 sm:h-9 w-28 sm:w-36 skeleton-shimmer my-1" />
            ) : (
              <h3 className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate font-mono">
                ₹{stats ? stats.todaysCollection.toLocaleString('en-IN') : 0}
              </h3>
            )}
            <div className="flex flex-wrap items-center gap-1">
              <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-bold border border-emerald-200/60">
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>{stats?.collectionGrowth || '0%'}</span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 hidden xs:inline">vs Yesterday</span>
            </div>
          </div>
        </div>

        <div className={`p-3 sm:p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between min-h-[115px] sm:min-h-[155px] group interactive-card cursor-pointer ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-15 sm:opacity-20 text-amber-500">
            <svg width="90" height="50" viewBox="0 0 120 70" fill="none">
              <path d="M10 60 Q 40 10, 80 50 T 120 20" stroke="currentColor" strokeWidth="2" />
              <path d="M0 40 Q 30 20, 70 60 T 120 30" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="flex items-start justify-between relative z-10 gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 truncate">Outstanding Udhari</span>
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 border border-amber-200/60 dark:border-amber-800/60 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="space-y-0.5 sm:space-y-1 relative z-10 mt-1.5 sm:mt-3">
            {loading ? (
              <div className="h-7 sm:h-9 w-28 sm:w-36 skeleton-shimmer my-1" />
            ) : (
              <h3 className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate font-mono">
                ₹{stats ? stats.outstandingFinance.toLocaleString('en-IN') : 0}
              </h3>
            )}
            <div>
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-bold border border-amber-200/60 truncate max-w-full">
                {stats?.pendingCustomersCount || 0} Accounts
              </span>
            </div>
          </div>
        </div>

        <div className={`p-3 sm:p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between min-h-[115px] sm:min-h-[155px] group interactive-card cursor-pointer ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="absolute -right-6 -bottom-6 pointer-events-none opacity-15 sm:opacity-20 text-rose-500">
            <svg width="85" height="85" viewBox="0 0 120 120">
              <circle cx="90" cy="90" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="90" cy="90" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex items-start justify-between relative z-10 gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 truncate">Low Stock Alerts</span>
            <div className="w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 border border-rose-200/60 dark:border-rose-800/60 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="space-y-0.5 sm:space-y-1 relative z-10 mt-1.5 sm:mt-3">
            {loading ? (
              <div className="h-7 sm:h-9 w-28 sm:w-36 skeleton-shimmer my-1" />
            ) : (
              <h3 className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate font-mono">
                {stats ? stats.lowStockCount : 0} Devices
              </h3>
            )}
            <div>
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] sm:text-xs font-bold border border-rose-200/60 truncate max-w-full">
                Requires Reorder
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-4 sm:p-6 rounded-2xl border shadow-xs space-y-3 sm:space-y-4 interactive-card ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 sm:pb-2">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-brand-primary flex items-center justify-center flex-shrink-0 border border-sky-200/60 dark:border-sky-800/60">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Weekly Revenue & Profit Margin
              </h3>
              <p className="text-[11px] sm:text-xs font-medium text-slate-400 truncate">Real-time performance analytics</p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-3 sm:space-x-4 text-[11px] sm:text-xs font-bold">
              <span className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Revenue
              </span>
              <span className="flex items-center space-x-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Profit
              </span>
            </div>

            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="h-52 sm:h-72 w-full pt-1 sm:pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="day" stroke={isDarkMode ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} tickMargin={6} />
              <YAxis stroke={isDarkMode ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} axisLine={false} width={36} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={`p-3 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all animate-fadeIn space-y-1.5 text-xs ${
                        isDarkMode ? 'bg-slate-900/98 border-slate-800 text-white shadow-slate-950/90' : 'bg-white/98 border-slate-200/90 text-slate-900 shadow-slate-900/15'
                      }`}>
                        <p className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 border-b pb-1 border-slate-200 dark:border-slate-800">
                          {label} Summary
                        </p>
                        <div className="space-y-1 pt-0.5 font-extrabold">
                          <div className="flex items-center justify-between space-x-4">
                            <span className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                              <span>Revenue:</span>
                            </span>
                            <span className="font-mono text-slate-900 dark:text-white">
                              ₹{payload[0]?.value?.toLocaleString('en-IN') || 0}
                            </span>
                          </div>
                          {payload[1] && (
                            <div className="flex items-center justify-between space-x-4">
                              <span className="flex items-center space-x-1.5 text-sky-400">
                                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                                <span>Profit:</span>
                              </span>
                              <span className="font-mono text-slate-900 dark:text-white">
                                ₹{payload[1]?.value?.toLocaleString('en-IN') || 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="profit" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProf)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
