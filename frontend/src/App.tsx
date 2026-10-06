import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/useAuthStore';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { UniversalSearchModal } from './components/UniversalSearchModal';
import { QuickActionDrawer } from './components/QuickActionDrawer';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { DashboardPage } from './pages/DashboardPage';
import { CashBookPage } from './pages/CashBookPage';
import { FinancePage } from './pages/FinancePage';
import { BillBookPage } from './pages/BillBookPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { ProductsPage } from './pages/ProductsPage';
import { AddProductPage } from './pages/AddProductPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { MasterDataPage } from './pages/MasterDataPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterShopPage } from './pages/auth/RegisterShopPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

export function App() {
  const { activeModule, isSidebarCollapsed, isDarkMode, setActiveModule, isSearchModalOpen, setSearchModalOpen } = useStore();
  const { isAuthenticated, authView, user, initSession } = useAuthStore();

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Route to Admin Dashboard automatically if user is Super Admin
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && activeModule !== 'admin') {
      setActiveModule('admin' as any);
    }
  }, [user, activeModule, setActiveModule]);

  const renderActiveModule = () => {
    if (user?.role === 'SUPER_ADMIN') {
      return <AdminDashboardPage />;
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardPage />;
      case 'cashbook':
        return <CashBookPage />;
      case 'finance':
        return <FinancePage />;
      case 'sales':
        return <BillBookPage />;
      case 'customers':
        return <DirectoryPage />;
      case 'products':
        return <ProductsPage />;
      case 'add-product':
        return <AddProductPage />;
      case 'view-product':
        return <ProductDetailPage />;
      case 'master-data':
        return <MasterDataPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  // If unauthenticated, render Auth Screens
  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
        {authView === 'REGISTER' ? <RegisterShopPage /> : <LoginPage />}
      </>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} antialiased font-sans`}>
      {/* Navigation Shell */}
      <Sidebar />
      <Header />
      <MobileBottomNav />
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />

      {/* Global Modals & Drawers */}
      <UniversalSearchModal />
      <QuickActionDrawer />
      <RecordPaymentModal />
      <CommandPaletteModal
        isOpen={isSearchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onNavigate={(mod) => setActiveModule(mod as any)}
      />

      {/* Main Page View */}
      <main
        className={`transition-all duration-300 min-h-[calc(100vh-1.25rem)] pt-20 pb-20 md:pb-8 md:pt-22 px-3 sm:px-6 ${isSidebarCollapsed ? 'ml-0 md:ml-[5.75rem]' : 'ml-0 md:ml-[17rem]'
          }`}
      >
        {renderActiveModule()}
      </main>
    </div>
  );
}

export default App;
