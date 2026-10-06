import React from 'react';
import {
  Search,
  Sun,
  Moon,
  Menu,
  Store,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  BookOpen,
  Wallet,
  Printer,
  Users,
  Package,
  Database,
  Building2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';

export const Header: React.FC = () => {
  const {
    activeModule,
    isDarkMode,
    toggleDarkMode,
    setSearchModalOpen,
    isSidebarCollapsed,
    toggleMobileMenu
  } = useStore();
  const { user, logout } = useAuthStore();

  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getModuleTitleAndIcon = () => {
    switch (activeModule) {
      case 'admin':
        return { title: 'Super Admin Console', icon: ShieldCheck };
      case 'dashboard':
        return { title: 'Dashboard', icon: LayoutDashboard };
      case 'cashbook':
        return { title: 'Daily Cash Book', icon: BookOpen };
      case 'finance':
        return { title: 'Personal Finance & Udhar', icon: Wallet };
      case 'sales':
        return { title: 'Bill Book', icon: Printer };
      case 'customers':
        return { title: 'Customers & Suppliers', icon: Users };
      case 'products':
        return { title: 'Stock & Products', icon: Package };
      case 'master-data':
        return { title: 'Master Data Registers', icon: Database };
      case 'settings':
        return { title: 'Shop Profile Settings', icon: Building2 };
      default:
        return { title: 'Dashboard', icon: Store };
    }
  };

  const { title, icon: ModuleIcon } = getModuleTitleAndIcon();

  return (
    <header
      className={`fixed top-0 right-0 z-30 transition-all duration-300 flex items-center justify-between h-16 ${isScrolled
        ? isSidebarCollapsed
          ? 'left-0 md:left-[5.5rem] md:right-2.5 md:top-2.5 px-2 sm:px-0 pt-2 sm:pt-0'
          : 'left-0 md:left-[16.5rem] md:right-2.5 md:top-2.5 px-2 sm:px-0 pt-2 sm:pt-0'
        : isSidebarCollapsed
          ? 'left-0 md:left-[4.5rem] right-0 top-0 px-0 pt-0'
          : 'left-0 md:left-[15.5rem] right-0 top-0 px-0 pt-0'
        }`}
    >
      {/* Dynamic Glassmorphism Container: flat at top, floating card when scrolled */}
      <div
        className={`w-full h-full flex items-center justify-between px-3 sm:px-5 transition-all duration-300 ${isScrolled
          ? isDarkMode
            ? 'rounded-xl border border-slate-800 bg-slate-900/95 text-slate-100 shadow-xl shadow-slate-950/80 backdrop-blur-2xl'
            : 'rounded-xl border border-slate-200/90 bg-white/95 text-slate-900 shadow-xl shadow-slate-900/10 backdrop-blur-2xl'
          : isDarkMode
            ? 'rounded-none border-b border-slate-800/80 bg-slate-900/80 text-slate-100 shadow-none backdrop-blur-md'
            : 'rounded-none border-b border-slate-200/60 bg-white/80 text-slate-900 shadow-none backdrop-blur-md'
          }`}
      >
        {/* Dynamic Module Title Header & Mobile Menu Trigger */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 pr-1 sm:pr-2">
          <button
            onClick={toggleMobileMenu}
            className={`md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center flex-shrink-0 active:scale-95 transition-all cursor-pointer ${isDarkMode
              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            title="Open Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
            <div className={`hidden sm:flex w-9 h-9 rounded-xl items-center justify-center flex-shrink-0 shadow-md ${user?.role === 'SUPER_ADMIN'
              ? 'btn-gradient-primary text-white'
              : 'btn-gradient-primary text-white'
              }`}>
              <ModuleIcon className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black tracking-tight truncate text-slate-900 dark:text-white">
                {title}
              </h1>
              {user?.role === 'SUPER_ADMIN' && (
                <p className="text-[10px] text-slate-400 font-bold hidden sm:block truncate">
                  Platform Management
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center Search & Right Quick Tools */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
          {/* Mobile Icon-Only Search Button vs Full Desktop Bar */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className={`hidden sm:flex items-center justify-between space-x-2 h-9 sm:h-10 px-3.5 rounded-lg border text-xs font-bold transition-all cursor-pointer sm:w-56 lg:w-72 ${isDarkMode
              ? 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            title="Search Database (Ctrl+K)"
          >
            <div className="flex items-center space-x-2 truncate">
              <Search className="w-4 h-4 text-brand-primary flex-shrink-0" />
              <span className="truncate">Search customers, IMEI...</span>
            </div>
            <kbd
              className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border flex-shrink-0 ${isDarkMode
                ? 'bg-slate-900 border-slate-700 text-slate-400'
                : 'bg-white border-slate-300 text-slate-500'
                }`}
            >
              Ctrl+K
            </kbd>
          </button>

          {/* Mobile Search Icon Button */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className={`sm:hidden w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${isDarkMode
              ? 'bg-slate-800/80 border-slate-700 text-slate-300'
              : 'bg-slate-100/80 border-slate-200 text-slate-700'
              }`}
            title="Search"
          >
            <Search className="w-4 h-4 text-brand-primary" />
          </button>

          {/* Dark/Light Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${isDarkMode
              ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              : 'bg-slate-100/80 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
              }`}
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="flex items-center space-x-2 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden sm:block text-right min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white leading-none truncate max-w-[120px]">
                  {user.fullName || 'Shop Owner'}
                </p>
                <p className="text-[10px] font-bold text-brand-primary mt-0.5 tracking-wider">
                  {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Shop Owner'}
                </p>
              </div>

              <button
                onClick={logout}
                className="p-1.5 sm:p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold flex items-center space-x-1 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
