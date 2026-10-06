import React, { useEffect, useState } from 'react';
import {
  Building2,
  FileText,
  Package,
  TrendingUp,
  Search,
  RefreshCw,
  Ban,
  CheckCircle2,
  Layers,
  Activity,
  Lock,
  BarChart3
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { fetchAdminMetrics, fetchAdminShops, toggleShopStatusAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

export const AdminDashboardPage: React.FC = () => {
  const { isDarkMode } = useStore();

  const [adminTab, setAdminTab] = useState<'METRICS' | 'SHOPS'>('METRICS');
  const [metrics, setMetrics] = useState<any>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [mRes, sRes] = await Promise.all([fetchAdminMetrics(), fetchAdminShops()]);
      setMetrics(mRes);
      setShops(sRes || []);
    } catch (err) {
      console.error('Failed loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleShopStatus = async (shopId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionText = nextStatus === 'SUSPENDED' ? 'suspend' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${actionText} this shop account?`)) return;

    const ok = await toggleShopStatusAPI(shopId, nextStatus);
    if (ok) {
      toast.success(`Shop account status updated to ${nextStatus}!`);
      loadAdminData();
    } else {
      toast.error('Failed updating shop status.');
    }
  };

  const filteredShops = shops.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.owner && s.owner.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.owner && s.owner.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.phone && s.phone.includes(searchTerm)) ||
      (s.city && s.city.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className={`p-4 sm:p-6 rounded-2xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDarkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Super Admin Platform Console</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500 text-white uppercase tracking-wider">
              SUPER ADMIN
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Strict 100% Tenant Privacy Compliant • Aggregated Platform Overview</span>
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className={`px-4 py-2.5 rounded-xl border text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
            isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Platform Stats</span>
        </button>
      </div>

      {/* 2 Dedicated Super Admin Navigation Pages/Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setAdminTab('METRICS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
            adminTab === 'METRICS'
              ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25 scale-102'
              : isDarkMode
              ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Page 1: Platform Overview & Metrics</span>
        </button>

        <button
          onClick={() => setAdminTab('SHOPS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer ${
            adminTab === 'SHOPS'
              ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25 scale-102'
              : isDarkMode
              ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Page 2: Registered Shops & Account Suspension</span>
        </button>
      </div>

      {/* PAGE 1: PLATFORM OVERVIEW & AGGREGATED METRICS */}
      {adminTab === 'METRICS' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top 4 Industrial Platform Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Registered Shops</span>
                <Building2 className="w-5 h-5 text-brand-primary" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                {metrics?.totalShops ?? shops.length ?? 1}
              </p>
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1">
                <Activity className="w-3 h-3" />
                <span>{metrics?.activeShopsToday ?? 1} Active Today</span>
              </p>
            </div>

            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Invoices Generated</span>
                <FileText className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                {metrics?.totalInvoices ?? 0}
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">Platform-wide total volume</p>
            </div>

            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Inventory Stock Items</span>
                <Package className="w-5 h-5 text-sky-500" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                {metrics?.totalProducts ?? 0}
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">{metrics?.totalDevices ?? 0} Serialized Devices</p>
            </div>

            <div className={`p-5 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Platform GMV Revenue</span>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                ₹{(metrics?.totalPlatformRevenue ?? 0).toLocaleString()}
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">Aggregated platform billing</p>
            </div>
          </div>

          {/* Privacy & Security Guarantee Banner */}
          <div className={`p-5 rounded-2xl border flex items-start space-x-4 ${
            isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-slate-800'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                100% Business Data Privacy Guaranteed
              </h4>
              <p className="text-xs leading-relaxed opacity-90">
                DukaanPro enforces strict multi-tenant data isolation. Super Admins only monitor system health, shop registration counts, and account status. Individual customer names, private bill line items, and store transaction details are encrypted and strictly accessible only by the respective Shop Owner.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 2: REGISTERED SHOPS DIRECTORY & ACCOUNT SUSPENSION */}
      {adminTab === 'SHOPS' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Controls & Search Bar */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-brand-primary" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Registered Shop Tenant Accounts ({filteredShops.length})
                </h3>
              </div>

              {/* Filter Status Tabs */}
              <div className="flex items-center space-x-1.5">
                {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === tab
                        ? 'bg-brand-primary text-white font-extrabold'
                        : isDarkMode
                        ? 'bg-slate-950 border border-slate-800 text-slate-400'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className={`flex items-center space-x-2.5 px-3.5 py-2 rounded-xl border ${
              isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}>
              <Search className="w-4 h-4 text-brand-primary flex-shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search shop name, owner name, email, phone, or city..."
                className="w-full bg-transparent text-xs font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Shops Table */}
          <div className={`rounded-2xl border overflow-hidden shadow-xl ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {loading ? (
              <div className="p-16 text-center text-slate-400 italic text-sm">
                Loading tenant shops database...
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <Building2 className="w-12 h-12 mx-auto text-slate-400 opacity-40 mb-3" />
                <p className="font-bold text-sm">No matching shop profiles found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                  <thead>
                    <tr className={`border-b font-extrabold uppercase tracking-wider text-[10px] ${
                      isDarkMode ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <th className="py-3.5 px-4">Shop Name & City</th>
                      <th className="py-3.5 px-4">Owner & Contact</th>
                      <th className="py-3.5 px-4 text-center">Invoices Count</th>
                      <th className="py-3.5 px-4 text-center">Items Count</th>
                      <th className="py-3.5 px-4 text-center">Account Status</th>
                      <th className="py-3.5 px-4 text-right">Account Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-bold">
                    {filteredShops.map((shop) => {
                      const isSuspended = shop.status === 'SUSPENDED';
                      return (
                        <tr
                          key={shop.id}
                          className={`transition-colors ${
                            isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Shop Name & Identity */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center font-black flex-shrink-0">
                                {shop.name ? shop.name.charAt(0) : 'S'}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 dark:text-white uppercase">{shop.name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">{shop.city}, {shop.state} • GST: {shop.gstin || 'N/A'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Owner Details */}
                          <td className="py-3.5 px-4">
                            <p className="font-extrabold text-slate-800 dark:text-slate-200">{shop.owner?.fullName || 'Shop Owner'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{shop.owner?.email || shop.phone}</p>
                          </td>

                          {/* Invoices Count */}
                          <td className="py-3.5 px-4 text-center font-mono font-extrabold text-slate-700 dark:text-slate-300">
                            {shop.invoiceCount || 0}
                          </td>

                          {/* Products Count */}
                          <td className="py-3.5 px-4 text-center font-mono font-extrabold text-slate-700 dark:text-slate-300">
                            {shop.productCount || 0}
                          </td>

                          {/* Status Pill */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isSuspended
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isSuspended ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                              {shop.status || 'ACTIVE'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleToggleShopStatus(shop.id, shop.status)}
                              className={`px-3 py-1.5 rounded-lg border text-[11px] font-extrabold flex items-center justify-end space-x-1 transition-all cursor-pointer ml-auto ${
                                isSuspended
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                                  : 'bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500 hover:text-white'
                              }`}
                            >
                              {isSuspended ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              <span>{isSuspended ? 'Reactivate Account' : 'Suspend Account'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
