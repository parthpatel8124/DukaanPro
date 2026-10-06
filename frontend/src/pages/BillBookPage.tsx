import React, { useEffect, useState } from 'react';
import {
  Printer,
  Save,
  Plus,
  Trash2,
  Search,
  Smartphone,
  Tag,
  User,
  RefreshCw,
  ArrowLeft,
  FileText,
  Layers,
  X,
  CreditCard,
  Wallet,
  MessageSquare,
  Camera
} from 'lucide-react';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { PaginationControls } from '../components/PaginationControls';
import { toast } from 'react-hot-toast';
import { useStore } from '../store/useStore';
import {
  fetchProductsList,
  fetchDirectoryCustomers,
  fetchStoreProfile,
  fetchBillBookInvoices,
  createSalesInvoice
} from '../services/api';

interface POSItem {
  id: string;
  productId?: string;
  name: string;
  category: string;
  hsnCode: string;
  gstRate: number; // e.g. 18
  price: number; // Inclusive of GST
  quantity: number;
  imei?: string;
  ram?: string;
  storage?: string;
  color?: string;
  warrantyMonths?: number;
  discount?: number;
}

interface SavedInvoice {
  id: string;
  invoiceNo: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerState?: string;
  customerGstin?: string;
  grandTotal: number;
  subTotal: number;
  gstTotal: number;
  discount: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentMethod: string;
  saleDate: string;
  createdAt: string;
  financeRecordId?: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    imei?: string;
    hsnCode?: string;
  }>;
}

export const BillBookPage: React.FC = () => {
  const { isDarkMode, openPaymentModal } = useStore();

  // Page Mode: 'REGISTER' (Excel Sheet Table View of past bills) or 'CREATE_BILL' (Full Page Creator)
  const [viewMode, setViewMode] = useState<'REGISTER' | 'CREATE_BILL'>('REGISTER');

  // Shop Business Profile (Auto-loaded from DB)
  const [storeProfile, setStoreProfile] = useState<any>({
    name: 'KISHAN',
    tagline: 'ELECTRONICS',
    gstin: '24AUJPP7785L1ZR',
    phone: '99741 27474',
    address: 'Bazar Street, At. & Po. VALOD, Dist. Tapi, Pin - 394 640',
    city: 'VALOD',
    district: 'Tapi',
    state: 'Gujarat',
    pincode: '394640',
    jurisdiction: 'VALOD',
    terms: 'Goods once sold will not be taken back or exchanged. Guarantee/Warranty by Company.'
  });

  // DB Master Lists & Past Bills
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbCustomers, setDbCustomers] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerSearch, setRegisterSearch] = useState('');

  // Camera Barcode / IMEI Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Selected Invoice for Print View
  const [activePrintInvoice, setActivePrintInvoice] = useState<any | null>(null);

  // Customer Form State for New Bill
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerState, setCustomerState] = useState('Gujarat');
  const [customerGstin, setCustomerGstin] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Bill Meta
  const [invoiceNumber, setInvoiceNumber] = useState(`KE-INV-${Date.now().toString().slice(-6)}`);
  const [paymentMode, setPaymentMode] = useState('CASH');

  // Items in Current Bill
  const [items, setItems] = useState<POSItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Multi-Device Picker Modal State for Father-Friendly UX
  const [selectedProductForDevicePicker, setSelectedProductForDevicePicker] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, cData, sData, iData] = await Promise.all([
        fetchProductsList(),
        fetchDirectoryCustomers(),
        fetchStoreProfile(),
        fetchBillBookInvoices()
      ]);
      setDbProducts(pData || []);
      setDbCustomers(cData || []);
      if (sData) setStoreProfile(sData);
      setInvoicesList(iData || []);
    } catch (err) {
      console.error('Failed loading POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetNewBillForm = () => {
    setInvoiceNumber(`KE-INV-${Date.now().toString().slice(-6)}`);
    setCustomerSearch('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerState(storeProfile?.state || 'Gujarat');
    setCustomerGstin('');
    setItems([]);
    setPaidAmount('');
    setPaymentMode('CASH');
  };

  // When customer is selected from dropdown
  const handleSelectCustomer = (c: any) => {
    setCustomerName(c.fullName);
    setCustomerPhone(c.mobileNumber);
    setCustomerAddress(c.address ? `${c.address}, ${c.city || ''}` : c.city || '');
    setCustomerState(c.state || 'Gujarat');
    setCustomerGstin(c.gstNumber || '');
    setShowCustomerDropdown(false);
  };

  // Click on a product from catalog
  const handleSelectProduct = (prod: any) => {
    if (prod.isMobile && prod.devices && prod.devices.length > 0) {
      const availableDevices = prod.devices.filter((d: any) => d.status === 'AVAILABLE');
      if (availableDevices.length > 0) {
        setSelectedProductForDevicePicker(prod);
      } else {
        toast.error(`No available physical IMEIs found for ${prod.brand} ${prod.name}.`);
      }
    } else {
      handleAddProductToBillDirect(prod, null);
    }
  };

  // Direct add item or device to bill
  const handleAddProductToBillDirect = (prod: any, device: any = null) => {
    const imeiVal = device ? device.imei1 : (prod.imei || '');
    const priceVal = device?.sellingPrice || prod.sellingPrice || 0;
    const nameVal = device
      ? `${prod.brand} ${prod.name} (${device.ram ? device.ram + '/' : ''}${device.storage || ''} ${device.color || ''})`
      : `${prod.brand} ${prod.name}`;

    if (imeiVal && items.some(i => i.imei === imeiVal)) {
      toast.error(`Device with IMEI ${imeiVal} is already added to this bill!`);
      return;
    }

    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        productId: prod.id,
        name: nameVal,
        category: prod.category || 'Mobile',
        hsnCode: prod.hsnCode || '8517',
        gstRate: prod.gstRate || 18,
        price: priceVal,
        quantity: 1,
        imei: imeiVal,
        ram: device?.ram || prod.ram || '',
        storage: device?.storage || prod.storage || '',
        color: device?.color || prod.color || '',
        warrantyMonths: prod.warrantyMonths || 12,
        discount: 0
      }
    ]);

    setSelectedProductForDevicePicker(null);
  };

  const handleScanCode = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Search dbProducts for matching IMEI or SKU
    for (const p of dbProducts) {
      const matchDevice = p.devices?.find((d: any) => d.imei1 === cleanCode || d.imei2 === cleanCode);
      if (matchDevice) {
        handleAddProductToBillDirect(p, matchDevice);
        return;
      }
      if (p.sku === cleanCode || p.name.toLowerCase().includes(cleanCode.toLowerCase())) {
        handleSelectProduct(p);
        return;
      }
    }

    // Fallback: Add directly as scanned item to bill items
    setItems((prev) => [
      ...prev,
      {
        id: `scanned-${Date.now()}`,
        name: `Scanned Item (${cleanCode})`,
        category: 'Mobile',
        hsnCode: '8517',
        gstRate: 18,
        price: 0,
        quantity: 1,
        imei: cleanCode,
        discount: 0
      }
    ]);
  };

  const handleUpdateItem = (id: string, field: keyof POSItem, value: any) => {
    setItems(
      items.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  // Tax & Totals Math
  const grandTotal = items.reduce((acc, i) => {
    const itemTotal = (i.price - (i.discount || 0)) * i.quantity;
    return acc + Math.max(0, itemTotal);
  }, 0);

  const shopState = storeProfile?.state || 'Gujarat';

  const taxableValue = grandTotal / 1.18;
  const totalGstAmount = grandTotal - taxableValue;

  const numPaid = parseFloat(paidAmount || grandTotal.toString());
  const dueAmount = Math.max(0, grandTotal - numPaid);

  // Trigger browser print for a bill
  const triggerPrintForInvoice = (inv: any) => {
    setActivePrintInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Save Tax Invoice API
  const handleSaveInvoice = async (andPrint: boolean = false) => {
    if (!customerName || !customerPhone) {
      toast.error('Please enter Customer Name and Mobile Number');
      return;
    }

    if (items.length === 0) {
      toast.error('Please select at least one phone or product item for the bill!');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        invoiceNumber,
        customerName,
        customerPhone,
        customerAddress,
        customerState,
        customerGstin,
        grandTotal,
        subTotal: taxableValue,
        gstTotal: totalGstAmount,
        discount: 0,
        paidAmount: numPaid,
        dueAmount,
        paymentMethod: paymentMode,
        isGstInvoice: true,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.name,
          hsnCode: i.hsnCode,
          gstRate: i.gstRate,
          unitPrice: i.price,
          quantity: i.quantity,
          total: (i.price - (i.discount || 0)) * i.quantity,
          imei: i.imei
        }))
      };

      const created = await createSalesInvoice(payload);
      toast.success('Tax Invoice Saved Successfully!');

      if (andPrint) {
        triggerPrintForInvoice(created || payload);
      }

      await loadData();

      setTimeout(() => {
        setViewMode('REGISTER');
        resetNewBillForm();
      }, 1000);
    } catch (err) {
      console.error('Failed to save tax invoice:', err);
      toast.error('Failed to save tax invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = dbCustomers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobileNumber.includes(customerSearch)
  );

  const filteredInvoices = invoicesList.filter(
    (inv) =>
      inv.invoiceNo.toLowerCase().includes(registerSearch.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(registerSearch.toLowerCase()) ||
      inv.customerPhone.includes(registerSearch)
  );

  // Pagination & Mobile Lazy Loading State for Stock Product Picker Card (Create Bill Mode)
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerPageSize, setPickerPageSize] = useState(10);
  const [pickerMobileVisibleCount, setPickerMobileVisibleCount] = useState(20);

  useEffect(() => {
    setPickerPage(1);
    setPickerMobileVisibleCount(20);
  }, [dbProducts]);

  const paginatedProductsDesktop = dbProducts.slice(
    (pickerPage - 1) * pickerPageSize,
    pickerPage * pickerPageSize
  );
  const paginatedProductsMobile = dbProducts.slice(0, pickerMobileVisibleCount);

  const shareInvoiceOnWhatsApp = (inv: any) => {
    const rawPhone = (inv?.customerPhone || customerPhone || '').replace(/\D/g, '');
    if (!rawPhone) {
      toast.error('No customer phone number available for WhatsApp sharing.');
      return;
    }
    const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const pendingDue = inv.dueAmount !== undefined
      ? inv.dueAmount
      : Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount !== undefined ? inv.paidAmount : inv.grandTotal || 0));
    const isUnpaid = pendingDue > 0 || inv.paymentMethod === 'UDHAR';
    const storeName = storeProfile?.name ? `${storeProfile.name} ${storeProfile.tagline || ''}` : 'DukaanPro Store';

    const msg = `🧾 *TAX INVOICE - ${storeName.toUpperCase()}*\n\n` +
      `*Invoice No:* ${inv.invoiceNo}\n` +
      `*Date:* ${inv.saleDate ? new Date(inv.saleDate).toLocaleDateString() : new Date().toLocaleDateString()}\n` +
      `*Customer:* ${inv.customerName || customerName}\n\n` +
      `*Grand Total:* ₹${(inv.grandTotal || grandTotal || 0).toLocaleString()}\n` +
      `*Paid:* ₹${((inv.paidAmount !== undefined ? inv.paidAmount : inv.grandTotal || grandTotal) || 0).toLocaleString()}\n` +
      `*Balance Due:* ₹${pendingDue.toLocaleString()}\n` +
      `*Payment Status:* ${isUnpaid ? '⚠️ UNPAID / UDHAR' : '✅ FULLY PAID'}\n\n` +
      `Thank you for shopping with us! 🙏`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: white !important;
            color: #0d1b3e !important;
          }
        }
      `}</style>

      {/* Full-Width Top Header Background Canvas with Illustration & Bottom Gradient Fade */}
      <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3.5 sm:px-6 pt-4 sm:pt-6 pb-12 sm:pb-14 bg-gradient-to-b from-sky-100/70 via-blue-50/40 to-slate-50/0 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950/0 relative overflow-hidden">
        {/* Background Decorative Graphic Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 sm:opacity-35 dark:opacity-15 pointer-events-none flex items-center justify-end pr-2 sm:pr-6">
          <svg viewBox="0 0 200 160" className="h-full text-brand-primary fill-current">
            <rect x="40" y="30" width="120" height="110" rx="8" opacity="0.15" />
            <path d="M60 55 H140 M60 75 H120 M60 95 H100 M60 115 H130" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
            <circle cx="140" cy="115" r="14" opacity="0.2" />
            <path d="M135 115 L139 119 L146 111" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
          </svg>
        </div>

        <div className="relative z-10 space-y-0.5 sm:space-y-1 max-w-xl">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {viewMode === 'REGISTER' ? 'Sales BillBook' : 'Create Tax Invoice'}
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            {viewMode === 'REGISTER'
              ? 'Ledger of issued bills, customer invoices, payments &amp; GST compliance'
              : 'GST tax calculation • Select phone IMEIs, color &amp; RAM with 1-click'}
          </p>
        </div>
      </div>

      {/* Floating Action Bar Container (View Mode Tabs + Camera Scan + New Bill + Refresh) */}
      <div className={`-mt-8 sm:-mt-10 relative z-20 p-2 sm:p-3 rounded-2xl border shadow-xs flex flex-row items-center justify-between gap-1.5 sm:gap-3 ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
      }`}>
        <div className="flex-1 min-w-0">
          {viewMode === 'REGISTER' ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 max-w-md">
              <Search className="w-4 h-4 text-brand-primary flex-shrink-0" />
              <input
                type="text"
                value={registerSearch}
                onChange={(e) => setRegisterSearch(e.target.value)}
                placeholder="Search invoice #, customer name, mobile..."
                className="w-full bg-transparent text-xs sm:text-sm font-bold focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-xs font-extrabold text-brand-primary px-1">
              <Printer className="w-4 h-4 flex-shrink-0" />
              <span>Creating New GST Tax Invoice</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-2.5 sm:px-3.5 h-10 sm:h-10.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-brand-primary font-extrabold text-[11px] sm:text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            title="Scan IMEI or Barcode with Mobile Camera"
          >
            <Camera className="w-4 h-4 text-brand-primary flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Scan Camera</span>
          </button>

          {viewMode === 'REGISTER' ? (
            <button
              onClick={() => { resetNewBillForm(); setViewMode('CREATE_BILL'); }}
              className="h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl bg-brand-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 text-white flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">New Bill</span>
              <span className="sm:hidden whitespace-nowrap">Create</span>
            </button>
          ) : (
            <button
              onClick={() => setViewMode('REGISTER')}
              className="h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">View Sales Ledger</span>
              <span className="sm:hidden whitespace-nowrap">Ledger</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className={`w-10 sm:w-10.5 h-10 sm:h-10.5 rounded-xl border flex items-center justify-center transition-all shadow-xs flex-shrink-0 cursor-pointer ${
              isDarkMode
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: EXCEL SHEET TABLE VIEW OF PAST BILLS */}
      {viewMode === 'REGISTER' && (
        <div className="space-y-4">

          {/* Excel Sheet Table */}
          <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-brand-primary" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sales Invoice Ledger ({filteredInvoices.length} Bills Issued)
                </h3>
              </div>
            </div>

            {loading ? (
              <div className="p-16 text-center text-slate-400 font-bold text-sm">
                Loading sales bills database...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300">No matching bill entries found</p>
                <p className="text-xs text-slate-400 mt-1">Click "+ Create New Bill / Tax Invoice" to issue your first customer invoice</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-4 w-36">Invoice #</th>
                        <th className="py-3 px-4 w-28">Date</th>
                        <th className="py-3 px-4">Customer Name & Mobile</th>
                        <th className="py-3 px-4">Items Purchased</th>
                        <th className="py-3 px-4 w-24 text-center">Payment</th>
                        <th className="py-3 px-4 w-32 text-right">Grand Total</th>
                        <th className="py-3 px-4 w-28 text-center">Status</th>
                        <th className="py-3 px-4 w-36 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                      {filteredInvoices.map((inv) => {
                        const dateStr = inv.saleDate ? new Date(inv.saleDate).toLocaleDateString() : '-';
                        const itemsSummary = inv.items?.map(i => `${i.productName} ${i.imei ? '(IMEI: ' + i.imei + ')' : ''}`).join(', ') || 'Item';
                        const pendingDue = inv.dueAmount !== undefined
                          ? inv.dueAmount
                          : Math.max(0, inv.grandTotal - (inv.paidAmount !== undefined ? inv.paidAmount : inv.grandTotal));
                        const isUnpaid = pendingDue > 0 || inv.paymentMethod === 'UDHAR';

                        return (
                          <tr
                            key={inv.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Invoice # */}
                            <td className="py-3 px-4 font-mono font-black text-xs text-brand-primary">
                              {inv.invoiceNo}
                            </td>

                            {/* Date */}
                            <td className="py-3 px-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                              {dateStr}
                            </td>

                            {/* Customer */}
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                                {inv.customerName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Ph: {inv.customerPhone}
                              </div>
                            </td>

                            {/* Items Purchased */}
                            <td className="py-3 px-4 max-w-xs truncate text-xs text-slate-600 dark:text-slate-300" title={itemsSummary}>
                              <span className="font-extrabold text-slate-900 dark:text-white mr-1.5">[{inv.items?.length || 1} Pcs]</span>
                              {itemsSummary}
                            </td>

                            {/* Payment Method */}
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {inv.paymentMethod || 'CASH'}
                              </span>
                            </td>

                            {/* Grand Total */}
                            <td className="py-3 px-4 text-right font-mono font-black text-sm text-slate-900 dark:text-white">
                              ₹{inv.grandTotal.toLocaleString()}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 text-center">
                              {isUnpaid ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    UNPAID
                                  </span>
                                  <span className="text-[10px] font-mono font-extrabold text-rose-500 mt-0.5">
                                    Pending: ₹{pendingDue.toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  PAID
                                </span>
                              )}
                            </td>

                            {/* Clean Action Buttons */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                {isUnpaid && (
                                  <button
                                    onClick={() => openPaymentModal(inv.financeRecordId || inv.customerPhone)}
                                    className="px-2.5 py-1 text-[11px] font-extrabold text-white bg-brand-primary hover:bg-brand-hover rounded-lg flex items-center space-x-1 whitespace-nowrap transition-all shadow-xs cursor-pointer"
                                    title="Open universal payment modal to receive money"
                                  >
                                    <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Receive ₹</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => shareInvoiceOnWhatsApp(inv)}
                                  className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors border border-transparent hover:border-emerald-200 cursor-pointer"
                                  title="Share Tax Invoice on WhatsApp"
                                >
                                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                                </button>

                                <button
                                  onClick={() => triggerPrintForInvoice(inv)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-brand-primary hover:bg-brand-light dark:hover:bg-brand-primary/10 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                                  title="Print Tax Invoice"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="block md:hidden space-y-3">
                  {filteredInvoices.map((inv) => {
                    const dateStr = inv.saleDate ? new Date(inv.saleDate).toLocaleDateString() : '-';
                    const pendingDue = inv.dueAmount !== undefined
                      ? inv.dueAmount
                      : Math.max(0, inv.grandTotal - (inv.paidAmount !== undefined ? inv.paidAmount : inv.grandTotal));
                    const isUnpaid = pendingDue > 0 || inv.paymentMethod === 'UDHAR';

                    return (
                      <div key={inv.id} className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-black text-xs text-brand-primary block">
                              {inv.invoiceNo}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{dateStr}</span>
                          </div>

                          {isUnpaid ? (
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              UNPAID (₹{pendingDue.toLocaleString()})
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              PAID
                            </span>
                          )}
                        </div>

                        <div className="border-t border-b py-2 border-slate-100 dark:border-slate-800 text-xs">
                          <p className="font-extrabold text-slate-900 dark:text-white">{inv.customerName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">Ph: {inv.customerPhone}</p>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Grand Total</span>
                            <span className="font-mono font-black text-sm text-slate-900 dark:text-white">₹{inv.grandTotal.toLocaleString()}</span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {isUnpaid && (
                              <button
                                onClick={() => openPaymentModal(inv.financeRecordId || inv.customerPhone)}
                                className="px-2.5 py-1.5 rounded-lg bg-brand-primary text-white font-extrabold text-[11px] shadow-sm flex items-center space-x-1 cursor-pointer hover:bg-brand-hover"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                <span>Receive ₹</span>
                              </button>
                            )}
                            <button
                              onClick={() => shareInvoiceOnWhatsApp(inv)}
                              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-pointer"
                              title="Share on WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4 text-emerald-600" />
                            </button>
                            <button
                              onClick={() => triggerPrintForInvoice(inv)}
                              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: DEDICATED FULL PAGE BILL CREATOR */}
      {viewMode === 'CREATE_BILL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Tax Invoice Builder */}
          <div className="lg:col-span-2 space-y-6">
            <div className={`p-4 sm:p-6 rounded-2xl border shadow-xl space-y-6 ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}>
              {/* 1. Customer Selection & State */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-xs text-brand-primary uppercase tracking-wider flex items-center space-x-1.5">
                    <User className="w-4 h-4" />
                    <span>1. Customer & Tax State Info</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    Shop State: <strong className="text-brand-primary font-black">{shopState}</strong>
                  </span>
                </div>

                {/* Customer Search Dropdown */}
                <div className="relative">
                  <label className="block font-bold text-xs mb-1 opacity-80">Select Existing Customer or Type Name</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Type customer name or mobile number..."
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className={`absolute z-30 w-full mt-1 rounded-xl border shadow-2xl max-h-48 overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}>
                      {filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className={`p-3 text-xs cursor-pointer flex items-center justify-between border-b last:border-0 ${isDarkMode ? 'hover:bg-slate-800 border-slate-800' : 'hover:bg-slate-100 border-slate-100'
                            }`}
                        >
                          <div>
                            <p className="font-extrabold">{c.fullName}</p>
                            <p className="text-[11px] text-slate-400">{c.mobileNumber} • {c.city || c.state}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold mb-1 opacity-80">Customer Phone (10 Digits) *</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className={`w-full px-3 py-2 rounded-xl border font-bold font-mono focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">Customer State *</label>
                    <select
                      value={customerState}
                      onChange={(e) => setCustomerState(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    >
                      <option value="Gujarat">Gujarat (Same State - CGST/SGST)</option>
                      <option value="Maharashtra">Maharashtra (Inter-State - IGST)</option>
                      <option value="Rajasthan">Rajasthan (Inter-State - IGST)</option>
                      <option value="Madhya Pradesh">Madhya Pradesh (Inter-State - IGST)</option>
                      <option value="Delhi">Delhi (Inter-State - IGST)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">Customer GSTIN (Optional)</label>
                    <input
                      type="text"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value)}
                      placeholder="24AAAAA0000A1Z5"
                      className={`w-full px-3 py-2 rounded-xl border font-bold font-mono focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Items & Cart Table */}
              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-xs text-brand-primary uppercase tracking-wider flex items-center space-x-1.5">
                    <Tag className="w-4 h-4" />
                    <span>2. Items Included in Bill ({items.length})</span>
                  </h3>
                </div>

                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${isDarkMode ? 'border-slate-800 text-slate-400 bg-slate-950/60' : 'border-slate-200 text-slate-500 bg-slate-50'
                        }`}>
                        <tr>
                          <th className="py-3 px-3">Item Description & Spec</th>
                          <th className="py-3 px-2">IMEI Number</th>
                          <th className="py-3 px-2 text-center">Qty</th>
                          <th className="py-3 px-2">Unit Price (₹)</th>
                          <th className="py-3 px-2 text-right">Total (₹)</th>
                          <th className="py-3 px-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">
                              <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p className="font-extrabold text-xs">No items added to bill yet.</p>
                              <p className="text-[11px] mt-0.5 text-slate-400">Click any product on the right stock list to add it to the bill.</p>
                            </td>
                          </tr>
                        ) : (
                          items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30">
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                  className={`w-full p-1 text-xs font-extrabold bg-transparent border-b focus:outline-none focus:border-brand-primary ${isDarkMode ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'
                                    }`}
                                />
                              </td>
                              <td className="py-2.5 px-2">
                                <input
                                  type="text"
                                  value={item.imei || ''}
                                  onChange={(e) => handleUpdateItem(item.id, 'imei', e.target.value)}
                                  placeholder="IMEI barcode..."
                                  className={`w-full p-1 text-xs font-mono font-bold bg-transparent border-b focus:outline-none focus:border-brand-primary ${isDarkMode ? 'text-brand-primary border-slate-800' : 'text-brand-primary border-slate-200'
                                    }`}
                                />
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value || '1', 10)))}
                                  className={`w-12 p-1 text-center font-bold text-xs bg-transparent border rounded ${isDarkMode ? 'border-slate-800 text-white' : 'border-slate-300 text-slate-900'
                                    }`}
                                />
                              </td>
                              <td className="py-2.5 px-2">
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => handleUpdateItem(item.id, 'price', parseFloat(e.target.value || '0'))}
                                  className={`w-24 p-1 text-xs font-bold font-mono bg-transparent border rounded ${isDarkMode ? 'border-slate-800 text-brand-primary' : 'border-slate-300 text-brand-primary'
                                    }`}
                                />
                              </td>
                              <td className="py-2.5 px-2 text-right font-mono font-black text-xs text-slate-900 dark:text-white">
                                ₹{((item.price - (item.discount || 0)) * item.quantity).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Item Cards List */}
                  <div className="block md:hidden space-y-3">
                    {items.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-extrabold text-xs">No items added to bill yet.</p>
                        <p className="text-[11px] mt-0.5 text-slate-400">Click any product on stock list to add.</p>
                      </div>
                    ) : (
                      items.map((item, idx) => (
                        <div key={item.id} className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white">Item #{idx + 1}</span>
                            <button onClick={() => handleRemoveItem(item.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Item Description</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                              className={`w-full p-2 text-xs font-extrabold bg-transparent border rounded-xl focus:outline-none focus:border-brand-primary ${isDarkMode ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'}`}
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">IMEI / Serial Barcode</label>
                            <input
                              type="text"
                              value={item.imei || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'imei', e.target.value)}
                              placeholder="Scan or enter IMEI..."
                              className={`w-full p-2 text-xs font-mono font-bold bg-transparent border rounded-xl focus:outline-none focus:border-brand-primary ${isDarkMode ? 'text-brand-primary border-slate-800' : 'text-brand-primary border-slate-200'}`}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Qty</label>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value || '1', 10)))}
                                className={`w-full p-2 text-center font-bold text-xs bg-transparent border rounded-xl ${isDarkMode ? 'border-slate-800 text-white' : 'border-slate-300 text-slate-900'}`}
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Price (₹)</label>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => handleUpdateItem(item.id, 'price', parseFloat(e.target.value || '0'))}
                                className={`w-full p-2 text-xs font-bold font-mono bg-transparent border rounded-xl ${isDarkMode ? 'border-slate-800 text-brand-primary' : 'border-slate-300 text-brand-primary'}`}
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Total (₹)</label>
                              <div className="p-2 text-xs font-mono font-black text-slate-900 dark:text-white border border-transparent flex items-center justify-end">
                                ₹{((item.price - (item.discount || 0)) * item.quantity).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              </div>

              {/* 3. Payment Mode & Final Save */}
              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-extrabold text-xs text-brand-primary uppercase tracking-wider flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>3. Payment Method & Settlement</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold mb-1 opacity-80">Payment Method</label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border font-extrabold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="UDHAR">SHOP PERSONAL UDHAR / KHATA</option>
                      <option value="BAJAJ_FINSERV">BAJAJ FINSERV EMI</option>
                      <option value="SAMSUNG_FINANCE">SAMSUNG FINANCE+ EMI</option>
                      <option value="TVS_CREDIT">TVS CREDIT EMI</option>
                      <option value="HOME_CREDIT">HOME CREDIT EMI</option>
                      <option value="IDFC_FIRST">IDFC FIRST BANK EMI</option>
                      <option value="HDB_FINANCE">HDB FINANCIAL SERVICES</option>
                      <option value="OTHER_FINANCE">OTHER EMI PARTNER</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">Amount Paid Now (₹)</label>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder={grandTotal.toString()}
                      className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 opacity-80">Remaining Balance (Udhar)</label>
                    <div className={`px-3 py-2 rounded-xl border font-mono font-black ${dueAmount > 0 ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
                      }`}>
                      ₹{dueAmount.toLocaleString()} {dueAmount > 0 ? '(Udhar)' : '(Fully Paid)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('REGISTER')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveInvoice(false)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs shadow-md shadow-brand-primary/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Invoice'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveInvoice(true)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs shadow-md shadow-brand-primary/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Save & Print Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Quick Stock Product Picker for Bill */}
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border shadow-xl space-y-4 ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <h3 className="font-extrabold text-xs text-brand-primary uppercase tracking-wider flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>Select Stock Item for Bill</span>
                </h3>
              </div>

              <p className="text-[11px] text-slate-400 font-semibold">
                Click any phone or accessory to add it to the bill:
              </p>

              {/* Desktop Product List */}
              <div className="hidden md:block max-h-[600px] overflow-y-auto space-y-2 pr-1">
                {paginatedProductsDesktop.map((p) => {
                  const availableDevs = p.devices?.filter((d: any) => d.status === 'AVAILABLE') || [];
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer hover:border-brand-primary transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-brand-light/40'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] font-black uppercase text-brand-primary tracking-wider">
                            {p.brand} • {p.category}
                          </span>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">{p.name}</h4>
                        </div>
                        <span className="font-mono font-black text-brand-primary text-xs">
                          ₹{p.sellingPrice?.toLocaleString()}
                        </span>
                      </div>

                      {p.isMobile && (
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span>{availableDevs.length} IMEIs Available</span>
                          <span className="text-brand-primary">Select IMEI →</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mobile Product List */}
              <div className="block md:hidden max-h-[600px] overflow-y-auto space-y-2 pr-1">
                {paginatedProductsMobile.map((p) => {
                  const availableDevs = p.devices?.filter((d: any) => d.status === 'AVAILABLE') || [];
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer hover:border-brand-primary transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-brand-light/40'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] font-black uppercase text-brand-primary tracking-wider">
                            {p.brand} • {p.category}
                          </span>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">{p.name}</h4>
                        </div>
                        <span className="font-mono font-black text-brand-primary text-xs">
                          ₹{p.sellingPrice?.toLocaleString()}
                        </span>
                      </div>

                      {p.isMobile && (
                        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span>{availableDevs.length} IMEIs Available</span>
                          <span className="text-brand-primary">Select IMEI →</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls & Mobile Infinite Scroll for Product Picker */}
              <PaginationControls
                currentPage={pickerPage}
                onPageChange={setPickerPage}
                pageSize={pickerPageSize}
                onPageSizeChange={setPickerPageSize}
                totalItems={dbProducts.length}
                pageSizeOptions={[5, 10, 15, 20]}
                mobileVisibleCount={pickerMobileVisibleCount}
                onMobileLoadMore={() => setPickerMobileVisibleCount((prev) => prev + 20)}
              />
            </div>
          </div>
        </div>
      )}

      {/* FATHER-FRIENDLY MULTI-DEVICE PICKER MODAL */}
      {selectedProductForDevicePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden my-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
            <div className="p-5 bg-brand-primary text-white flex items-center justify-between border-b border-brand-hover">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 text-white flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase text-sky-100 tracking-wider">
                    {selectedProductForDevicePicker.brand} • Select Physical Device
                  </div>
                  <h3 className="text-base font-black text-white">
                    {selectedProductForDevicePicker.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductForDevicePicker(null)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-brand-light/60 dark:bg-brand-primary/10 border-b border-brand-primary/20 text-brand-primary dark:text-sky-300 text-xs font-extrabold">
              Click on the exact phone IMEI & color below to add it to the invoice:
            </div>

            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3">
              {selectedProductForDevicePicker.devices
                ?.filter((d: any) => d.status === 'AVAILABLE')
                .map((device: any, idx: number) => (
                  <div
                    key={device.id || idx}
                    onClick={() => handleAddProductToBillDirect(selectedProductForDevicePicker, device)}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-primary dark:hover:border-brand-primary bg-slate-50 dark:bg-slate-950 cursor-pointer transition-all hover:scale-[1.01] group flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          AVAILABLE
                        </span>
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors">
                          IMEI: {device.imei1}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-3">
                        <span>Color: <strong>{device.color || 'Standard'}</strong></span>
                        <span>Specs: <strong>{device.ram ? device.ram + ' / ' : ''}{device.storage || '-'}</strong></span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-black text-sm text-brand-primary">
                        ₹{(device.sellingPrice || selectedProductForDevicePicker.sellingPrice).toLocaleString()}
                      </p>
                      <span className="text-[10px] font-extrabold text-brand-primary group-hover:underline">
                        + Add to Bill
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedProductForDevicePicker(null)}
                className="px-5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE INVOICE TEMPLATE (USED FOR WINDOW.PRINT()) */}
      <div id="printable-invoice" className="hidden print:block p-8 bg-white text-slate-900 font-sans max-w-4xl mx-auto">
        {(() => {
          const inv = activePrintInvoice || {
            invoiceNo: invoiceNumber,
            saleDate: new Date().toISOString(),
            customerName,
            customerPhone,
            customerAddress,
            customerState,
            customerGstin,
            grandTotal,
            subTotal: taxableValue,
            gstTotal: totalGstAmount,
            paidAmount: numPaid,
            dueAmount,
            paymentMethod: paymentMode,
            items: items.map(i => ({
              productName: i.name,
              imei: i.imei,
              hsnCode: i.hsnCode,
              quantity: i.quantity,
              unitPrice: i.price,
              total: (i.price - (i.discount || 0)) * i.quantity
            }))
          };

          const isSame = (inv.customerState || customerState || 'Gujarat').toLowerCase() === (storeProfile?.state || 'Gujarat').toLowerCase();
          const printTaxable = inv.subTotal || (inv.grandTotal / 1.18);
          const printGst = inv.gstTotal || (inv.grandTotal - printTaxable);
          const printCgst = isSame ? printGst / 2 : 0;
          const printSgst = isSame ? printGst / 2 : 0;
          const printIgst = !isSame ? printGst : 0;
          const printDue = inv.dueAmount !== undefined ? inv.dueAmount : Math.max(0, inv.grandTotal - (inv.paidAmount || 0));

          return (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center space-x-3">
                  {storeProfile?.logoUrl ? (
                    <img src={storeProfile.logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
                  ) : null}
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                      {storeProfile?.name || 'KISHAN'} {storeProfile?.tagline || 'ELECTRONICS'}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">{storeProfile?.address}</p>
                    <p className="text-xs font-bold text-slate-900">Phone: {storeProfile?.phone} | GSTIN: {storeProfile?.gstin}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-brand-primary text-white font-black text-xs uppercase tracking-wider rounded shadow-sm">
                    TAX INVOICE
                  </span>
                  <p className="font-mono font-black text-sm text-slate-900 mt-1">{inv.invoiceNo}</p>
                  <p className="text-xs font-bold text-slate-600">Date: {inv.saleDate ? new Date(inv.saleDate).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500">Bill To Customer</p>
                  <p className="font-black text-sm text-slate-900">{inv.customerName || 'Walk-in Customer'}</p>
                  <p className="font-mono font-bold text-slate-700">Mobile: {inv.customerPhone || '-'}</p>
                  {inv.customerAddress && <p className="text-slate-600">{inv.customerAddress}</p>}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-500">Tax Place of Supply</p>
                  <p className="font-bold text-slate-900">State: {inv.customerState || customerState || 'Gujarat'}</p>
                  {inv.customerGstin && <p className="font-mono font-bold text-slate-700">GSTIN: {inv.customerGstin}</p>}
                  <p className="font-extrabold text-emerald-700">GST Split: {isSame ? 'CGST 9% + SGST 9%' : 'IGST 18%'}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-extrabold uppercase text-[10px] border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-8">#</th>
                    <th className="p-2 border-r border-slate-300">Item Description & IMEI</th>
                    <th className="p-2 border-r border-slate-300 text-center w-16">HSN</th>
                    <th className="p-2 border-r border-slate-300 text-center w-12">Qty</th>
                    <th className="p-2 border-r border-slate-300 text-right w-24">Unit Price</th>
                    <th className="p-2 text-right w-24">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {inv.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-300">
                        <div className="font-black text-slate-900">{item.productName}</div>
                        {item.imei && <div className="font-mono text-[10px] text-slate-600 font-bold">IMEI: {item.imei}</div>}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono">{item.hsnCode || '8517'}</td>
                      <td className="p-2 border-r border-slate-300 text-center font-bold">{item.quantity}</td>
                      <td className="p-2 border-r border-slate-300 text-right font-mono font-bold">₹{item.unitPrice?.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono font-black">₹{(item.total || (item.unitPrice * item.quantity)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals & Tax Summary */}
              <div className="flex justify-between items-start pt-2">
                <div className="space-y-2 text-xs max-w-sm">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                    <p className="font-bold text-slate-800">GST Tax Breakdown:</p>
                    <p className="text-[11px]">Taxable Amount: <strong className="font-mono">₹{Math.round(printTaxable).toLocaleString()}</strong></p>
                    {isSame ? (
                      <>
                        <p className="text-[11px]">CGST (9%): <strong className="font-mono">₹{Math.round(printCgst).toLocaleString()}</strong></p>
                        <p className="text-[11px]">SGST (9%): <strong className="font-mono">₹{Math.round(printSgst).toLocaleString()}</strong></p>
                      </>
                    ) : (
                      <p className="text-[11px]">IGST (18%): <strong className="font-mono">₹{Math.round(printIgst).toLocaleString()}</strong></p>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 italic">Terms: {storeProfile?.terms}</p>
                </div>

                <div className="w-64 space-y-1 text-xs text-right font-semibold">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold">₹{Math.round(printTaxable).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span>Total GST Tax:</span>
                    <span className="font-mono font-bold">₹{Math.round(printGst).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b-2 border-slate-900 font-black text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{inv.grandTotal?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-700">
                    <span>Paid Amount:</span>
                    <span className="font-mono font-bold text-emerald-700">₹{(inv.paidAmount || (inv.grandTotal - printDue)).toLocaleString()}</span>
                  </div>
                  {printDue > 0 && (
                    <div className="flex justify-between py-1 font-black text-rose-700 bg-rose-50 px-2 rounded">
                      <span>Balance Udhar:</span>
                      <span className="font-mono">₹{printDue.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-end text-xs">
                <div>
                  <p className="font-bold text-slate-700">Customer Signature</p>
                  <div className="w-36 border-b border-slate-400 mt-8"></div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">For {storeProfile?.name || 'KISHAN'} {storeProfile?.tagline || 'ELECTRONICS'}</p>
                  <div className="w-36 border-b border-slate-400 mt-8 ml-auto"></div>
                  <p className="text-[10px] text-slate-500 mt-1">Authorized Signatory</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Camera Barcode / IMEI Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanCode}
        title="POS Barcode / IMEI Camera Scanner"
      />
    </div>
  );
};
