import React from 'react';
import { X, ShoppingCart, UserPlus, Wallet, Smartphone, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';

export const QuickActionDrawer: React.FC = () => {
  const { isQuickActionOpen, setQuickActionOpen, isDarkMode } = useStore();

  if (!isQuickActionOpen) return null;

  const quickActions = [
    { id: 'sales', title: 'New Sale', desc: 'Scan barcode/IMEI & issue invoice', icon: ShoppingCart },
    { id: 'finance', title: 'Receive Udhar Payment', desc: 'Log customer partial cash/UPI payment', icon: Wallet },
    { id: 'customers', title: 'Add Customer', desc: 'Create profile & contact ledger', icon: UserPlus },
    { id: 'products', title: 'Add Stock & IMEI', desc: 'Scan IMEI & add device variant', icon: Smartphone }
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md">
      <div
        className={`w-full max-w-md border-l h-full p-6 flex flex-col justify-between shadow-2xl ${isDarkMode ? 'bg-black border-neutral-800 text-white' : 'bg-white border-neutral-200 text-black'
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className={`flex items-center justify-between border-b pb-4 mb-6 ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider">Quick Actions</h2>
              <p className="text-xs font-mono text-neutral-500">FAST WORKFLOW SHORTCUTS</p>
            </div>
            <button
              onClick={() => setQuickActionOpen(false)}
              className={`p-1.5 rounded-lg border ${isDarkMode ? 'text-neutral-400 bg-neutral-900 border-neutral-800' : 'text-neutral-600 bg-neutral-100 border-neutral-200'
                }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {quickActions.map((act) => {
              const Icon = act.icon;
              return (
                <div
                  key={act.id}
                  onClick={() => setQuickActionOpen(false)}
                  className={`p-4 rounded-xl border hover:scale-[1.01] cursor-pointer transition-all flex items-center justify-between group shadow-xs ${isDarkMode
                    ? 'bg-neutral-900 border-neutral-800 hover:border-white'
                    : 'bg-neutral-50 border-neutral-200 hover:border-black'
                    }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${isDarkMode ? 'bg-black border-neutral-700 text-white' : 'bg-white border-neutral-300 text-black'
                      }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold font-mono uppercase tracking-wider">{act.title}</h3>
                      <p className="text-[11px] text-neutral-500">{act.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        </div>

        <div className={`p-4 rounded-lg border text-center font-mono text-xs ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-neutral-50 border-neutral-200 text-neutral-600'
          }`}>
          Press <kbd className="px-1.5 py-0.5 rounded border border-neutral-400 font-bold">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
};
