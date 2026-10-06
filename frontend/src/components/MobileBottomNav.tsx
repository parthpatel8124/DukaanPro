import React from 'react';
import {
  LayoutDashboard,
  Printer,
  BookOpen,
  Wallet,
  Package
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';

export const MobileBottomNav: React.FC = () => {
  const { activeModule, setActiveModule, isDarkMode } = useStore();
  const { user } = useAuthStore();

  if (user?.role === 'SUPER_ADMIN') {
    return null;
  }

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'cashbook', label: 'Cash', icon: BookOpen },
    { id: 'sales', label: 'Bill', icon: Printer, isCenter: true },
    { id: 'finance', label: 'Udhar', icon: Wallet },
    { id: 'products', label: 'Stock', icon: Package }
  ];

  return (
    <div className="md:hidden fixed bottom-2 left-1/2 -translate-x-1/2 w-full max-w-md z-50 pointer-events-none px-4">
      <nav
        className={`pointer-events-auto h-16 rounded-2xl border flex items-center justify-around px-2 shadow-xl backdrop-blur-xl ${
          isDarkMode
            ? 'bg-slate-900/95 border-slate-800 text-slate-400 shadow-slate-950/80'
            : 'bg-white/95 border-slate-200/90 text-slate-500 shadow-slate-900/10'
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id as any)}
                className="relative -top-4 flex flex-col items-center justify-center cursor-pointer group active:scale-95 transition-all"
                title={item.label}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg relative ${
                    isActive
                      ? 'btn-gradient-primary text-white scale-105 shadow-brand-primary/40'
                      : 'bg-slate-700 dark:bg-slate-700 text-white shadow-md hover:bg-slate-600'
                  }`}
                >
                  <Printer className="w-6 h-6 text-white" />
                  {/* Top-Right Yellow Rupee Badge */}
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center border border-white shadow-xs">
                    ₹
                  </span>
                </div>
                <span className={`text-[11px] tracking-tight font-semibold mt-1 ${
                  isActive ? 'text-brand-primary font-bold' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id as any)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer active:scale-90 select-none ${
                isActive
                  ? 'text-brand-primary font-bold bg-sky-50 dark:bg-sky-950/60'
                  : 'hover:text-slate-900 dark:hover:text-slate-200 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105 text-brand-primary' : 'opacity-75'}`} />
              <span className={`text-[11px] tracking-tight mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
