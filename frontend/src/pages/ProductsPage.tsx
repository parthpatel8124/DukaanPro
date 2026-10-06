import React, { useEffect, useState, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  X,
  Smartphone,
  Zap,
  Battery,
  Headphones,
  AlertTriangle,
  Eye,
  Edit3,
  Trash2,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Layers,
  Tag,
  Watch,
  Shield,
  Speaker,
  Tv,
  Camera,
  Laptop,
  Wind,
  Grid,
  List,
  FileSpreadsheet,
  Printer,
  Download
} from 'lucide-react';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { ImportProductsModal } from '../components/ImportProductsModal';
import { PaginationControls } from '../components/PaginationControls';
import { toast } from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { CustomSelect } from '../components/CustomSelect';
import {
  fetchProductsList,
  deleteProductItem,
  fetchBrandsList,
  fetchCategoriesList
} from '../services/api';

interface DeviceItem {
  id: string;
  imei1: string;
  imei2?: string;
  color?: string;
  ram?: string;
  storage?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  imageUrl?: string;
  status: 'AVAILABLE' | 'SOLD' | 'DEFECTIVE' | 'RETURNED';
}

interface ProductItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  isMobile: boolean;
  trackingType?: string;
  sku?: string;
  hsnCode?: string;
  gstRate?: number;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  warrantyMonths?: number;
  imageUrl?: string;
  imei?: string;
  supplierName?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  devices?: DeviceItem[];
}

export const ProductsPage: React.FC = () => {
  const { isDarkMode, setActiveModule, setSelectedProductId } = useStore();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [mobileViewLayout, setMobileViewLayout] = useState<'GRID' | 'LIST'>('LIST');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // CSV Import Modal & Export PDF/CSV Handlers
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal for Viewing Physical Devices of a Selected Smartphone Model
  const [selectedModelForDevices, setSelectedModelForDevices] = useState<ProductItem | null>(null);

  // Export current filtered inventory list to CSV
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      toast.error('No inventory products available to export.');
      return;
    }

    let csvContent = 'SKU,Brand,Model / Item Name,Category,Tracking Type,HSN Code,GST Rate %,Purchase Price,Selling Price,Stock Quantity,Available IMEIs,Status,Supplier\n';

    filteredProducts.forEach((p) => {
      const imeiList = p.devices
        ? p.devices.map(d => d.imei1).filter(Boolean).join('; ')
        : (p.imei || '');

      const row = [
        `"${p.sku || ''}"`,
        `"${p.brand || ''}"`,
        `"${p.name || ''}"`,
        `"${p.category || ''}"`,
        `"${p.trackingType || (p.isMobile ? 'SERIALIZED' : 'QUANTITY')}"`,
        `"${p.hsnCode || '8517'}"`,
        `"${p.gstRate || 18}"`,
        `"${p.purchasePrice || 0}"`,
        `"${p.sellingPrice || 0}"`,
        `"${p.stockQuantity || 0}"`,
        `"${imeiList}"`,
        `"${p.status}"`,
        `"${p.supplierName || ''}"`
      ].join(',');

      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DukaanPro_Stock_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredProducts.length} inventory items to CSV!`);
  };

  // Export PDF / Trigger Printable Stock Register Sheet
  const handleExportPDF = () => {
    if (filteredProducts.length === 0) {
      toast.error('No inventory products available to print/export PDF.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to generate PDF/Print View.');
      return;
    }

    const totalStockQty = filteredProducts.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
    const totalInventoryValuation = filteredProducts.reduce((sum, p) => sum + ((p.sellingPrice || 0) * (p.stockQuantity || 0)), 0);

    const rowsHtml = filteredProducts.map((p, idx) => {
      const imeiList = p.devices
        ? p.devices.map(d => d.imei1).filter(Boolean).join(', ')
        : (p.imei || '—');

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px;">${idx + 1}</td>
          <td style="padding: 8px;"><strong>${p.brand}</strong> ${p.name}</td>
          <td style="padding: 8px;">${p.category || 'General'}</td>
          <td style="padding: 8px;">${p.hsnCode || '8517'}</td>
          <td style="padding: 8px; font-family: monospace;">${imeiList}</td>
          <td style="padding: 8px; text-align: right;">₹${(p.purchasePrice || 0).toLocaleString()}</td>
          <td style="padding: 8px; text-align: right; font-weight: bold;">₹${(p.sellingPrice || 0).toLocaleString()}</td>
          <td style="padding: 8px; text-align: center; font-weight: bold;">${p.stockQuantity}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>DukaanPro - Stock Inventory Register</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0; color: #0284c7; font-size: 20px; }
            .meta { font-size: 12px; color: #64748b; margin-top: 4px; margin-bottom: 16px; }
            .summary-box { display: flex; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
            .summary-item { font-size: 12px; }
            .summary-item strong { color: #0284c7; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1>DUKAANPRO • Inventory Stock & Price Register</h1>
              <div class="meta">Exported Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <button class="no-print" onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">Print / Save PDF</button>
          </div>

          <div class="summary-box">
            <div class="summary-item">Total Product Models: <strong>${filteredProducts.length}</strong></div>
            <div class="summary-item">Total Physical Stock Units: <strong>${totalStockQty} Pcs</strong></div>
            <div class="summary-item">Total Inventory Valuation: <strong>₹${totalInventoryValuation.toLocaleString('en-IN')}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Brand & Model Name</th>
                <th>Category</th>
                <th>HSN</th>
                <th>Available IMEIs / Serials</th>
                <th style="text-align: right;">Cost Price</th>
                <th style="text-align: right;">Selling Price</th>
                <th style="text-align: center;">Stock</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    toast.success('Generated PDF / Printable Stock Sheet!');
  };

  const loadProductsFromDB = async () => {
    setLoading(true);
    try {
      const [pData, bData, cData] = await Promise.all([
        fetchProductsList(),
        fetchBrandsList(),
        fetchCategoriesList()
      ]);
      setProducts(pData || []);
      setBrands(bData || []);
      setCategories(cData || []);
    } catch (err) {
      console.error('Error fetching products, brands & categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductsFromDB();
  }, []);

  const getCategoryIconComponent = (iconName?: string, name?: string) => {
    const iName = (iconName || '').toLowerCase();
    const nName = (name || '').toLowerCase();

    // 1. Headphones / Earbuds / Audio (Must come BEFORE 'phone' check because headPHONE contains 'phone')
    if (iName === 'headphones' || nName.includes('headphone') || nName.includes('ear') || nName.includes('audio') || nName.includes('tws') || nName.includes('bud')) return Headphones;

    // 2. Laptops & Computers
    if (iName === 'laptop' || nName.includes('laptop') || nName.includes('computer') || nName.includes('pc') || nName.includes('macbook')) return Laptop;

    // 3. Air Conditioners & Cooling
    if (iName === 'wind' || nName.includes('ac') || nName.includes('air') || nName.includes('conditioner') || nName.includes('cooling')) return Wind;

    // 4. Smart TVs & Displays
    if (iName === 'tv' || nName.includes('tv') || nName.includes('display') || nName.includes('monitor')) return Tv;

    // 5. Chargers, Cables & Power
    if (iName === 'zap' || nName.includes('charger') || nName.includes('cable') || nName.includes('adapter')) return Zap;
    if (iName === 'battery' || nName.includes('power') || nName.includes('bank')) return Battery;

    // 6. Cases & Protection
    if (iName === 'shield' || nName.includes('case') || nName.includes('cover') || nName.includes('glass') || nName.includes('protection')) return Shield;

    // 7. Watches
    if (iName === 'watch' || nName.includes('watch') || nName.includes('smartwatch')) return Watch;

    // 8. Speakers & Audio
    if (iName === 'speaker' || nName.includes('speaker') || nName.includes('soundbar')) return Speaker;
    if (iName === 'camera' || nName.includes('camera')) return Camera;

    // 9. Smartphones (Only if not headphone)
    if (iName === 'smartphone' || nName.includes('mobile') || nName.includes('smartphone') || (nName.includes('phone') && !nName.includes('headphone'))) return Smartphone;

    return Package;
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this inventory model and all associated device records?')) return;
    try {
      await deleteProductItem(id);
      await loadProductsFromDB();
      if (selectedModelForDevices?.id === id) {
        setSelectedModelForDevices(null);
      }
      toast.success('Inventory model deleted successfully!');
    } catch (err) {
      console.error('Failed to delete item:', err);
      toast.error('Failed to delete inventory model.');
    }
  };

  const handleRowClick = (product: ProductItem) => {
    if (product.isMobile || (product.devices && product.devices.length > 0)) {
      setSelectedModelForDevices(product);
    } else {
      setSelectedProductId(product.id);
      setActiveModule('view-product');
    }
  };

  const handleDeviceClick = (product: ProductItem) => {
    setSelectedModelForDevices(null);
    setSelectedProductId(product.id);
    setActiveModule('view-product');
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.devices && p.devices.some(d => d.imei1.includes(searchTerm) || (d.imei2 && d.imei2.includes(searchTerm))));

    const matchesCat =
      selectedCategory === 'ALL' ||
      (p.category && p.category.toLowerCase().includes(selectedCategory.toLowerCase())) ||
      (selectedCategory.toLowerCase().includes('mobile') && p.isMobile) ||
      (selectedCategory.toLowerCase().includes('smartphone') && p.isMobile);

    const matchesBrand =
      selectedBrand === 'ALL' ||
      p.brand.toLowerCase() === selectedBrand.toLowerCase();

    const matchesLowStock = !onlyLowStock || p.stockQuantity <= (p.minStockAlert || 2);

    return matchesSearch && matchesCat && matchesBrand && matchesLowStock;
  });

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [mobileVisibleCount, setMobileVisibleCount] = React.useState(20);

  React.useEffect(() => {
    setCurrentPage(1);
    setMobileVisibleCount(20);
  }, [searchTerm, selectedCategory, selectedBrand, onlyLowStock]);

  const paginatedDesktopProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const paginatedMobileProducts = filteredProducts.slice(0, mobileVisibleCount);

  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockAlert).length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Full-Width Top Header Background Canvas with Illustration & Bottom Gradient Fade */}
      <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3.5 sm:px-6 pt-4 sm:pt-6 pb-12 sm:pb-14 bg-gradient-to-b from-sky-100/70 via-blue-50/40 to-slate-50/0 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950/0 relative overflow-hidden">
        {/* Background Decorative Graphic Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 sm:opacity-35 dark:opacity-15 pointer-events-none flex items-center justify-end pr-2 sm:pr-6">
          <svg viewBox="0 0 200 160" className="h-full text-brand-primary fill-current">
            <rect x="30" y="50" width="60" height="70" rx="6" opacity="0.15" />
            <rect x="100" y="40" width="60" height="80" rx="6" opacity="0.22" />
            <path d="M40 70 H80 M40 85 H70 M110 60 H150 M110 75 H140 M110 90 H130" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.3" />
            <circle cx="160" cy="115" r="16" opacity="0.15" />
            <path d="M155 115 L160 120 L168 110" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4" />
          </svg>
        </div>

        <div className="relative z-10 space-y-0.5 sm:space-y-1 max-w-xl">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Stock &amp; Products
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            Catalog of smartphones, chargers, cables, IMEIs &amp; shop accessories
          </p>
        </div>
      </div>

      {/* Floating Action Bar Container (Import CSV + Export + Add Product + Refresh) */}
      <div className={`-mt-8 sm:-mt-10 relative z-20 p-2 sm:p-3 rounded-2xl border shadow-xs flex flex-row items-center justify-between gap-1.5 sm:gap-3 ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
      }`}>
        <div className="flex items-center space-x-1.5 min-w-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-extrabold text-[11px] sm:text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
            title="Import Products & IMEIs from CSV File"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary flex-shrink-0" />
            <span className="hidden xs:inline whitespace-nowrap">Import CSV</span>
          </button>

          {/* Single Unified Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-extrabold text-[11px] sm:text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
              title="Export Stock Inventory"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary flex-shrink-0" />
              <span className="whitespace-nowrap">Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-30 animate-fadeIn text-xs">
                <button
                  onClick={() => {
                    setIsExportDropdownOpen(false);
                    handleExportCSV();
                  }}
                  className="w-full px-3.5 py-2 text-left font-bold flex items-center space-x-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Export as CSV (.csv)</span>
                </button>
                <button
                  onClick={() => {
                    setIsExportDropdownOpen(false);
                    handleExportPDF();
                  }}
                  className="w-full px-3.5 py-2 text-left font-bold flex items-center space-x-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-brand-primary" />
                  <span>Export as PDF / Print</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={() => {
              setSelectedProductId(null);
              setActiveModule('add-product');
            }}
            className="h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl btn-gradient-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 text-white flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Add Product</span>
            <span className="sm:hidden whitespace-nowrap">Product</span>
          </button>

          <button
            onClick={loadProductsFromDB}
            disabled={loading}
            className={`w-10 sm:w-10.5 h-10 sm:h-10.5 rounded-xl border flex items-center justify-center transition-all shadow-xs flex-shrink-0 cursor-pointer ${
              isDarkMode
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 🔍 Sleek Compact Filter & Search Control Card */}
      <div className={`p-2.5 sm:p-3.5 rounded-xl border shadow-xs space-y-2 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
        {/* Row 1: Search Input + Camera Barcode Scanner + Low Stock Quick Filter */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-brand-primary absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search model, brand, IMEI..."
              className={`w-full pl-9 pr-8 py-1.5 sm:py-2 rounded-lg text-xs border focus:outline-none focus:border-brand-primary font-bold shadow-2xs ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 p-0.5 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="p-2 sm:px-3 sm:py-2 rounded-lg bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/30 font-extrabold text-xs transition-all flex items-center space-x-1 cursor-pointer flex-shrink-0"
            title="Scan Barcode / IMEI with Camera"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Scan</span>
          </button>

          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`p-2 sm:px-3 sm:py-2 rounded-lg font-extrabold text-xs transition-all flex items-center space-x-1 cursor-pointer flex-shrink-0 border ${onlyLowStock
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            title="Toggle Low Stock Filter"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${onlyLowStock ? 'text-white' : 'text-amber-500'}`} />
            <span className="hidden sm:inline">Low Stock ({lowStockCount})</span>
            <span className="inline sm:hidden font-black">({lowStockCount})</span>
          </button>
        </div>

        {/* Desktop Filter Pills View (Visible on tablet & desktop) */}
        <div className="hidden sm:block space-y-2 pt-1">
          {/* Row 1: Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 flex-shrink-0">
              Category:
            </span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition-all border cursor-pointer ${selectedCategory === 'ALL'
                  ? 'bg-brand-primary text-white border-brand-primary shadow-2xs'
                  : isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>All</span>
            </button>

            {categories
              .filter(c => c.isActive !== false)
              .map((cat) => {
                const Icon = getCategoryIconComponent(cat.iconName, cat.name);
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition-all border cursor-pointer ${isSelected
                        ? 'bg-brand-primary text-white border-brand-primary shadow-2xs'
                        : isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-brand-primary'}`} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
          </div>

          {/* Row 2: Brand Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-1 flex-shrink-0">
              Brand:
            </span>
            <button
              onClick={() => setSelectedBrand('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center space-x-1 transition-all border cursor-pointer ${selectedBrand === 'ALL'
                  ? 'bg-brand-primary text-white border-brand-primary shadow-2xs'
                  : isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>All Brands</span>
            </button>

            {brands
              .filter(b => b.isActive !== false)
              .map((b) => {
                const isSelected = selectedBrand.toLowerCase() === b.name.toLowerCase();
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBrand(b.name)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center space-x-1.5 transition-all border cursor-pointer ${isSelected
                        ? 'bg-brand-primary text-white border-brand-primary shadow-2xs'
                        : isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    {b.logoUrl ? (
                      <img src={b.logoUrl} alt={b.name} className="w-3.5 h-3.5 object-contain rounded bg-white p-0.5" />
                    ) : (
                      <Tag className="w-3 h-3 text-brand-primary" />
                    )}
                    <span>{b.name}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Mobile 1-Tap Dropdown Selectors */}
        <div className="grid grid-cols-2 gap-2 pt-1 sm:hidden">
          <CustomSelect
            options={[
              { value: 'ALL', label: 'Category: All' },
              ...categories.filter(c => c.isActive !== false).map(c => ({ value: c.name, label: c.name }))
            ]}
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
            icon={<Layers className="w-3.5 h-3.5" />}
          />

          <CustomSelect
            options={[
              { value: 'ALL', label: 'Brand: All' },
              ...brands.filter(b => b.isActive !== false).map(b => ({ value: b.name, label: b.name }))
            ]}
            value={selectedBrand}
            onChange={(val) => setSelectedBrand(val)}
            icon={<Tag className="w-3.5 h-3.5" />}
            align="right"
          />
        </div>

        {/* Bottom Bar: Reset Active Filters */}
        {(selectedCategory !== 'ALL' || selectedBrand !== 'ALL') && (
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Active Filters: {selectedCategory !== 'ALL' ? selectedCategory : ''} {selectedBrand !== 'ALL' ? `• ${selectedBrand}` : ''}
            </span>
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedBrand('ALL');
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-black flex items-center space-x-1 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
              title="Reset Filters"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-extrabold text-[11px] sm:text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
            <span>Notice: <strong>{lowStockCount} model(s)</strong> at or below minimum stock limit.</span>
          </div>
          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-black hover:bg-amber-600 cursor-pointer flex-shrink-0"
          >
            {onlyLowStock ? 'Show All' : 'Filter Low Stock'}
          </button>
        </div>
      )}

      {/* Inventory Register Header & Universal Grid vs List View Toggle */}
      <div className="flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-brand-primary flex-shrink-0" />
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Inventory Register ({filteredProducts.length} Models)
          </h3>
        </div>

        {/* Grid vs List View Toggle (Works on Desktop & Mobile) */}
        <div className="flex items-center p-1 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs">
          <button
            type="button"
            onClick={() => setMobileViewLayout('LIST')}
            className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center space-x-1 ${mobileViewLayout === 'LIST' ? 'bg-brand-primary text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            title="List View (Excel Table / Compact List)"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-black">List View</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileViewLayout('GRID')}
            className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center space-x-1 ${mobileViewLayout === 'GRID' ? 'bg-brand-primary text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            title="Grid View (Visual Cards)"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-black">Grid View</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 font-bold text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          Loading stock inventory database...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300">No matching stock entries found</p>
          <p className="text-xs text-slate-400 mt-1">Click "+ Add New Inventory Entry" above to add smartphones or shop accessories</p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (Shown when LIST mode is active on Desktop) */}
          <div className={`hidden ${mobileViewLayout === 'LIST' ? 'md:block' : 'md:hidden'} rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
            {/* Desktop Table Header */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-brand-primary flex-shrink-0" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Inventory Data Register ({filteredProducts.length} Models)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Click any row to view device IMEIs & pictures or open details
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 w-14 text-center">Image</th>
                    <th className="py-3 px-4">Brand & Model Name</th>
                    <th className="py-3 px-4 w-32">Category</th>
                    <th className="py-3 px-4 w-32">Default Selling</th>
                    <th className="py-3 px-4 w-32">Purchase Cost</th>
                    <th className="py-3 px-4 w-36 text-center">In Stock Qty</th>
                    <th className="py-3 px-4 w-32">Stock Value</th>
                    <th className="py-3 px-4 w-28 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                  {paginatedDesktopProducts.map((p) => {
                    const totalValue = p.stockQuantity * (p.purchasePrice || 0);
                    const activeDevicesCount = p.devices?.filter(d => d.status === 'AVAILABLE').length || 0;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleRowClick(p)}
                        className="hover:bg-brand-light/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        {/* Image Thumbnail */}
                        <td className="py-3 px-4 text-center">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden mx-auto">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </td>

                        {/* Brand & Name */}
                        <td className="py-3 px-4">
                          <div className="text-[10px] font-black uppercase text-brand-primary tracking-wider">
                            {p.brand}
                          </div>
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors">
                            {p.name}
                          </div>
                          {p.sku && <div className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {p.sku}</div>}
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col space-y-1">
                            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                              {p.category || 'Electronics'}
                            </span>
                            <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase ${(p.trackingType || (p.isMobile ? 'SERIALIZED' : 'QUANTITY')) === 'SERIALIZED'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              }`}>
                              {(p.trackingType || (p.isMobile ? 'SERIALIZED' : 'QUANTITY')) === 'SERIALIZED' ? 'SERIAL (IMEI/SN)' : 'QUANTITY (Bulk)'}
                            </span>
                          </div>
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-4 font-mono font-black text-sm text-brand-primary">
                          ₹{p.sellingPrice.toLocaleString()}
                        </td>

                        {/* Purchase Cost */}
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {p.purchasePrice ? `₹${p.purchasePrice.toLocaleString()}` : '-'}
                        </td>

                        {/* Available Stock Qty */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black ${p.stockQuantity <= 0
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            : p.stockQuantity <= p.minStockAlert
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                            }`}>
                            {p.stockQuantity} Pcs
                          </span>
                          {(p.trackingType === 'SERIALIZED' || p.isMobile) && (
                            <div className="text-[10px] text-brand-primary font-bold mt-1">
                              {activeDevicesCount} Available Serials
                            </div>
                          )}
                        </td>

                        {/* Stock Value */}
                        <td className="py-3 px-4 font-mono text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          ₹{totalValue.toLocaleString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {p.isMobile ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedModelForDevices(p); }}
                                className="px-2.5 py-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/30 text-xs font-extrabold flex items-center space-x-1 transition-all cursor-pointer"
                                title="View all physical device IMEIs and pictures"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Devices</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedProductId(p.id); setActiveModule('view-product'); }}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="View / Edit Product Details"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDeleteItem(e, p.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Inventory Model"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Cards View (Mobile Cards List/Grid & Desktop Cards Grid) */}
          <div className={`py-1 ${mobileViewLayout === 'GRID' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'block md:hidden space-y-3'
            }`}>
            {(mobileViewLayout === 'GRID' ? paginatedDesktopProducts : paginatedMobileProducts).map((p) => {
              const activeDevicesCount = p.devices?.filter(d => d.status === 'AVAILABLE').length || 0;
              const isGrid = mobileViewLayout === 'GRID';
              return (
                <div
                  key={p.id}
                  onClick={() => handleRowClick(p)}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
                    } ${isGrid ? 'space-y-2' : 'space-y-3'}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black uppercase text-brand-primary tracking-wider truncate">
                        {p.brand}
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold truncate">
                        {p.category || 'Electronics'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Sell Price</span>
                      <span className="font-mono font-black text-xs text-brand-primary">₹{p.sellingPrice.toLocaleString()}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">In Stock</span>
                      <span className={`font-extrabold text-xs ${p.stockQuantity <= 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {p.stockQuantity} Pcs
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    {p.isMobile ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedModelForDevices(p); }}
                        className="flex-1 py-2 rounded-xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white text-xs font-black flex items-center justify-center space-x-1.5 border border-brand-primary/30 active:scale-95 transition-all cursor-pointer"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Devices ({activeDevicesCount})</span>
                      </button>
                    ) : (
                      <div className="flex-1 text-[11px] font-bold text-slate-400 text-center">
                        Bulk Accessory
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedProductId(p.id); setActiveModule('view-product'); }}
                      className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black flex items-center justify-center space-x-1.5 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, p.id)}
                      className="flex-1 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white text-xs font-black flex items-center justify-center space-x-1.5 border border-rose-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Pagination Controls & Mobile Load More Lazy Loading */}
          <PaginationControls
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredProducts.length}
            pageSizeOptions={[5, 10, 15, 20]}
            mobileVisibleCount={mobileVisibleCount}
            onMobileLoadMore={() => setMobileVisibleCount((prev) => prev + 20)}
          />
        </>
      )}

      {/* DEVICE WISE IMAGE & IMEI POPUP MODAL */}
      {selectedModelForDevices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
            {/* Popup Header (Electric Sapphire Blue Brand Theme) */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-brand-primary to-brand-hover text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white overflow-hidden flex-shrink-0">
                  {selectedModelForDevices.imageUrl ? (
                    <img src={selectedModelForDevices.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Smartphone className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase text-sky-100 tracking-wider truncate">
                    {selectedModelForDevices.brand} • Physical Device Register
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white truncate">
                    {selectedModelForDevices.name} ({selectedModelForDevices.devices?.length || 0} Devices)
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedModelForDevices(null)}
                className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/30 transition-colors cursor-pointer flex-shrink-0 ml-2"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subheading Notice (Clean 1-Line Banner) */}
            <div className="px-4 sm:px-6 py-2.5 bg-brand-light dark:bg-brand-primary/10 border-b border-brand-primary/20 text-brand-primary text-xs font-extrabold flex items-center justify-between gap-2">
              <span className="truncate">Click any device below to edit details</span>
              <button
                onClick={() => {
                  setSelectedModelForDevices(null);
                  setSelectedProductId(selectedModelForDevices.id);
                  setActiveModule('view-product');
                }}
                className="px-2.5 py-1 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-[11px] font-black flex items-center space-x-1 transition-all cursor-pointer flex-shrink-0 shadow-2xs"
              >
                <span>Model Summary</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Devices Table inside Popup */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {!selectedModelForDevices.devices || selectedModelForDevices.devices.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-40 text-brand-primary" />
                  <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300">No individual IMEIs added yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add physical devices in Edit mode to populate this list.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/80 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <th className="py-3 px-3 w-14 text-center">Image</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">IMEI Numbers</th>
                          <th className="py-3 px-3">RAM / Storage</th>
                          <th className="py-3 px-3">Color</th>
                          <th className="py-3 px-3 text-right">Selling Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                        {selectedModelForDevices.devices.map((d) => (
                          <tr
                            key={d.id}
                            onClick={() => handleDeviceClick(selectedModelForDevices)}
                            className="hover:bg-brand-light/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                            title="Click to open Full Detail & Edit view for this device"
                          >
                            {/* Device Photo */}
                            <td className="py-3 px-3 text-center">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden mx-auto group-hover:border-brand-primary transition-colors">
                                {d.imageUrl || selectedModelForDevices.imageUrl ? (
                                  <img src={d.imageUrl || selectedModelForDevices.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-3">
                              {d.status === 'AVAILABLE' ? (
                                <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md text-[10px] font-black w-max border border-emerald-500/20">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>AVAILABLE</span>
                                </span>
                              ) : (
                                <span className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md text-[10px] font-black w-max border border-rose-500/20">
                                  <XCircle className="w-3 h-3" />
                                  <span>{d.status}</span>
                                </span>
                              )}
                            </td>

                            {/* IMEI Numbers */}
                            <td className="py-3 px-3">
                              <div className="font-mono font-bold text-xs text-slate-900 dark:text-white group-hover:text-brand-primary transition-colors">
                                IMEI 1: {d.imei1}
                              </div>
                              {d.imei2 && (
                                <div className="font-mono text-[10px] text-slate-400">
                                  IMEI 2: {d.imei2}
                                </div>
                              )}
                            </td>

                            {/* Storage / Specs */}
                            <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300">
                              {d.storage || d.ram ? `${d.ram || ''} ${d.storage || ''}`.trim() : 'Standard Specs'}
                            </td>

                            {/* Color */}
                            <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300">
                              {d.color || 'Standard'}
                            </td>

                            {/* Price */}
                            <td className="py-3 px-3 text-right font-mono font-black text-sm text-brand-primary">
                              ₹{(d.sellingPrice || selectedModelForDevices.sellingPrice).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Device Cards View */}
                  <div className="block md:hidden space-y-3">
                    {selectedModelForDevices.devices.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => handleDeviceClick(selectedModelForDevices)}
                        className={`p-4 rounded-2xl border space-y-3 cursor-pointer ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                              {d.imageUrl || selectedModelForDevices.imageUrl ? (
                                <img src={d.imageUrl || selectedModelForDevices.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <span className="font-mono font-black text-xs text-slate-900 dark:text-white block">
                                {d.imei1}
                              </span>
                              {d.color && <span className="text-[10px] text-slate-400 font-bold">{d.color}</span>}
                            </div>
                          </div>

                          {d.status === 'AVAILABLE' ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              AVAILABLE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              {d.status}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                          <span className="text-slate-500 font-bold">
                            {d.storage || d.ram ? `${d.ram || ''} ${d.storage || ''}`.trim() : 'Standard'}
                          </span>
                          <span className="font-mono font-black text-brand-primary text-sm">
                            ₹{(d.sellingPrice || selectedModelForDevices.sellingPrice).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Popup Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  const id = selectedModelForDevices.id;
                  setSelectedModelForDevices(null);
                  handleDeleteItem(e, id);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white font-extrabold text-xs border border-rose-500/20 transition-all flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Model</span>
              </button>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedModelForDevices(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedModelForDevices.id;
                    setSelectedModelForDevices(null);
                    setSelectedProductId(id);
                    setActiveModule('view-product');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-black text-xs shadow-md shadow-brand-primary/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Model</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode & IMEI Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code, _parsedSticker) => {
          setIsScannerOpen(false);
          const match = products.find(p =>
            p.name.toLowerCase().includes(code.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase() === code.toLowerCase()) ||
            (p.devices && p.devices.some((d: any) => d.imei1 === code || d.imei2 === code))
          );
          if (match) {
            setSearchTerm(code);
            toast.success(`Found existing product: ${match.brand} ${match.name}`);
          } else {
            toast.success('New sticker scanned! Redirecting to Add Stock form...');
            setActiveModule('add-product');
          }
        }}
        title="Inventory Barcode / IMEI Camera Scanner"
      />

      {/* CSV Bulk Importer & Sample File Download Modal */}
      <ImportProductsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={loadProductsFromDB}
      />
    </div>
  );
};
