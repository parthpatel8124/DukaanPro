// DukaanPro ERP TypeScript Domain Models

export type ActiveModule =
  | 'dashboard'
  | 'customers'
  | 'finance'
  | 'products'
  | 'add-product'
  | 'view-product'
  | 'inventory'
  | 'sales'
  | 'purchases'
  | 'suppliers'
  | 'cashbook'
  | 'expenses'
  | 'invoices'
  | 'reports'
  | 'audit'
  | 'settings'
  | 'master-data'
  | 'admin';

export interface Customer {
  id: string;
  fullName: string;
  mobileNumber: string;
  altNumber?: string;
  address: string;
  city: string;
  state: string;
  gstNumber?: string;
  photoUrl?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  totalOutstanding: number;
  totalFinancesCount: number;
  createdAt: string;
}

export interface FinancePayment {
  id: string;
  financeId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'BANK';
  receiptNo: string;
  notes?: string;
}

export interface PersonalFinance {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  productDetails: string; // e.g. "iPhone 15 Pro Max 256GB Natural Titanium (IMEI: 35489210982314)"
  purchaseDate: string;
  totalProductPrice: number;
  downPayment: number;
  principalRemaining: number;
  interestRateMonthly: number; // e.g. 1.5% per month
  totalInterestAccumulated: number;
  totalPaid: number;
  currentBalance: number;
  status: 'ACTIVE' | 'CLOSED' | 'OVERDUE' | 'BAD_DEBT';
  paymentsHistory: FinancePayment[];
  notes?: string;
}

export interface ProductVariant {
  id: string;
  color?: string;
  storage?: string;
  ram?: string;
  imei1?: string;
  imei2?: string;
  isSold: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'Mobile' | 'Electronics' | 'Accessories' | 'Spare Parts';
  isMobile: boolean;
  sku: string;
  barcode: string;
  hsnCode: string;
  gstRate: number; // 18, 12, 5, 28
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  stockQuantity: number;
  minStockAlert: number;
  warrantyMonths: number;
  variants?: ProductVariant[];
  supplierName: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  total: number;
  imei?: string;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  items: SaleItem[];
  subTotal: number;
  gstTotal: number;
  discount: number;
  grandTotal: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'FINANCE' | 'SPLIT';
  paidAmount: number;
  dueAmount: number;
  saleDate: string;
  isGstInvoice: boolean;
}

export interface Expense {
  id: string;
  category: 'Rent' | 'Electricity' | 'Internet' | 'Salary' | 'Repair' | 'Transport' | 'Office' | 'Marketing';
  amount: number;
  vendorName?: string;
  notes: string;
  expenseDate: string;
}

export interface CashBookEntry {
  id: string;
  type: 'CASH_IN' | 'CASH_OUT';
  category: string;
  amount: number;
  notes: string;
  date: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  gstin?: string;
  outstandingBalance: number;
  address: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: 'Admin' | 'Manager' | 'Staff';
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT_RECEIVED' | 'FINANCE_ISSUED';
  module: string;
  details: string;
}

export interface KPIStats {
  todaysSales: number;
  todaysCollection: number;
  todaysProfit: number;
  todaysExpenses: number;
  cashInHand: number;
  bankBalance: number;
  outstandingFinance: number;
  pendingCustomersCount: number;
  lowStockCount: number;
  monthlyRevenue: number;
  monthlyProfit: number;
}
