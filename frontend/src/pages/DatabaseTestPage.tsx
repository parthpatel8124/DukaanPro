import React, { useEffect, useState } from 'react';
import { Database, RefreshCw, CheckCircle, XCircle, Smartphone, Server, Wifi } from 'lucide-react';
import { useStore } from '../store/useStore';
import { BASE_URL } from '../services/api';

export const DatabaseTestPage: React.FC = () => {
  const { isDarkMode } = useStore();
  const [products, setProducts] = useState<any[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string>('');

  const loadLiveData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Health Status
      const healthRes = await fetch(`${BASE_URL}/health`);
      const healthJson = await healthRes.json();
      setHealthStatus(healthJson);

      // 2. Fetch Products directly from PostgreSQL /api/products
      const prodRes = await fetch(`${BASE_URL}/products`);
      const prodJson = await prodRes.json();

      if (prodJson.success && Array.isArray(prodJson.data)) {
        setProducts(prodJson.data);
      } else {
        setError('Failed to parse products payload from database.');
      }
      setLastFetchedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600 to-teal-700 p-6 rounded-3xl text-white shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Live PostgreSQL Database Test</h1>
            <p className="text-xs text-emerald-100 font-medium">
              Verifying real-time database API connectivity for mobile & desktop devices
            </p>
          </div>
        </div>

        <button
          onClick={loadLiveData}
          disabled={loading}
          className="px-4 py-2.5 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Fetching DB...' : 'Refresh Live Data'}</span>
        </button>
      </div>

      {/* Network & DB Connection Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Backend API Endpoint */}
        <div className={`p-4 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>API Target Endpoint</span>
            <Server className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="font-mono font-bold text-xs text-slate-900 dark:text-white truncate">
            {BASE_URL}
          </p>
          <div className="text-[11px] text-slate-400 font-medium">
            Resolved Host: <strong className="text-emerald-600 dark:text-emerald-400">{typeof window !== 'undefined' ? window.location.hostname : 'localhost'}</strong>
          </div>
        </div>

        {/* PostgreSQL Health */}
        <div className={`p-4 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>PostgreSQL Database Status</span>
            {healthStatus?.database?.connected ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
              healthStatus?.database?.connected
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}>
              {healthStatus?.database?.connected ? 'CONNECTED (Live DB)' : 'DISCONNECTED / ERROR'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Provider: {healthStatus?.database?.provider || 'Prisma ORM'}
          </div>
        </div>

        {/* Live Fetch Info */}
        <div className={`p-4 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Live Products Count</span>
            <Wifi className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="font-mono font-black text-2xl text-emerald-600 dark:text-emerald-400">
            {products.length} Items
          </p>
          <div className="text-[11px] text-slate-400 font-medium">
            Last Updated: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{lastFetchedAt || '—'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center space-x-2">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>API Connection Error: {error}</span>
        </div>
      )}

      {/* Main Live Products Data Display */}
      <div className={`p-5 rounded-3xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex items-center justify-between">
          <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-emerald-500" />
            <span>Live PostgreSQL `/api/products` Payload</span>
          </h2>
          <span className="text-xs text-slate-400 font-bold">
            Showing {products.length} records in real-time
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
            <p>Querying PostgreSQL database over network...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-bold">
            No products found in PostgreSQL database. Add an item from the Products page to test live sync!
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className={`text-[11px] font-black uppercase tracking-wider border-b ${isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                  <tr>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Stock Qty</th>
                    <th className="py-3 px-4">Tracking Type</th>
                    <th className="py-3 px-4">SKU / ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-black uppercase text-emerald-600 dark:text-emerald-400">
                        {p.brand}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {p.category}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white">
                        ₹{p.sellingPrice?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs">
                          {p.stockQuantity} Pcs
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 text-[10px] font-black uppercase">
                          {p.trackingType || (p.isMobile ? 'SERIALIZED' : 'QUANTITY')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        {p.sku || p.id?.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden space-y-3">
              {products.map((p) => (
                <div key={p.id} className={`p-4 rounded-2xl border space-y-2 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-black text-white text-[9px] font-black uppercase">
                      {p.brand}
                    </span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{p.sellingPrice?.toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{p.name}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>Category: <strong>{p.category}</strong></span>
                    <span>Stock: <strong className="text-slate-900 dark:text-white">{p.stockQuantity} Pcs</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
