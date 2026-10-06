import React, { useEffect, useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Tag,
  Package,
  Layers,
  UploadCloud,
  X,
  RefreshCw,
  Search,
  Check,
  Percent,
  Star,
  Watch,
  Smartphone,
  Zap,
  Battery,
  Headphones,
  Shield,
  Speaker,
  Tv,
  Camera,
  Laptop,
  Wind,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'react-hot-toast';
import { PaginationControls } from '../components/PaginationControls';
import {
  fetchBrandsList,
  createBrand,
  updateBrand,
  deleteBrand,
  fetchCategoriesList,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchTaxSlabsList,
  createTaxSlab,
  updateTaxSlab,
  deleteTaxSlab,
  fetchProductsList
} from '../services/api';

export const MasterDataPage: React.FC = () => {
  const { isDarkMode } = useStore();

  const [activeTab, setActiveTab] = useState<'BRANDS' | 'CATEGORIES' | 'TAXES'>('BRANDS');

  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. BRAND MODAL STATE
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandSortOrder, setBrandSortOrder] = useState('0');
  const [savingBrand, setSavingBrand] = useState(false);
  const brandImageInputRef = useRef<HTMLInputElement>(null);

  // 2. CATEGORY MODAL STATE
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [catName, setCatName] = useState('');
  const [catIconName, setCatIconName] = useState('Package');
  const [catDescription, setCatDescription] = useState('');
  const [catHsnCode, setCatHsnCode] = useState('8517');
  const [catGstRate, setCatGstRate] = useState('18');
  const [catTrackingType, setCatTrackingType] = useState<'SERIALIZED' | 'QUANTITY'>('SERIALIZED');
  const [catSortOrder, setCatSortOrder] = useState('0');
  const [savingCategory, setSavingCategory] = useState(false);

  // 3. TAX SLAB MODAL STATE
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingTax, setEditingTax] = useState<any | null>(null);
  const [taxName, setTaxName] = useState('');
  const [taxGstRate, setTaxGstRate] = useState('18');
  const [taxHsnCode, setTaxHsnCode] = useState('8517');
  const [taxDescription, setTaxDescription] = useState('');
  const [taxIsDefault, setTaxIsDefault] = useState(false);
  const [savingTax, setSavingTax] = useState(false);

  const loadAllMasterData = async () => {
    setLoading(true);
    try {
      const [bData, cData, tData, pData] = await Promise.all([
        fetchBrandsList(),
        fetchCategoriesList(),
        fetchTaxSlabsList(),
        fetchProductsList()
      ]);
      setBrands(bData || []);
      setCategories(cData || []);
      setTaxes(tData || []);
      setProducts(pData || []);
    } catch (err) {
      console.error('Error loading master data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMasterData();
  }, []);

  // --- BRAND ACTIONS ---
  const handleOpenAddBrand = () => {
    setEditingBrand(null);
    setBrandName('');
    setBrandLogoUrl('');
    setBrandSortOrder('0');
    setShowBrandModal(true);
  };

  const handleOpenEditBrand = (b: any) => {
    setEditingBrand(b);
    setBrandName(b.name);
    setBrandLogoUrl(b.logoUrl || '');
    setBrandSortOrder(b.sortOrder?.toString() || '0');
    setShowBrandModal(true);
  };

  const handleSaveBrand = async () => {
    if (!brandName.trim()) {
      toast.error('Brand name is required');
      return;
    }
    setSavingBrand(true);
    const payload = {
      name: brandName.trim(),
      logoUrl: brandLogoUrl,
      sortOrder: parseInt(brandSortOrder || '0')
    };

    try {
      if (editingBrand) {
        await updateBrand(editingBrand.id, payload);
        toast.success(`Brand "${brandName}" updated!`);
      } else {
        await createBrand(payload);
        toast.success(`Brand "${brandName}" created!`);
      }
      await loadAllMasterData();
      setShowBrandModal(false);
    } catch (err) {
      console.error('Error saving brand:', err);
      toast.error('Failed to save brand.');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleMoveBrandPriority = async (currentIndex: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= filteredBrands.length) return;

    const updatedList = [...filteredBrands];
    const temp = updatedList[currentIndex];
    updatedList[currentIndex] = updatedList[targetIndex];
    updatedList[targetIndex] = temp;

    const updates = updatedList.map((b, idx) => ({
      id: b.id,
      sortOrder: idx + 1
    }));

    // Optimistically update state
    setBrands(prev =>
      prev.map(b => {
        const found = updates.find(u => u.id === b.id);
        return found ? { ...b, sortOrder: found.sortOrder } : b;
      }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    );

    try {
      await Promise.all(updates.map(u => updateBrand(u.id, { sortOrder: u.sortOrder })));
      await loadAllMasterData();
    } catch (err) {
      console.error('Error updating brand priority:', err);
    }
  };

  const handleToggleBrandActive = async (b: any) => {
    try {
      await updateBrand(b.id, { isActive: b.isActive === false ? true : false });
      await loadAllMasterData();
    } catch (err) {
      console.error('Error toggling brand active state:', err);
    }
  };

  const handleDeleteBrand = async (b: any) => {
    if (!confirm(`Are you sure you want to delete brand "${b.name}"?`)) return;
    try {
      await deleteBrand(b.id);
      await loadAllMasterData();
    } catch (err) {
      console.error('Error deleting brand:', err);
    }
  };

  const handleBrandFileUpload = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setBrandLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // --- CATEGORY ACTIONS ---
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatIconName('Package');
    setCatDescription('');
    setCatHsnCode('8517');
    setCatGstRate('18');
    setCatTrackingType('SERIALIZED');
    setCatSortOrder('0');
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (c: any) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatIconName(c.iconName || (c.name.toLowerCase().includes('watch') ? 'Watch' : 'Package'));
    setCatDescription(c.description || '');
    setCatHsnCode(c.hsnCode || '8517');
    setCatGstRate(c.gstRate?.toString() || '18');
    setCatTrackingType(c.trackingType || 'SERIALIZED');
    setCatSortOrder(c.sortOrder?.toString() || '0');
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      toast.error('Category name is required');
      return;
    }
    setSavingCategory(true);
    const payload = {
      name: catName.trim(),
      iconName: catIconName,
      description: catDescription.trim(),
      hsnCode: catHsnCode.trim(),
      gstRate: parseFloat(catGstRate || '18'),
      trackingType: catTrackingType,
      sortOrder: parseInt(catSortOrder || '0')
    };

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        toast.success(`Category "${catName}" updated!`);
      } else {
        await createCategory(payload);
        toast.success(`Category "${catName}" created!`);
      }
      await loadAllMasterData();
      setShowCategoryModal(false);
    } catch (err) {
      console.error('Error saving category:', err);
      toast.error('Failed to save category.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleMoveCategoryPriority = async (currentIndex: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= filteredCategories.length) return;

    const updatedList = [...filteredCategories];
    const temp = updatedList[currentIndex];
    updatedList[currentIndex] = updatedList[targetIndex];
    updatedList[targetIndex] = temp;

    const updates = updatedList.map((c, idx) => ({
      id: c.id,
      sortOrder: idx + 1
    }));

    // Optimistically update state
    setCategories(prev =>
      prev.map(c => {
        const found = updates.find(u => u.id === c.id);
        return found ? { ...c, sortOrder: found.sortOrder } : c;
      }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    );

    try {
      await Promise.all(updates.map(u => updateCategory(u.id, { sortOrder: u.sortOrder })));
      await loadAllMasterData();
    } catch (err) {
      console.error('Error updating category priority:', err);
    }
  };

  const handleToggleCategoryActive = async (c: any) => {
    try {
      await updateCategory(c.id, { isActive: c.isActive === false ? true : false });
      await loadAllMasterData();
    } catch (err) {
      console.error('Error toggling category active state:', err);
    }
  };

  const handleDeleteCategory = async (c: any) => {
    if (!confirm(`Are you sure you want to delete category "${c.name}"?`)) return;
    try {
      await deleteCategory(c.id);
      await loadAllMasterData();
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  // --- TAX SLAB ACTIONS ---
  const handleOpenAddTax = () => {
    setEditingTax(null);
    setTaxName('');
    setTaxGstRate('18');
    setTaxHsnCode('8517');
    setTaxDescription('');
    setTaxIsDefault(false);
    setShowTaxModal(true);
  };

  const handleOpenEditTax = (t: any) => {
    setEditingTax(t);
    setTaxName(t.name);
    setTaxGstRate(t.gstRate?.toString() || '18');
    setTaxHsnCode(t.hsnCode || '8517');
    setTaxDescription(t.description || '');
    setTaxIsDefault(Boolean(t.isDefault));
    setShowTaxModal(true);
  };

  const handleSaveTax = async () => {
    if (!taxGstRate || isNaN(parseFloat(taxGstRate))) {
      toast.error('Valid GST rate percentage is required');
      return;
    }
    setSavingTax(true);
    const rateNum = parseFloat(taxGstRate);
    const payload = {
      name: taxName.trim() || `GST ${rateNum}%`,
      gstRate: rateNum,
      cgstRate: rateNum / 2,
      sgstRate: rateNum / 2,
      hsnCode: taxHsnCode.trim(),
      description: taxDescription.trim(),
      isDefault: taxIsDefault
    };

    try {
      if (editingTax) {
        await updateTaxSlab(editingTax.id, payload);
        toast.success('Tax Slab Updated!');
      } else {
        await createTaxSlab(payload);
        toast.success('Tax Slab Created!');
      }
      await loadAllMasterData();
      setShowTaxModal(false);
    } catch (err) {
      console.error('Error saving tax slab:', err);
      toast.error('Failed to save tax slab.');
    } finally {
      setSavingTax(false);
    }
  };

  const handleDeleteTax = async (t: any) => {
    if (!confirm(`Are you sure you want to delete tax slab "${t.name}"?`)) return;
    try {
      await deleteTaxSlab(t.id);
      await loadAllMasterData();
    } catch (err) {
      console.error('Error deleting tax slab:', err);
    }
  };

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

  // Filtering
  const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredTaxes = taxes.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Pagination & Mobile Lazy Loading State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
    setMobileVisibleCount(20);
  }, [searchTerm, activeTab]);

  const paginatedBrandsDesktop = filteredBrands.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedBrandsMobile = filteredBrands.slice(0, mobileVisibleCount);

  const paginatedCategoriesDesktop = filteredCategories.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedCategoriesMobile = filteredCategories.slice(0, mobileVisibleCount);

  const paginatedTaxesDesktop = filteredTaxes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedTaxesMobile = filteredTaxes.slice(0, mobileVisibleCount);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Full-Width Top Header Background Canvas with Illustration & Bottom Gradient Fade */}
      <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3.5 sm:px-6 pt-4 sm:pt-6 pb-12 sm:pb-14 bg-gradient-to-b from-sky-100/70 via-blue-50/40 to-slate-50/0 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950/0 relative overflow-hidden">
        {/* Background Decorative Graphic Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 sm:opacity-35 dark:opacity-15 pointer-events-none flex items-center justify-end pr-2 sm:pr-6">
          <svg viewBox="0 0 200 160" className="h-full text-brand-primary fill-current">
            <rect x="35" y="45" width="130" height="85" rx="8" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.2" />
            <path d="M50 70 H150 M50 90 H150 M50 110 H120" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
            <circle cx="150" cy="110" r="14" opacity="0.2" />
            <path d="M145 110 L155 110 M150 105 L150 115" stroke="currentColor" strokeWidth="2.5" opacity="0.4" />
          </svg>
        </div>

        <div className="relative z-10 space-y-0.5 sm:space-y-1 max-w-xl">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Brands, Categories &amp; Tax Slabs
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            Configure system brands, product categories, HSN codes, and GST tax percentages
          </p>
        </div>
      </div>

      {/* Floating Action Bar Container (Full Width Search + Action Buttons) */}
      <div className={`-mt-8 sm:-mt-10 relative z-20 p-2 sm:p-3 rounded-2xl border shadow-xs flex flex-row items-center justify-between gap-2 sm:gap-3 ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
      }`}>
        {/* Full-width Search Input */}
        <div className="flex-1 min-w-0 flex items-center space-x-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <Search className="w-4 h-4 text-brand-primary flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeTab.toLowerCase()} by name...`}
            className="w-full bg-transparent text-xs sm:text-sm font-bold focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {activeTab === 'BRANDS' && (
            <button
              onClick={handleOpenAddBrand}
              className="h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl btn-gradient-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 text-white flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Add Brand</span>
              <span className="sm:hidden whitespace-nowrap">Brand</span>
            </button>
          )}

          {activeTab === 'CATEGORIES' && (
            <button
              onClick={handleOpenAddCategory}
              className="h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl btn-gradient-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 text-white flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Add Category</span>
              <span className="sm:hidden whitespace-nowrap">Category</span>
            </button>
          )}

          {activeTab === 'TAXES' && (
            <button
              onClick={handleOpenAddTax}
              className="h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl btn-gradient-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 text-white flex-shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Add Tax Slab</span>
              <span className="sm:hidden whitespace-nowrap">Tax Slab</span>
            </button>
          )}

          <button
            onClick={loadAllMasterData}
            disabled={loading}
            className={`w-10 sm:w-10.5 h-10 sm:h-10.5 rounded-xl border flex items-center justify-center transition-all shadow-xs flex-shrink-0 cursor-pointer ${
              isDarkMode
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Refresh Master Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Control Card Below (Left: Brands / Categories / Tax Slabs Navigation Tabs) */}
      <div className={`p-2 sm:p-2.5 rounded-2xl border shadow-xs flex items-center justify-between gap-2 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
      }`}>
        <div className={`flex items-center space-x-1 p-1 rounded-xl border flex-shrink-0 min-w-0 ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveTab('BRANDS')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'BRANDS'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Brands ({brands.length})
          </button>
          <button
            onClick={() => setActiveTab('CATEGORIES')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'CATEGORIES'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('TAXES')}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'TAXES'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tax Slabs ({taxes.length})
          </button>
        </div>
      </div>

      {/* TAB 1: BRANDS MASTER REGISTER */}
      {activeTab === 'BRANDS' && (
        <>
          {/* Desktop Table View */}
          <div className={`hidden md:block rounded-xl border overflow-x-auto ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
            <table className="w-full text-left text-xs">
              <thead className={`text-[11px] font-black uppercase tracking-wider border-b ${isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                <tr>
                  <th className="py-3 px-3 w-24">Priority</th>
                  <th className="py-3 px-3 w-16">Logo</th>
                  <th className="py-3 px-3 min-w-[140px]">Brand Name</th>
                  <th className="py-3 px-3">Associated Models</th>
                  <th className="py-3 px-3">Status / Visibility</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                {filteredBrands.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No brands found. Click "+ Add New Brand" to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedBrandsDesktop.map((b, idx) => {
                    const itemCount = products.filter(p => p.brand.toLowerCase() === b.name.toLowerCase()).length;
                    const isItemActive = b.isActive !== false;
                    return (
                      <tr key={b.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${!isItemActive ? 'opacity-60 bg-slate-50/40 dark:bg-slate-950/40' : ''}`}>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-brand-light text-brand-primary font-mono font-black text-xs border border-brand-primary/20">
                              #{(currentPage - 1) * pageSize + idx + 1}
                            </span>
                            <div className="flex flex-col space-y-0.5">
                              <button
                                disabled={idx === 0}
                                onClick={() => handleMoveBrandPriority((currentPage - 1) * pageSize + idx, 'UP')}
                                className="p-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                title="Move Up (Show Earlier)"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                disabled={idx === filteredBrands.length - 1}
                                onClick={() => handleMoveBrandPriority((currentPage - 1) * pageSize + idx, 'DOWN')}
                                className="p-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                title="Move Down (Show Later)"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {b.logoUrl ? (
                            <img src={b.logoUrl} alt={b.name} className="w-8 h-8 object-contain rounded-md bg-white p-1 border border-slate-200 dark:border-slate-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <Tag className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                          {b.name}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-bold">
                          {itemCount} Models Registered
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleBrandActive(b)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center space-x-1 border transition-colors cursor-pointer ${
                              isItemActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            {isItemActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{isItemActive ? 'Active' : 'Hidden'}</span>
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEditBrand(b)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Edit Brand"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBrand(b)}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Brand"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-3">
            {filteredBrands.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                No brands found. Click "+ Add New Brand" to create one.
              </div>
            ) : (
              paginatedBrandsMobile.map((b) => {
                const itemCount = products.filter(p => p.brand.toLowerCase() === b.name.toLowerCase()).length;
                const isItemActive = b.isActive !== false;
                return (
                  <div key={b.id} className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'} ${!isItemActive ? 'opacity-70' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {b.logoUrl ? (
                          <img src={b.logoUrl} alt={b.name} className="w-9 h-9 object-contain rounded-md bg-white p-1 border border-slate-200 dark:border-slate-700" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <Tag className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{b.name}</h3>
                          <p className="text-[10px] text-slate-400 font-bold">{itemCount} Models Registered</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleToggleBrandActive(b)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 border cursor-pointer ${
                          isItemActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {isItemActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{isItemActive ? 'Active' : 'Hidden'}</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEditBrand(b)}
                          className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1 cursor-pointer hover:bg-slate-200"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBrand(b)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 cursor-pointer hover:bg-rose-100"
                          title="Delete Brand"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <PaginationControls
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredBrands.length}
            pageSizeOptions={[5, 10, 15, 20]}
            mobileVisibleCount={mobileVisibleCount}
            onMobileLoadMore={() => setMobileVisibleCount((prev) => prev + 20)}
          />
        </>
      )}

      {/* TAB 2: CATEGORY MASTER REGISTER */}
      {activeTab === 'CATEGORIES' && (
        <>
          {/* Desktop Table View (Optimized for 15-inch Laptops & Standard Displays) */}
          <div className={`hidden md:block rounded-xl border overflow-x-auto ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
            <table className="w-full text-left text-xs min-w-[880px]">
              <thead className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider border-b ${isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                <tr>
                  <th className="py-3 px-3 w-24">Priority</th>
                  <th className="py-3 px-3 min-w-[140px]">Category Name</th>
                  <th className="py-3 px-3 max-w-[180px]">Description</th>
                  <th className="py-3 px-3">Default HSN</th>
                  <th className="py-3 px-3">Tracking Type</th>
                  <th className="py-3 px-3">GST Rate</th>
                  <th className="py-3 px-3 text-center">Stock Items</th>
                  <th className="py-3 px-3">Visibility</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No categories found. Click "+ Add New Category" to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedCategoriesDesktop.map((c, idx) => {
                    const itemCount = products.filter(p =>
                      p.category.toLowerCase().includes(c.name.toLowerCase()) ||
                      (c.name.toLowerCase().includes('smartphone') && p.isMobile)
                    ).length;
                    const CatIcon = getCategoryIconComponent(c.iconName, c.name);
                    const isCatActive = c.isActive !== false;
                    return (
                      <tr key={c.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${!isCatActive ? 'opacity-60 bg-slate-50/40 dark:bg-slate-950/40' : ''}`}>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-brand-light text-brand-primary font-mono font-black text-xs border border-brand-primary/20">
                              #{(currentPage - 1) * pageSize + idx + 1}
                            </span>
                            <div className="flex flex-col space-y-0.5">
                              <button
                                disabled={idx === 0}
                                onClick={() => handleMoveCategoryPriority((currentPage - 1) * pageSize + idx, 'UP')}
                                className="p-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                title="Move Up (Show Earlier)"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                disabled={idx === filteredCategories.length - 1}
                                onClick={() => handleMoveCategoryPriority((currentPage - 1) * pageSize + idx, 'DOWN')}
                                className="p-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                title="Move Down (Show Later)"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-black text-xs sm:text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <CatIcon className="w-4 h-4 text-brand-primary flex-shrink-0" />
                            <span className="truncate">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 max-w-[160px] xl:max-w-xs truncate" title={c.description || ''}>
                          {c.description || '—'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {c.hsnCode || '8517'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap inline-block ${
                            String(c.trackingType || '').toUpperCase() === 'QUANTITY'
                              ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            }`}>
                            {String(c.trackingType || '').toUpperCase() === 'QUANTITY' ? 'QUANTITY' : 'SERIAL (IMEI)'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 text-xs font-black border border-indigo-200 dark:border-indigo-800 whitespace-nowrap inline-block">
                            {c.gstRate || 18}% GST
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold whitespace-nowrap">
                            {itemCount} Pcs
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleCategoryActive(c)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center space-x-1 border transition-all cursor-pointer ${isCatActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200'
                              }`}
                            title={isCatActive ? 'Click to Deactivate / Hide' : 'Click to Activate / Show'}
                          >
                            {isCatActive ? (
                              <>
                                <Eye className="w-3 h-3 text-emerald-600" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3 text-slate-400" />
                                <span>Hidden</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEditCategory(c)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(c)}
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-3">
            {filteredCategories.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                No categories found. Click "+ Add New Category" to create one.
              </div>
            ) : (
              paginatedCategoriesMobile.map((c) => {
                const itemCount = products.filter(p =>
                  p.category.toLowerCase().includes(c.name.toLowerCase()) ||
                  (c.name.toLowerCase().includes('smartphone') && p.isMobile)
                ).length;
                const CatIcon = getCategoryIconComponent(c.iconName, c.name);
                const isCatActive = c.isActive !== false;
                return (
                  <div key={c.id} className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'} ${!isCatActive ? 'opacity-70' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-md bg-brand-light dark:bg-slate-800 text-brand-primary flex items-center justify-center border border-brand-primary/20">
                          <CatIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{c.name}</h3>
                          <p className="text-[10px] text-slate-400 font-bold">{c.description || 'Category Register'}</p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                        String(c.trackingType || '').toUpperCase() === 'QUANTITY'
                          ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        }`}>
                        {String(c.trackingType || '').toUpperCase() === 'QUANTITY' ? 'QUANTITY' : 'SERIAL'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-b py-2 border-slate-100 dark:border-slate-800 text-slate-500">
                      <span>HSN: <strong className="font-mono text-slate-800 dark:text-slate-200">{c.hsnCode || '8517'}</strong></span>
                      <span>GST: <strong className="text-indigo-600 dark:text-indigo-400">{c.gstRate || 18}%</strong></span>
                      <span>Stock: <strong>{itemCount} Pcs</strong></span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleToggleCategoryActive(c)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 border cursor-pointer ${
                          isCatActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {isCatActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{isCatActive ? 'Active' : 'Hidden'}</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEditCategory(c)}
                          className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1 cursor-pointer hover:bg-slate-200"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c)}
                          className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 cursor-pointer hover:bg-rose-100"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <PaginationControls
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredCategories.length}
            pageSizeOptions={[5, 10, 15, 20]}
            mobileVisibleCount={mobileVisibleCount}
            onMobileLoadMore={() => setMobileVisibleCount((prev) => prev + 20)}
          />
        </>
      )}

      {/* TAB 3: SYSTEM TAX SLAB REGISTER */}
      {activeTab === 'TAXES' && (
        <>
          {/* Desktop Table View */}
          <div className={`hidden md:block rounded-xl border overflow-x-auto ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
            <table className="w-full text-left text-xs">
              <thead className={`text-[11px] font-black uppercase tracking-wider border-b ${isDarkMode ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                <tr>
                  <th className="py-3 px-4">Tax Slab Name</th>
                  <th className="py-3 px-4">Total GST %</th>
                  <th className="py-3 px-4">CGST %</th>
                  <th className="py-3 px-4">SGST %</th>
                  <th className="py-3 px-4">Default HSN</th>
                  <th className="py-3 px-4">Status / Description</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                {filteredTaxes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No tax slabs found. Click "+ Add Tax Slab / HSN" to create one.
                    </td>
                  </tr>
                ) : (
                  paginatedTaxesDesktop.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-black text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                        <Percent className="w-4 h-4 text-brand-primary flex-shrink-0" />
                        <span>{t.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 rounded-lg bg-brand-primary text-white font-black text-xs shadow-xs">
                          {t.gstRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {t.cgstRate || t.gstRate / 2}%
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                        {t.sgstRate || t.gstRate / 2}%
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {t.hsnCode || '8517'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {t.isDefault && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-extrabold text-[10px] uppercase border border-amber-500/20 flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-amber-500" />
                              <span>Default Rate</span>
                            </span>
                          )}
                          <span className="text-slate-400 truncate max-w-xs">{t.description || 'Standard Tax Rate'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenEditTax(t)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Edit Tax Slab"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTax(t)}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Tax Slab"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-3">
            {filteredTaxes.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                No tax slabs found. Click "+ Add Tax Slab / HSN" to create one.
              </div>
            ) : (
              paginatedTaxesMobile.map((t) => (
                <div key={t.id} className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Percent className="w-5 h-5 text-brand-primary flex-shrink-0" />
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{t.name}</h3>
                    </div>

                    <span className="px-3 py-1 rounded-lg bg-brand-primary text-white font-black text-xs">
                      {t.gstRate}% GST
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-b py-2 border-slate-100 dark:border-slate-800 text-slate-500">
                    <span>CGST: <strong className="text-slate-800 dark:text-slate-200">{t.cgstRate || t.gstRate / 2}%</strong></span>
                    <span>SGST: <strong className="text-slate-800 dark:text-slate-200">{t.sgstRate || t.gstRate / 2}%</strong></span>
                    <span>HSN: <strong className="font-mono text-slate-800 dark:text-slate-200">{t.hsnCode || '8517'}</strong></span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {t.isDefault ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-extrabold text-[10px] uppercase border border-amber-500/20 flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-amber-500" />
                        <span>Default</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 truncate max-w-[150px]">{t.description || 'Standard Tax Rate'}</span>
                    )}

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenEditTax(t)}
                        className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1 cursor-pointer hover:bg-slate-200"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTax(t)}
                        className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 cursor-pointer hover:bg-rose-100"
                        title="Delete Tax Slab"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <PaginationControls
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredTaxes.length}
            pageSizeOptions={[5, 10, 15, 20]}
            mobileVisibleCount={mobileVisibleCount}
            onMobileLoadMore={() => setMobileVisibleCount((prev) => prev + 20)}
          />
        </>
      )}

      {/* --- MODAL 1: BRAND ADD/EDIT MODAL --- */}
      {showBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden my-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
            <div className="p-5 bg-brand-primary text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-white" />
                <h3 className="text-base font-black">{editingBrand ? 'Edit Brand Master' : 'Register New Brand'}</h3>
              </div>
              <button onClick={() => setShowBrandModal(false)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                    Brand Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Motorola, Google, Vivo"
                    className={`w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                    Priority #
                  </label>
                  <input
                    type="number"
                    value={brandSortOrder}
                    onChange={(e) => setBrandSortOrder(e.target.value)}
                    placeholder="1, 2, 3..."
                    className={`w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                  Brand Logo Image / URL
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    placeholder="Paste image URL or click below to upload..."
                    className={`w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                  <div
                    onClick={() => brandImageInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg h-24 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer overflow-hidden relative"
                  >
                    {brandLogoUrl ? (
                      <img src={brandLogoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 mb-1 text-brand-primary" />
                        <span className="text-[11px] font-bold">Click to Upload Brand Logo</span>
                      </>
                    )}
                    <input
                      type="file"
                      ref={brandImageInputRef}
                      onChange={(e) => { if (e.target.files?.[0]) handleBrandFileUpload(e.target.files[0]); }}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button type="button" onClick={() => setShowBrandModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="button" disabled={savingBrand} onClick={handleSaveBrand} className="px-6 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-black text-xs shadow-md shadow-brand-primary/20 transition-all flex items-center space-x-1.5 cursor-pointer">
                <Check className="w-4 h-4" />
                <span>{savingBrand ? 'Saving...' : 'Save Brand'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CATEGORY ADD/EDIT MODAL --- */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden my-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
            <div className="p-5 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5" />
                <h3 className="text-base font-black">{editingCategory ? 'Edit Category Master' : 'Register New Category'}</h3>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="p-1.5 rounded-lg bg-emerald-700/50 hover:bg-emerald-700 text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Wireless Chargers, Smartwatches"
                    className={`w-full px-3 py-2 rounded-xl border font-bold text-xs focus:outline-none focus:border-emerald-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                    Priority #
                  </label>
                  <input
                    type="number"
                    value={catSortOrder}
                    onChange={(e) => setCatSortOrder(e.target.value)}
                    placeholder="1, 2, 3..."
                    className={`w-full px-3 py-2 rounded-xl border font-bold text-xs focus:outline-none focus:border-emerald-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                  Inventory Tracking Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatTrackingType('SERIALIZED')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${catTrackingType === 'SERIALIZED'
                        ? 'bg-brand-light/60 border-brand-primary text-brand-primary dark:bg-brand-primary/10 dark:text-sky-300 font-extrabold'
                        : isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                  >
                    <div className="text-xs font-black flex items-center justify-between">
                      <span>Serialized (Serial / IMEI)</span>
                      {catTrackingType === 'SERIALIZED' && <Check className="w-4 h-4 text-brand-primary" />}
                    </div>
                    <p className="text-[10px] opacity-75 mt-1 font-normal">Mobiles, TVs, ACs, Laptops, Fridges, Tablets</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCatTrackingType('QUANTITY')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${catTrackingType === 'QUANTITY'
                        ? 'bg-brand-light/60 border-brand-primary text-brand-primary dark:bg-brand-primary/10 dark:text-sky-300 font-extrabold'
                        : isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                  >
                    <div className="text-xs font-black flex items-center justify-between">
                      <span>Quantity (Bulk Stock)</span>
                      {catTrackingType === 'QUANTITY' && <Check className="w-4 h-4 text-brand-primary" />}
                    </div>
                    <p className="text-[10px] opacity-75 mt-1 font-normal">Chargers, Cables, Earbuds, Covers, Accessories</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                  Select Category Icon
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Smartphone', label: 'Smartphone', icon: Smartphone },
                    { id: 'Laptop', label: 'Laptop / PC', icon: Laptop },
                    { id: 'Tv', label: 'Smart TV', icon: Tv },
                    { id: 'Wind', label: 'Air Conditioner', icon: Wind },
                    { id: 'Zap', label: 'Charger / Cable', icon: Zap },
                    { id: 'Headphones', label: 'Earbuds / Audio', icon: Headphones },
                    { id: 'Watch', label: 'Smartwatch', icon: Watch },
                    { id: 'Battery', label: 'Power Bank', icon: Battery },
                    { id: 'Shield', label: 'Cases & Covers', icon: Shield },
                    { id: 'Package', label: 'General Accessory', icon: Package }
                  ].map((ic) => {
                    const IconComponent = ic.icon;
                    return (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setCatIconName(ic.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${catIconName === ic.id
                            ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                            : isDarkMode
                              ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        <div className="flex items-center space-x-2">
                          <IconComponent className="w-4 h-4 flex-shrink-0" />
                          <span>{ic.label}</span>
                        </div>
                        {catIconName === ic.id && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <input
                  type="text"
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Brief description..."
                  className={`w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                    Default HSN Code
                  </label>
                  <input
                    type="text"
                    value={catHsnCode}
                    onChange={(e) => setCatHsnCode(e.target.value)}
                    placeholder="8517"
                    className={`w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                    Default GST Rate %
                  </label>
                  <input
                    type="number"
                    value={catGstRate}
                    onChange={(e) => setCatGstRate(e.target.value)}
                    placeholder="18"
                    className={`w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="button" disabled={savingCategory} onClick={handleSaveCategory} className="px-6 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-black text-xs shadow-md shadow-brand-primary/20 transition-all flex items-center space-x-1.5 cursor-pointer">
                <Check className="w-4 h-4" />
                <span>{savingCategory ? 'Saving...' : 'Save Category'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: TAX SLAB ADD/EDIT MODAL --- */}
      {showTaxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className={`w-full max-w-md rounded-xl border shadow-2xl overflow-hidden my-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
            <div className="p-5 bg-brand-primary text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Percent className="w-5 h-5 text-white" />
                <h3 className="text-base font-black">{editingTax ? 'Edit Tax Slab Master' : 'Register New Tax Slab'}</h3>
              </div>
              <button onClick={() => setShowTaxModal(false)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                  Tax Slab Label / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="e.g. GST 18% Standard Rate"
                  className={`w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                    Total GST % <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={taxGstRate}
                    onChange={(e) => setTaxGstRate(e.target.value)}
                    placeholder="18"
                    className={`w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                    Default HSN Code
                  </label>
                  <input
                    type="text"
                    value={taxHsnCode}
                    onChange={(e) => setTaxHsnCode(e.target.value)}
                    placeholder="8517"
                    className={`w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                  Description / Applicability
                </label>
                <input
                  type="text"
                  value={taxDescription}
                  onChange={(e) => setTaxDescription(e.target.value)}
                  placeholder="e.g. Standard rate for mobile phones & chargers"
                  className={`w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:border-brand-primary ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="taxIsDefault"
                  checked={taxIsDefault}
                  onChange={(e) => setTaxIsDefault(e.target.checked)}
                  className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary cursor-pointer"
                />
                <label htmlFor="taxIsDefault" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Set as System Default Tax Slab for New Items
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button type="button" onClick={() => setShowTaxModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                Cancel
              </button>
              <button type="button" disabled={savingTax} onClick={handleSaveTax} className="px-6 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-black text-xs shadow-md shadow-brand-primary/20 transition-all flex items-center space-x-1.5 cursor-pointer">
                <Check className="w-4 h-4" />
                <span>{savingTax ? 'Saving...' : 'Save Tax Slab'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
