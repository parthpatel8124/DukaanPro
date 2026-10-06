import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Wallet,
  Printer,
  Users,
  Package,
  ChevronLeft,
  ChevronRight,
  Building2,
  Database,
  X,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { fetchStoreProfile } from '../services/api';
import type { ActiveModule } from '../types';

export const Sidebar: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    isSidebarCollapsed,
    toggleSidebar,
    isMobileMenuOpen,
    setMobileMenuOpen,
    isDarkMode
  } = useStore();
  const { user } = useAuthStore();

  const [shopName, setShopName] = useState('KISHAN ELECTRONICS');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      fetchStoreProfile().then((data) => {
        if (data && data.name) {
          setShopName(`${data.name} ${data.tagline || ''}`.trim());
        }
        if (data && data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      });
    }
  }, [user]);

  // Re-fetch when navigating away from settings (logo may have changed)
  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN' && activeModule !== 'settings') {
      fetchStoreProfile().then((data) => {
        if (data && data.name) {
          setShopName(`${data.name} ${data.tagline || ''}`.trim());
        }
        if (data) {
          setLogoUrl(data.logoUrl || '');
        }
      });
    }
  }, [activeModule, user]);

  const navGroups = user?.role === 'SUPER_ADMIN'
    ? [
      {
        title: 'PLATFORM MANAGEMENT',
        items: [
          { id: 'admin' as ActiveModule, name: 'Super Admin Console', icon: ShieldCheck }
        ]
      }
    ]
    : [
      {
        title: 'CORE MODULES',
        items: [
          { id: 'dashboard' as ActiveModule, name: 'Dashboard', icon: LayoutDashboard },
          { id: 'cashbook' as ActiveModule, name: 'Daily Cash Book', icon: BookOpen },
          { id: 'sales' as ActiveModule, name: 'Bill Book', icon: Printer }
        ]
      },
      {
        title: 'FINANCE & STOCK',
        items: [
          { id: 'finance' as ActiveModule, name: 'Personal Finance & Udhar', icon: Wallet },
          { id: 'customers' as ActiveModule, name: 'Customers & Suppliers', icon: Users },
          { id: 'products' as ActiveModule, name: 'Stock & Products', icon: Package }
        ]
      },
      {
        title: 'REGISTERS & SETUP',
        items: [
          { id: 'master-data' as ActiveModule, name: 'Master Data Registers', icon: Database },
          { id: 'settings' as ActiveModule, name: 'Shop Profile Settings', icon: Building2 }
        ]
      }
    ];

  const handleNavClick = (id: ActiveModule) => {
    setActiveModule(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden animate-fadeIn"
        />
      )}

      {/* Main Floating Glassmorphism Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 flex flex-col justify-between ${
          // Desktop sizing: collapsed 20 / expanded 64
          isSidebarCollapsed ? 'md:w-20' : 'md:w-64'
          } ${
          // Mobile slide-over: if mobile open -> w-72 translate-x-0, else -translate-x-full
          isMobileMenuOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Floating Inner Card */}
        <div
          className={`h-full md:m-2.5 md:h-[calc(100vh-1.25rem)] rounded-none md:rounded-xl border flex flex-col justify-between overflow-hidden shadow-xl backdrop-blur-2xl transition-all ${isDarkMode
            ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950/80'
            : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-900/10'
            }`}
        >
          <div className="overflow-y-auto flex-1 custom-scrollbar overscroll-contain">
            {/* Shop Brand Header Badge */}
            <div
              className={`p-3.5 border-b flex items-center transition-all ${isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
                } ${isSidebarCollapsed ? 'md:justify-center md:px-2' : 'justify-between'}`}
            >
              {/* Logo + Name group */}
              <div className={`flex items-center space-x-3 overflow-hidden ${isSidebarCollapsed ? 'md:space-x-0 md:justify-center' : ''}`}>
                <div className="relative flex-shrink-0">
                  {user?.role === 'SUPER_ADMIN' ? (
                    <div className="w-12 h-12 rounded-xl btn-gradient-primary text-white flex items-center justify-center shadow-lg">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                  ) : logoUrl ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center">
                      <img src={logoUrl} alt="Shop Logo" className="w-full h-full object-contain p-0.5" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
                      <img src="/logo.png" alt="DukaanPro" className="w-full h-full object-contain p-1" />
                    </div>
                  )}

                </div>

                <div className={`truncate flex-1 min-w-0 ${isSidebarCollapsed ? 'md:hidden' : 'block'}`}>
                  {user?.role === 'SUPER_ADMIN' ? (
                    <>
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                        DukaanPro Admin
                      </h2>
                      <p className="text-[10px] text-brand-primary font-bold tracking-tight flex items-center space-x-1 mt-0.5">
                        <Sparkles className="w-3 h-3 text-brand-primary" />
                        <span>Platform Console</span>
                      </p>
                    </>
                  ) : (
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                      {shopName}
                    </h2>
                  )}
                </div>
              </div>

              {/* Close button on mobile */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>


            {/* Grouped Pill Navigation Links */}
            <nav className="p-2.5 space-y-4">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  {/* Section Title (Only when expanded) */}
                  <div className={`px-3 pt-1 pb-1 ${isSidebarCollapsed ? 'md:hidden' : 'block'}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      {group.title}
                    </span>
                  </div>

                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-extrabold text-xs transition-all duration-200 relative group cursor-pointer active:scale-98 ${isActive
                          ? 'btn-gradient-primary text-white font-black shadow-md shadow-brand-primary/25 md:translate-x-0.5'
                          : isDarkMode
                            ? 'text-slate-400 hover:bg-sky-950/40 hover:text-sky-400 hover:translate-x-0.5'
                            : 'text-slate-600 hover:bg-sky-50/80 hover:text-brand-primary hover:translate-x-0.5'
                          } ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}`}
                        title={item.name}
                      >
                        {/* Active Left Indicator Bar */}
                        {isActive && !isSidebarCollapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.2 h-5.5 bg-white rounded-r-full shadow-sm shadow-white/80" />
                        )}

                        <div className={`flex items-center justify-center ${isSidebarCollapsed ? 'w-full' : ''}`}>
                          <Icon
                            className={`w-4.5 h-4.5 flex-shrink-0 transition-all duration-200 ${isActive ? 'text-white scale-110' : 'text-slate-400 group-hover:text-brand-primary group-hover:scale-110 group-hover:rotate-3'
                              }`}
                          />
                        </div>

                        <span className={`truncate ${isSidebarCollapsed ? 'md:hidden' : 'inline'}`}>
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* Bottom Footer Badge — DukaanPro branding */}
          {user?.role !== 'SUPER_ADMIN' && (
            <div className={`border-t px-3 py-2.5 flex items-center transition-all ${
              isDarkMode ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
            } ${isSidebarCollapsed ? 'md:justify-center' : 'justify-center'}`}>
              {/* Full logo when expanded, icon-only when collapsed */}
              <img
                src={isSidebarCollapsed ? '/logo.png' : '/full-logo.png'}
                alt="DukaanPro Enterprise"
                className={`object-contain transition-all duration-300 ${
                  isSidebarCollapsed ? 'w-9 h-9' : 'h-9 w-auto max-w-[160px]'
                }`}
              />
            </div>
          )}
        </div>
      </aside>

      {/* Badge Toggle — flat on left, rounded on right, attached to sidebar right edge at vertical center, desktop only */}
      <button
        onClick={toggleSidebar}
        title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        className={`hidden md:flex fixed top-1/2 -translate-y-1/2 z-[51] cursor-pointer group transition-all duration-300 ${
          isSidebarCollapsed ? 'left-[3.9rem]' : 'left-[14.9rem]'
        }`}
      >
        <div className={`flex items-center justify-center w-5 h-9 rounded-r-full border-y border-r transition-all duration-200 group-hover:w-6 ${
          isDarkMode
            ? 'bg-slate-800 border-slate-700 text-slate-400 group-hover:bg-brand-primary group-hover:border-brand-primary group-hover:text-white'
            : 'bg-white border-slate-200 text-slate-400 group-hover:bg-brand-primary group-hover:border-brand-primary group-hover:text-white'
        }`}>
          {isSidebarCollapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft className="w-3 h-3" />
          }
        </div>
      </button>
    </>
  );
};
