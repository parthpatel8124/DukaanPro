import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useStore } from '../store/useStore';

export const UniversalSearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    setSearchModalOpen,
    customers = [],
    isDarkMode
  } = useStore();

  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(!isSearchModalOpen);
      }
      if (e.key === 'Escape' && isSearchModalOpen) {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, setSearchModalOpen]);

  useEffect(() => {
    if (isSearchModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSearchModalOpen]);

  if (!isSearchModalOpen) return null;

  const filteredCustomers = (customers || []).filter(
    (c) =>
      c?.fullName?.toLowerCase().includes(query.toLowerCase()) ||
      c?.mobileNumber?.includes(query)
  );

  return (
    <div
      onClick={() => setSearchModalOpen(false)}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-6 sm:pt-20 px-3 sm:px-4 bg-slate-950/40 backdrop-blur-xs animate-fadeIn cursor-pointer"
    >
      <div
        className={`w-full max-w-2xl border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] cursor-default ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-4 py-3.5 border-b flex items-center space-x-3 ${isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'}`}>
          <Search className="w-4 h-4 text-brand-primary" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, devices, IMEI..."
            className={`flex-1 bg-transparent text-sm focus:outline-none ${isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-100">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setSearchModalOpen(false)}
            className={`px-2 py-1 text-xs font-mono rounded-md border ${
              isDarkMode ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-500 bg-slate-200 border-slate-300'
            }`}
          >
            ESC
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {!query && (
            <div className="text-center py-8 text-slate-400 italic">
              Type to search customer database...
            </div>
          )}

          {query && filteredCustomers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Customers ({filteredCustomers.length})</p>
              <div className="space-y-1.5">
                {filteredCustomers.map((cust) => (
                  <div
                    key={cust.id}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <p className="text-slate-400 font-mono text-xs">{cust.mobileNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
