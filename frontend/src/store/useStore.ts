import { create } from 'zustand';
import type {
  ActiveModule,
  Customer,
  PersonalFinance,
  FinancePayment,
  Product,
  Sale,
  Expense,
  CashBookEntry,
  Supplier,
  AuditLog,
  KPIStats
} from '../types';

interface StoreState {
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colorTheme: string;
  setColorTheme: (theme: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchModalOpen: boolean;
  setSearchModalOpen: (open: boolean) => void;
  isQuickActionOpen: boolean;
  setQuickActionOpen: (open: boolean) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;

  // Universal Record Payment Modal (global, syncs all pages)
  isPaymentModalOpen: boolean;
  paymentModalFinanceId: string | null;  // null = open with search
  openPaymentModal: (financeId?: string) => void;
  closePaymentModal: () => void;

  // Domain Data
  customers: Customer[];
  finances: PersonalFinance[];
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  cashBook: CashBookEntry[];
  suppliers: Supplier[];
  auditLogs: AuditLog[];
  stats: KPIStats;

  // Actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  addFinanceRecord: (finance: Omit<PersonalFinance, 'id' | 'paymentsHistory'>) => void;
  addFinancePayment: (financeId: string, amount: number, method: 'CASH' | 'UPI' | 'CARD' | 'BANK', notes?: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  addSale: (sale: Omit<Sale, 'id' | 'invoiceNo' | 'saleDate'>) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'expenseDate'>) => void;
  addCashEntry: (entry: Omit<CashBookEntry, 'id' | 'date'>) => void;
}

export const useStore = create<StoreState>((set) => ({
  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  isMobileMenuOpen: false,
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  isDarkMode: false,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  colorTheme: localStorage.getItem('dukaanpro_theme') || 'blue',
  setColorTheme: (theme) => {
    localStorage.setItem('dukaanpro_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ colorTheme: theme });
  },
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  isSearchModalOpen: false,
  setSearchModalOpen: (open) => set({ isSearchModalOpen: open }),
  isQuickActionOpen: false,
  setQuickActionOpen: (open) => set({ isQuickActionOpen: open }),
  selectedProductId: null,
  setSelectedProductId: (id) => set({ selectedProductId: id }),

  // Universal Record Payment Modal
  isPaymentModalOpen: false,
  paymentModalFinanceId: null,
  openPaymentModal: (financeId?) => set({ isPaymentModalOpen: true, paymentModalFinanceId: financeId ?? null }),
  closePaymentModal: () => set({ isPaymentModalOpen: false, paymentModalFinanceId: null }),

  // Mock Realistic Data for Mobile & Electronics Shop
  customers: [
    {
      id: 'cust-101',
      fullName: 'Rajesh Kumar',
      mobileNumber: '9876543210',
      altNumber: '9876500000',
      address: 'Shop #14, Main Electronics Market',
      city: 'Delhi',
      state: 'Delhi',
      gstNumber: '07AAAAA0000A1Z5',
      status: 'ACTIVE',
      totalOutstanding: 28500,
      totalFinancesCount: 1,
      createdAt: '2026-06-15'
    },
    {
      id: 'cust-102',
      fullName: 'Vikram Singh',
      mobileNumber: '9811223344',
      address: 'B-42, Karol Bagh',
      city: 'Delhi',
      state: 'Delhi',
      status: 'ACTIVE',
      totalOutstanding: 14200,
      totalFinancesCount: 1,
      createdAt: '2026-07-02'
    },
    {
      id: 'cust-103',
      fullName: 'Neha Sharma',
      mobileNumber: '9988776655',
      address: 'Flat 302, Green Park',
      city: 'Delhi',
      state: 'Delhi',
      status: 'ACTIVE',
      totalOutstanding: 0,
      totalFinancesCount: 0,
      createdAt: '2026-07-10'
    }
  ],

  finances: [
    {
      id: 'fin-801',
      customerId: 'cust-101',
      customerName: 'Rajesh Kumar',
      customerPhone: '9876543210',
      productDetails: 'Apple iPhone 15 Pro (256GB Natural Titanium) - IMEI: 359124098124901',
      purchaseDate: '2026-06-15',
      totalProductPrice: 134900,
      downPayment: 34900,
      principalRemaining: 100000,
      interestRateMonthly: 1.5,
      totalInterestAccumulated: 3500,
      totalPaid: 75000,
      currentBalance: 28500,
      status: 'ACTIVE',
      notes: 'Custom EMI agreement with weekly flexible payments.',
      paymentsHistory: [
        {
          id: 'pay-01',
          financeId: 'fin-801',
          amount: 25000,
          paymentDate: '2026-06-25',
          paymentMethod: 'UPI',
          receiptNo: 'REC-2026-091',
          notes: 'First partial payment via PhonePe'
        },
        {
          id: 'pay-02',
          financeId: 'fin-801',
          amount: 50000,
          paymentDate: '2026-07-10',
          paymentMethod: 'CASH',
          receiptNo: 'REC-2026-142',
          notes: 'Cash payment at store counter'
        }
      ]
    },
    {
      id: 'fin-802',
      customerId: 'cust-102',
      customerName: 'Vikram Singh',
      customerPhone: '9811223344',
      productDetails: 'Samsung Galaxy S24 Ultra (512GB Titanium Gray) - IMEI: 358992019482710',
      purchaseDate: '2026-07-02',
      totalProductPrice: 129999,
      downPayment: 49999,
      principalRemaining: 80000,
      interestRateMonthly: 1.8,
      totalInterestAccumulated: 2200,
      totalPaid: 68000,
      currentBalance: 14200,
      status: 'ACTIVE',
      notes: 'Flexible payment timeline.',
      paymentsHistory: [
        {
          id: 'pay-03',
          financeId: 'fin-802',
          amount: 68000,
          paymentDate: '2026-07-14',
          paymentMethod: 'UPI',
          receiptNo: 'REC-2026-189',
          notes: 'GooglePay Transfer'
        }
      ]
    }
  ],

  products: [
    {
      id: 'prod-01',
      name: 'iPhone 15 Pro Max',
      brand: 'Apple',
      category: 'Mobile',
      isMobile: true,
      sku: 'APL-IP15PM-256',
      barcode: '8806091234567',
      hsnCode: '85171200',
      gstRate: 18,
      purchasePrice: 132000,
      sellingPrice: 144900,
      wholesalePrice: 139000,
      stockQuantity: 8,
      minStockAlert: 3,
      warrantyMonths: 12,
      supplierName: 'Apple India Direct Logistics',
      status: 'IN_STOCK',
      variants: [
        { id: 'v1', color: 'Natural Titanium', storage: '256GB', ram: '8GB', imei1: '354892109823141', isSold: false },
        { id: 'v2', color: 'Blue Titanium', storage: '256GB', ram: '8GB', imei1: '354892109823142', isSold: false }
      ]
    },
    {
      id: 'prod-02',
      name: 'Galaxy S24 Ultra 5G',
      brand: 'Samsung',
      category: 'Mobile',
      isMobile: true,
      sku: 'SAM-S24U-512',
      barcode: '8806097654321',
      hsnCode: '85171200',
      gstRate: 18,
      purchasePrice: 118000,
      sellingPrice: 129999,
      stockQuantity: 2,
      minStockAlert: 4,
      warrantyMonths: 12,
      supplierName: 'Samsung Electronics India',
      status: 'LOW_STOCK'
    },
    {
      id: 'prod-03',
      name: 'Anker 65W Fast Charger (GaN)',
      brand: 'Anker',
      category: 'Accessories',
      isMobile: false,
      sku: 'ANK-CHG-65W',
      barcode: '848061099881',
      hsnCode: '85044090',
      gstRate: 18,
      purchasePrice: 1800,
      sellingPrice: 2999,
      stockQuantity: 24,
      minStockAlert: 5,
      warrantyMonths: 24,
      supplierName: 'Global Tech Accessories Corp',
      status: 'IN_STOCK'
    },
    {
      id: 'prod-04',
      name: 'AirPods Pro (2nd Gen Type-C)',
      brand: 'Apple',
      category: 'Accessories',
      isMobile: false,
      sku: 'APL-APP2-USBC',
      barcode: '194253397473',
      hsnCode: '85183000',
      gstRate: 18,
      purchasePrice: 19500,
      sellingPrice: 24900,
      stockQuantity: 1,
      minStockAlert: 3,
      warrantyMonths: 12,
      supplierName: 'Apple India Direct Logistics',
      status: 'LOW_STOCK'
    }
  ],

  sales: [
    {
      id: 'sale-901',
      invoiceNo: 'INV-2026-0481',
      customerName: 'Neha Sharma',
      customerPhone: '9988776655',
      items: [
        {
          productId: 'prod-03',
          productName: 'Anker 65W Fast Charger (GaN)',
          quantity: 2,
          unitPrice: 2999,
          gstRate: 18,
          total: 5998
        }
      ],
      subTotal: 5083.05,
      gstTotal: 914.95,
      discount: 0,
      grandTotal: 5998,
      paymentMethod: 'UPI',
      paidAmount: 5998,
      dueAmount: 0,
      saleDate: '2026-07-21 14:30',
      isGstInvoice: true
    }
  ],

  expenses: [
    {
      id: 'exp-01',
      category: 'Rent',
      amount: 45000,
      vendorName: 'Shree Krishna Properties',
      notes: 'Monthly store front rent for July 2026',
      expenseDate: '2026-07-01'
    },
    {
      id: 'exp-02',
      category: 'Electricity',
      amount: 8400,
      vendorName: 'BSES Rajdhani Power',
      notes: 'Air conditioner & display light bill',
      expenseDate: '2026-07-15'
    }
  ],

  cashBook: [
    {
      id: 'cb-01',
      type: 'CASH_IN',
      category: 'Finance Collection',
      amount: 50000,
      notes: 'Cash payment received from Rajesh Kumar for iPhone finance',
      date: '2026-07-10 16:45'
    },
    {
      id: 'cb-02',
      type: 'CASH_OUT',
      category: 'Electricity Bill',
      amount: 8400,
      notes: 'Paid BSES bill in cash',
      date: '2026-07-15 11:20'
    }
  ],

  suppliers: [
    {
      id: 'sup-01',
      companyName: 'Apple India Direct Logistics',
      contactName: 'Sanjay Kapoor',
      phone: '9810012345',
      email: 'sanjay@apple-distributor.in',
      gstin: '07AAACA1234F1ZN',
      outstandingBalance: 145000,
      address: 'Okhla Industrial Area Phase 3, New Delhi'
    },
    {
      id: 'sup-02',
      companyName: 'Samsung Electronics India Ltd',
      contactName: 'Praveen Mehta',
      phone: '9811199887',
      email: 'praveen@samsung.com',
      gstin: '07AAACS5678G1ZP',
      outstandingBalance: 210000,
      address: 'Sector 62, Noida, UP'
    }
  ],

  auditLogs: [
    {
      id: 'log-01',
      timestamp: '2026-07-21 14:30:15',
      userName: 'Super Admin',
      userRole: 'Admin',
      action: 'CREATE',
      module: 'Sales Terminal',
      details: 'Generated GST Invoice #INV-2026-0481 for Neha Sharma (₹5,998 via UPI)'
    },
    {
      id: 'log-02',
      timestamp: '2026-07-21 11:15:42',
      userName: 'Super Admin',
      userRole: 'Admin',
      action: 'PAYMENT_RECEIVED',
      module: 'Personal Finance',
      details: 'Recorded UPI Payment of ₹68,000 for Vikram Singh (Finance #fin-802)'
    }
  ],

  stats: {
    todaysSales: 48500,
    todaysCollection: 62000,
    todaysProfit: 9800,
    todaysExpenses: 1200,
    cashInHand: 142500,
    bankBalance: 489000,
    outstandingFinance: 42700,
    pendingCustomersCount: 2,
    lowStockCount: 2,
    monthlyRevenue: 1845000,
    monthlyProfit: 312000
  },

  // Actions
  addCustomer: (customerData) =>
    set((state) => {
      const newCust: Customer = {
        ...customerData,
        id: `cust-${Date.now()}`,
        totalOutstanding: 0,
        totalFinancesCount: 0,
        createdAt: new Date().toISOString().split('T')[0]
      };
      return { customers: [newCust, ...state.customers] };
    }),

  addFinanceRecord: (financeData) =>
    set((state) => {
      const newFin: PersonalFinance = {
        ...financeData,
        id: `fin-${Date.now()}`,
        paymentsHistory: []
      };
      return { finances: [newFin, ...state.finances] };
    }),

  addFinancePayment: (financeId, amount, method, notes) =>
    set((state) => {
      const updatedFinances = state.finances.map((fin) => {
        if (fin.id !== financeId) return fin;
        const newPaid = fin.totalPaid + amount;
        const newBalance = Math.max(0, fin.currentBalance - amount);
        const newPayment: FinancePayment = {
          id: `pay-${Date.now()}`,
          financeId,
          amount,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: method,
          receiptNo: `REC-${Date.now().toString().slice(-5)}`,
          notes
        };

        return {
          ...fin,
          totalPaid: newPaid,
          currentBalance: newBalance,
          status: newBalance === 0 ? ('CLOSED' as const) : fin.status,
          paymentsHistory: [newPayment, ...fin.paymentsHistory]
        };
      });

      return { finances: updatedFinances };
    }),

  addProduct: (productData) =>
    set((state) => {
      const newProd: Product = {
        ...productData,
        id: `prod-${Date.now()}`
      };
      return { products: [newProd, ...state.products] };
    }),

  addSale: (saleData) =>
    set((state) => {
      const newSale: Sale = {
        ...saleData,
        id: `sale-${Date.now()}`,
        invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        saleDate: new Date().toLocaleString()
      };
      return { sales: [newSale, ...state.sales] };
    }),

  addExpense: (expenseData) =>
    set((state) => {
      const newExp: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}`,
        expenseDate: new Date().toISOString().split('T')[0]
      };
      return { expenses: [newExp, ...state.expenses] };
    }),

  addCashEntry: (entryData) =>
    set((state) => {
      const newEntry: CashBookEntry = {
        ...entryData,
        id: `cb-${Date.now()}`,
        date: new Date().toLocaleString()
      };
      return { cashBook: [newEntry, ...state.cashBook] };
    })
}));
