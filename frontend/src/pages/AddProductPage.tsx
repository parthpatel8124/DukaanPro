import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Package, 
  Save, 
  Plus, 
  Trash2,
  UploadCloud,
  CheckCircle2,
  ClipboardPaste,
  Image as ImageIcon,
  ArrowLeft,
  Tag,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import type { ParsedBoxSticker } from '../utils/boxStickerParser';
import { toast } from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { BASE_URL } from '../services/api';
import { createProductItem, updateProductItem, fetchBrandsList, fetchCategoriesList, createBrand } from '../services/api';

interface DeviceRow {
  id?: string;
  imei1: string;
  imei2: string;
  color: string;
  ram: string;
  storage: string;
  purchasePrice: string;
  sellingPrice: string;
  imageUrl?: string;
  status: string;
}

export const AddProductPage: React.FC = () => {
  const { isDarkMode, selectedProductId, setActiveModule, setSelectedProductId } = useStore();
  
  // High-level state (SERIALIZED for Mobiles, TVs, ACs, Laptops vs QUANTITY for Chargers, Cables, Earbuds)
  const [mode, setMode] = useState<'SERIALIZED' | 'QUANTITY'>('SERIALIZED');
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  // Refs for always-current values inside callbacks (avoids stale closures)
  const brandsRef = useRef<any[]>([]);
  const categoriesRef = useRef<any[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(selectedProductId));
  const [success, setSuccess] = useState(false);
  
  // Brand Master List & Add Brand Modal State
  const [brands, setBrands] = useState<any[]>([]);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandLogo, setNewBrandLogo] = useState('');
  const [brandSaving, setBrandSaving] = useState(false);

  // Keep refs in sync with state so handleStickerScanned always sees latest values
  useEffect(() => { brandsRef.current = brands; }, [brands]);
  useEffect(() => { categoriesRef.current = categoriesList; }, [categoriesList]);

  // Model/Product State
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mobile');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [hsnCode, setHsnCode] = useState('8517');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [imageUrl, setImageUrl] = useState('');
  const [supplierName, setSupplierName] = useState('');
  
  // Accessory specific
  const [stockQuantity, setStockQuantity] = useState('1');
  const [minStockAlert, setMinStockAlert] = useState('5');
  const [barcode, setBarcode] = useState('');
  
  // Devices specific
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleStickerScanned = (scannedCode: string, parsedSticker?: ParsedBoxSticker) => {
    // No sticker data — handle plain barcode / IMEI
    if (!parsedSticker) {
      if (scannedCode && scannedCode !== 'STICKER_EXTRACTED') {
        const isImeiCode = scannedCode.length === 15 && /^\d+$/.test(scannedCode);
        if (isImeiCode) {
          setMode('SERIALIZED');
          setDevices((prev: DeviceRow[]) => [
            ...prev,
            { imei1: scannedCode, imei2: '', color: '', ram: '', storage: '',
              purchasePrice: purchasePrice || '0', sellingPrice: sellingPrice || '0', status: 'AVAILABLE' }
          ]);
          toast.success(`IMEI added: ${scannedCode}`);
        } else {
          setMode('QUANTITY');
          setBarcode(scannedCode);
          toast.success(`Barcode set: ${scannedCode}`);
        }
      }
      return;
    }

    // === Sticker data received — fill all form fields ===
    console.log('[handleStickerScanned] received:', { scannedCode, parsedSticker });

    // 1. Mode detection — always SERIALIZED for phone stickers
    setMode('SERIALIZED');

    // 2. Brand: use ref to get current brands list (avoids stale closure)
    const rawBrand = (parsedSticker.brand || '').trim();
    if (rawBrand) {
      const currentBrands = brandsRef.current;
      const existingBrand = currentBrands.find(
        (b: any) => b.name.toLowerCase() === rawBrand.toLowerCase()
      );
      if (existingBrand) {
        setBrand(existingBrand.name);
      } else {
        // Add to list FIRST so <option> exists, then select it
        const newBrands = [...currentBrands, { id: `auto-${Date.now()}`, name: rawBrand, isActive: true }];
        brandsRef.current = newBrands;
        setBrands(newBrands);
        setBrand(rawBrand);
      }
    }

    // 3. Model Name
    if (parsedSticker.modelName) setName(parsedSticker.modelName.trim());

    // 4. Category: use ref for current categories list
    const currentCats = categoriesRef.current;
    const mobileCat = currentCats.find(
      (c: any) =>
        c.name.toLowerCase().includes('mobile') ||
        c.name.toLowerCase().includes('phone') ||
        c.name.toLowerCase().includes('smartphone')
    );
    if (mobileCat) {
      setCategory(mobileCat.name);
    } else if (currentCats.length > 0) {
      setCategory(currentCats[0].name);
    } else {
      const fallbackCat = { id: 'auto-cat-mobile', name: 'Mobile', isActive: true };
      const newCats = [...currentCats, fallbackCat];
      categoriesRef.current = newCats;
      setCategoriesList(newCats);
      setCategory('Mobile');
    }

    // 5. Devices (always add a row, even if IMEI is empty — user can fill it in)
    const newImei1 = parsedSticker.imei1 ||
      (scannedCode !== 'STICKER_EXTRACTED' && /^\d{15}$/.test(scannedCode) ? scannedCode : '');
    const newImei2 = parsedSticker.imei2 || '';
    const newColor = parsedSticker.color || '';
    const rawStorage = parsedSticker.storage || '';
    const rawRam = parsedSticker.ram || '';
    // Combine RAM + Storage into one visible "Variant / Specs" value e.g. "8GB / 128GB"
    const newStorage = rawRam && rawStorage
      ? `${rawRam} / ${rawStorage}`
      : rawRam || rawStorage;
    const newRam = rawRam;

    setDevices((prev: DeviceRow[]) => {
      const existingIdx = prev.findIndex(
        (d) => (newImei1 && d.imei1 === newImei1) || d.imei1 === ''
      );
      const newDevice: DeviceRow = {
        imei1: newImei1,
        imei2: newImei2,
        color: newColor,
        ram: newRam,
        storage: newStorage,
        purchasePrice: purchasePrice || '0',
        sellingPrice: sellingPrice || '0',
        status: 'AVAILABLE'
      };
      if (prev.length === 0) return [newDevice];
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          imei1: newImei1 || updated[existingIdx].imei1,
          imei2: newImei2 || updated[existingIdx].imei2,
          color: newColor || updated[existingIdx].color,
          ram: newRam || updated[existingIdx].ram,
          storage: newStorage || updated[existingIdx].storage
        };
        return updated;
      }
      return [...prev, newDevice];
    });

    // 6. CRITICAL: Switch to Step 1 so user can see the filled Brand/Model/Category fields
    setStep(1);

    const summary = [
      rawBrand && `Brand: ${rawBrand}`,
      parsedSticker.modelName && `Model: ${parsedSticker.modelName}`,
      newImei1 && `IMEI1: ${newImei1.slice(0, 8)}...`,
      newImei2 && `IMEI2: ${newImei2.slice(0, 8)}...`
    ].filter(Boolean).join(' | ');
    toast.success(`✅ Fields filled! ${summary || 'Check Brand & Model fields below.'}`);
  };

  // Refs for file uploads
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const deviceImageInputRef = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Load Brands & Categories Master List on Mount
  const loadMasterLists = async () => {
    try {
      const [bData, cData] = await Promise.all([
        fetchBrandsList(),
        fetchCategoriesList()
      ]);
      setBrands(bData || []);
      setCategoriesList(cData || []);
    } catch (err) {
      console.error('Error fetching master lists:', err);
    }
  };

  useEffect(() => {
    loadMasterLists();
  }, []);

  const handleSaveNewBrand = async () => {
    if (!newBrandName.trim()) {
      toast.error('Please enter brand name');
      return;
    }
    setBrandSaving(true);
    try {
      const created = await createBrand({ name: newBrandName, logoUrl: newBrandLogo });
      if (created) {
        await loadMasterLists();
        setBrand(created.name);
        setShowAddBrandModal(false);
        setNewBrandName('');
        setNewBrandLogo('');
        toast.success(`Brand "${created.name}" created!`);
      }
    } catch (err) {
      console.error('Error creating brand:', err);
      toast.error('Failed to create brand.');
    } finally {
      setBrandSaving(false);
    }
  };

  // Load existing product if Editing
  useEffect(() => {
    if (!selectedProductId) {
      setFetching(false);
      return;
    }

    const loadExistingProduct = async () => {
      setFetching(true);
      try {
        const res = await fetch(`${BASE_URL}/products/${selectedProductId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const p = json.data;
          setMode(p.trackingType === 'QUANTITY' || (!p.isMobile && p.trackingType !== 'SERIALIZED') ? 'QUANTITY' : 'SERIALIZED');
          setBrand(p.brand || '');
          setName(p.name || '');
          setCategory(p.category || 'Mobile');
          setPurchasePrice(p.purchasePrice?.toString() || '');
          setSellingPrice(p.sellingPrice?.toString() || '');
          setGstRate(p.gstRate?.toString() || '18');
          setHsnCode(p.hsnCode || '8517');
          setWarrantyMonths(p.warrantyMonths?.toString() || '12');
          setImageUrl(p.imageUrl || '');
          setSupplierName(p.supplierName || '');
          setStockQuantity(p.stockQuantity?.toString() || '1');
          setMinStockAlert(p.minStockAlert?.toString() || '5');
          setBarcode(p.sku || '');

          if (p.isMobile && p.devices) {
            setDevices(p.devices.map((d: any) => ({
              id: d.id,
              imei1: d.imei1 || '',
              imei2: d.imei2 || '',
              color: d.color || '',
              ram: d.ram || '',
              storage: d.storage || '',
              purchasePrice: d.purchasePrice?.toString() || '',
              sellingPrice: d.sellingPrice?.toString() || '',
              imageUrl: d.imageUrl || '',
              status: d.status || 'AVAILABLE'
            })));
          }
        }
      } catch (err) {
        console.error('Error fetching product for edit:', err);
      } finally {
        setFetching(false);
      }
    };

    loadExistingProduct();
  }, [selectedProductId]);

  // Handle Base64 Image File Upload
  const handleFileUpload = (file: File, callback: (base64: string) => void) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size exceeds 2MB limit.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Bulk IMEI Paste logic
  const handleBulkPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const lines = pasted.split('\n').map(l => l.trim()).filter(l => l.length >= 14);
    if (lines.length > 0) {
      const newDevices = lines.map(line => ({
        imei1: line,
        imei2: '',
        color: '',
        ram: '',
        storage: '',
        purchasePrice: purchasePrice,
        sellingPrice: sellingPrice,
        status: 'AVAILABLE'
      }));
      setDevices([...devices, ...newDevices]);
    }
  };

  const addDeviceRow = () => {
    setDevices([
      ...devices,
      {
        imei1: '',
        imei2: '',
        color: '',
        ram: '',
        storage: '',
        purchasePrice: purchasePrice,
        sellingPrice: sellingPrice,
        status: 'AVAILABLE'
      }
    ]);
  };

  const removeDeviceRow = (index: number) => {
    const newArr = [...devices];
    newArr.splice(index, 1);
    setDevices(newArr);
  };

  const updateDevice = (index: number, field: keyof DeviceRow, value: string) => {
    const newArr = [...devices];
    newArr[index] = { ...newArr[index], [field]: value };
    setDevices(newArr);
  };

  const handleSave = async () => {
    if (!brand || !name || !sellingPrice) {
      toast.error('Brand, Model Name, and Selling Price are required.');
      return;
    }
    
    if (mode === 'SERIALIZED') {
      if (devices.length === 0) {
        if (!confirm('You have not added any physical units (0 stock). Continue saving model specifications only?')) return;
      }
      
      const emptySerial = devices.find((d: DeviceRow) => !d.imei1 || !d.imei1.trim());
      if (emptySerial) {
        toast.error('Serial Number / IMEI 1 is required for all units.');
        return;
      }
      
      const serials = devices.map((d: DeviceRow) => d.imei1.trim().toUpperCase());
      const uniqueSerials = new Set(serials);
      if (uniqueSerials.size !== serials.length) {
        toast.error('Duplicate Serial / IMEI numbers found in your unit list. Please resolve duplicates before saving.');
        return;
      }
    }
    
    setLoading(true);
    const payload = {
      name: name.trim(),
      brand: brand.trim(),
      category: category ? category.trim() : (mode === 'SERIALIZED' ? 'Mobile' : 'Accessories'),
      isMobile: mode === 'SERIALIZED',
      trackingType: mode,
      purchasePrice: parseFloat(purchasePrice || '0'),
      sellingPrice: parseFloat(sellingPrice || '0'),
      gstRate: parseFloat(gstRate || '18'),
      hsnCode: hsnCode ? hsnCode.trim() : '8517',
      warrantyMonths: parseInt(warrantyMonths || '12', 10),
      supplierName: supplierName ? supplierName.trim() : null,
      imageUrl,
      stockQuantity: mode === 'QUANTITY' ? Math.max(0, parseInt(stockQuantity || '0', 10)) : 0,
      minStockAlert: mode === 'QUANTITY' ? Math.max(0, parseInt(minStockAlert || '5', 10)) : 0,
      sku: mode === 'QUANTITY' ? (barcode ? barcode.trim() : undefined) : undefined,
      devices: mode === 'SERIALIZED' ? devices.map((d: DeviceRow) => ({
        ...d,
        imei1: d.imei1.trim().toUpperCase(),
        imei2: d.imei2 ? d.imei2.trim().toUpperCase() : undefined
      })) : undefined
    };

    try {
      if (selectedProductId) {
        await updateProductItem(selectedProductId, payload);
        toast.success('Inventory Item Updated Successfully!');
      } else {
        await createProductItem(payload);
        toast.success('Inventory Item Added Successfully!');
      }
      setSuccess(true);
      setTimeout(() => {
        setSelectedProductId(null);
        setActiveModule('products'); // Perfectly redirects using store navigation
      }, 1200);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save product. Ensure Serial/IMEI numbers are unique across inventory.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-12 text-center text-slate-400 font-bold">Loading product data for editing...</div>;
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          {selectedProductId ? 'Inventory Updated Successfully!' : 'Inventory Added Successfully!'}
        </h2>
        <p className="text-slate-500 mt-2 font-medium">Redirecting back to product list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Full-Width Top Header Background Canvas with Illustration & Bottom Gradient Fade */}
      <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3.5 sm:px-6 pt-4 sm:pt-6 pb-12 sm:pb-14 bg-gradient-to-b from-sky-100/70 via-blue-50/40 to-slate-50/0 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950/0 relative overflow-hidden">
        {/* Background Decorative Graphic Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 sm:opacity-35 dark:opacity-15 pointer-events-none flex items-center justify-end pr-2 sm:pr-6">
          <svg viewBox="0 0 200 160" className="h-full text-brand-primary fill-current">
            <rect x="60" y="30" width="80" height="110" rx="12" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.25" />
            <circle cx="100" cy="45" r="3" opacity="0.4" />
            <rect x="75" y="60" width="50" height="50" rx="4" opacity="0.15" />
            <circle cx="100" cy="125" r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          </svg>
        </div>

        <div className="relative z-10 space-y-0.5 sm:space-y-1 max-w-xl">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {selectedProductId ? 'Edit Product Item' : 'Add New Inventory'}
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
            {selectedProductId ? 'Update product specifications, prices, or device IMEIs' : 'Add smartphones by IMEI or general accessories in bulk'}
          </p>
        </div>
      </div>

      {/* Floating Action Bar Container (Back Button + Mode Selector) */}
      <div className={`-mt-8 sm:-mt-10 relative z-20 p-2 sm:p-3 rounded-2xl border shadow-xs flex flex-row items-center justify-between gap-1.5 sm:gap-3 ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
      }`}>
        <button 
          onClick={() => { setSelectedProductId(null); setActiveModule('products'); }}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Back to Inventory</span>
          <span className="sm:hidden whitespace-nowrap">Back</span>
        </button>

        {/* Mode Selector */}
        <div className={`flex p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 ${selectedProductId ? 'opacity-50 pointer-events-none' : ''}`}>
          <button
            onClick={() => { setMode('SERIALIZED'); setStep(1); }}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              mode === 'SERIALIZED' 
                ? 'bg-brand-primary text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Serialized (IMEI)</span>
          </button>
          <button
            onClick={() => { setMode('QUANTITY'); setStep(1); }}
            className={`flex items-center space-x-1.5 px-2.5 sm:px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              mode === 'QUANTITY' 
                ? 'bg-brand-primary text-white shadow-xs' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Quantity (Bulk)</span>
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200/80 shadow-sm'}`}>
        {/* Wizard Progress (Only for Serialized Products) */}
        {mode === 'SERIALIZED' && (
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setStep(1)}
              className={`flex-1 p-2.5 sm:p-4 flex items-center justify-center space-x-2 sm:space-x-3 transition-colors ${step === 1 ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
            >
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black ${step === 1 ? 'bg-brand-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>1</div>
              <span className={`font-extrabold text-xs sm:text-sm ${step === 1 ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                <span className="sm:hidden">1. Model & Price</span>
                <span className="hidden sm:inline">1. Model & Base Pricing</span>
              </span>
            </button>
            <div className="w-px h-10 sm:h-12 bg-slate-200 dark:border-slate-800"></div>
            <button 
              onClick={() => { if(name && brand) setStep(2) }}
              className={`flex-1 p-2.5 sm:p-4 flex items-center justify-center space-x-2 sm:space-x-3 transition-colors ${step === 2 ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
            >
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black ${step === 2 ? 'bg-brand-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>2</div>
              <span className={`font-extrabold text-xs sm:text-sm ${step === 2 ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                <span className="sm:hidden">2. IMEIs & Units</span>
                <span className="hidden sm:inline">2. Physical Units (Serial / IMEI, Specs & Images)</span>
              </span>
            </button>
          </div>
        )}

        <div className="p-3 sm:p-6">
          {/* STEP 1 / QUANTITY FORM */}
          {(step === 1 || mode === 'QUANTITY') && (
            <div className="space-y-6 max-w-4xl">
              
          {/* Quick AI Extracted Save Banner */}
          {brand && name && (
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in border border-emerald-400/30">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/20 rounded-xl flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-black text-sm tracking-tight">Sticker Extracted: {brand} {name}</h4>
                  <p className="text-xs text-emerald-100 font-bold">
                    {devices.length > 0 ? `Physical Unit Ready (IMEI: ${devices[0].imei1 || 'Tap Step 2 to fill'})` : 'All specifications pre-filled.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white text-emerald-800 font-black text-xs hover:bg-emerald-50 shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-600" />
                <span>{loading ? 'Saving to Database...' : '🚀 SAVE THIS ITEM TO INVENTORY NOW'}</span>
              </button>
            </div>
          )}

          {/* Scan Box Sticker CTA — visible at top of Step 1 for easy scanning */}
          {!brand && !name && (
            <div
              onClick={() => setIsScannerOpen(true)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all group ${
                isDarkMode
                  ? 'border-emerald-500/40 bg-emerald-900/10 hover:bg-emerald-900/20'
                  : 'border-emerald-400 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${ isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}` }>
                  <Sparkles className="w-5 h-5 text-emerald-600 group-hover:animate-pulse" />
                </div>
                <div>
                  <p className={`font-black text-sm ${ isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    📷 Tap to Snap Box Sticker — Auto-Fill All Fields
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${ isDarkMode ? 'text-emerald-500/70' : 'text-emerald-600/80'}`}>
                    Extracts Brand, Model, Color, RAM/Storage & IMEI from photo
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            </div>
          )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Image Upload Area */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cover Image</label>
                  <div 
                    onClick={() => mainImageInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl h-48 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group relative overflow-hidden"
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt="Cover" className="w-full h-full object-contain p-2" />
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 mb-2 group-hover:text-emerald-500 transition-colors" />
                        <span className="text-xs font-bold">Click to Upload Image</span>
                        <span className="text-[10px] mt-1 text-slate-400">JPG, PNG (Max 2MB)</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      ref={mainImageInputRef} 
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0], setImageUrl);
                      }} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                  {imageUrl && (
                    <button onClick={() => setImageUrl('')} className="mt-2 text-[11px] font-bold text-rose-500 hover:underline w-full text-center block">
                      Remove Cover Image
                    </button>
                  )}
                </div>

                {/* Core Details */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Brand <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddBrandModal(true)}
                        className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Brand</span>
                      </button>
                    </div>
                    <select
                      value={brand}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setShowAddBrandModal(true);
                        } else {
                          setBrand(e.target.value);
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl border text-sm font-bold focus:border-emerald-500 outline-none ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">-- Select Brand --</option>
                      {brands.filter((b: any) => b.isActive !== false).map((b: any) => (
                        <option key={b.id || b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                      <option value="__ADD_NEW__">+ Add Custom Brand...</option>
                    </select>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Model Name <span className="text-rose-500">*</span></label>
                    </div>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-bold dark:text-white focus:border-emerald-500 outline-none" placeholder="e.g. Galaxy A54" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category <span className="text-rose-500">*</span></label>
                    </div>
                    <select
                      value={category}
                      onChange={(e) => {
                        const selected = e.target.value;
                        setCategory(selected);
                        const matchedCat = categoriesList.find((c: any) => c.name.toLowerCase() === selected.toLowerCase());
                        if (matchedCat && matchedCat.trackingType) {
                          setMode(matchedCat.trackingType === 'QUANTITY' ? 'QUANTITY' : 'SERIALIZED');
                        }
                      }}
                      className={`w-full p-2.5 rounded-xl border text-sm font-bold focus:border-emerald-500 outline-none ${
                        isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="">-- Select Product Category --</option>
                      {categoriesList.filter((c: any) => c.isActive !== false).map((c: any) => (
                        <option key={c.id || c.name} value={c.name}>
                          {c.name} ({c.trackingType || 'SERIALIZED'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supplier</label>
                    </div>
                    <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-bold dark:text-white focus:border-emerald-500 outline-none" placeholder="Distributor Name" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{mode === 'SERIALIZED' ? 'Default Purchase Price' : 'Purchase Price'}</label>
                    </div>
                    <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-bold dark:text-white focus:border-emerald-500 outline-none" placeholder="0.00" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between h-5 mb-1.5">
                      <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{mode === 'SERIALIZED' ? 'Default Selling Price' : 'Selling Price'} <span className="text-rose-500">*</span></label>
                    </div>
                    <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-bold dark:text-white focus:border-emerald-500 outline-none" placeholder="0.00" />
                  </div>
                  
                  {mode === 'QUANTITY' && (
                    <>
                      <div>
                        <div className="flex items-center justify-between h-5 mb-1.5">
                          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock Quantity</label>
                        </div>
                        <input type="number" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-bold dark:text-white focus:border-emerald-500 outline-none" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between h-5 mb-1.5">
                          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Min Stock Alert</label>
                        </div>
                        <input type="number" value={minStockAlert} onChange={e => setMinStockAlert(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-bold dark:text-white focus:border-emerald-500 outline-none" />
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <div className="flex items-center justify-between h-5 mb-1.5">
                          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Barcode / SKU</label>
                        </div>
                        <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-bold dark:text-white focus:border-emerald-500 outline-none" placeholder="Scan barcode..." />
                      </div>
                    </>
                  )}

                  <div className="col-span-1 sm:col-span-2 grid grid-cols-3 gap-3 sm:gap-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">GST Rate (%)</label>
                      <input type="number" value={gstRate} onChange={e => setGstRate(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold dark:text-white focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">HSN Code</label>
                      <input type="text" value={hsnCode} onChange={e => setHsnCode(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold dark:text-white focus:border-emerald-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Warranty (Mo)</label>
                      <input type="number" value={warrantyMonths} onChange={e => setWarrantyMonths(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-xs font-bold dark:text-white focus:border-emerald-500 outline-none" />
                    </div>
                  </div>

                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                {mode === 'SERIALIZED' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!brand || !name || !sellingPrice) {
                        toast.error("Brand, Model Name, and Selling Price are required to proceed.");
                        return;
                      }
                      setStep(2);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-black text-sm shadow-lg shadow-brand-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <span>Continue to Physical Devices & IMEIs</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-sm shadow-md shadow-brand-primary/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Saving...' : selectedProductId ? 'Update Item' : 'Save Item'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2 / SERIALIZED DEVICES */}
          {mode === 'SERIALIZED' && step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-500/10 p-3 sm:p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm text-emerald-900 dark:text-emerald-400">{brand} {name}</h3>
                    <p className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-500/80 font-bold">Total Devices: {devices.length}</p>
                  </div>
                </div>
                
                <div className="w-full sm:w-auto flex items-center space-x-2">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-brand-primary hover:bg-brand-hover text-white text-xs font-black shadow-sm transition-all cursor-pointer"
                    title="Snap Box Sticker to auto-fill Model, Color, RAM/Storage & IMEIs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Scan Box Sticker</span>
                  </button>

                  <div className="relative overflow-hidden flex-1 sm:flex-none">
                    <input 
                      type="text" 
                      onPaste={handleBulkPaste}
                      onChange={() => {}}
                      placeholder="Paste IMEIs here..."
                      className="absolute inset-0 opacity-0 cursor-copy"
                    />
                    <button className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold pointer-events-none">
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Bulk Paste</span>
                    </button>
                  </div>
                  <button 
                    onClick={addDeviceRow}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Unit</span>
                  </button>
                </div>
              </div>

              {devices.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Smartphone className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <h3 className="text-sm font-bold dark:text-white">No devices added yet</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Add physical devices to populate your stock.</p>
                  <button onClick={addDeviceRow} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:opacity-90">
                    + Add First Device
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-sm border-collapse min-w-[950px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <th className="p-3 w-12 text-center">Image</th>
                          <th className="p-3">Serial / IMEI 1 (Req)</th>
                          <th className="p-3">IMEI 2 / Alt No.</th>
                          <th className="p-3 w-28">Variant / Specs</th>
                          <th className="p-3 w-24">Color</th>
                          <th className="p-3 w-28">Selling Price</th>
                          <th className="p-3 w-28">Purch. Price</th>
                          <th className="p-3 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {devices.map((d: DeviceRow, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                            <td className="p-2 text-center">
                              <div 
                                onClick={() => deviceImageInputRef.current[i]?.click()}
                                className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center cursor-pointer hover:border-emerald-500 overflow-hidden bg-white dark:bg-slate-950 mx-auto"
                                title="Click to add/change device image"
                              >
                                {d.imageUrl ? (
                                  <img src={d.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <input 
                                type="file" 
                                ref={el => { deviceImageInputRef.current[i] = el; }} 
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handleFileUpload(e.target.files[0], (base64) => updateDevice(i, 'imageUrl', base64));
                                }} 
                                accept="image/*" 
                                className="hidden" 
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text" 
                                value={d.imei1} 
                                onChange={e => updateDevice(i, 'imei1', e.target.value)}
                                placeholder="Scan barcode..."
                                className="w-full p-2 text-xs font-bold font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none dark:text-white"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text" 
                                value={d.imei2} 
                                onChange={e => updateDevice(i, 'imei2', e.target.value)}
                                className="w-full p-2 text-xs font-bold font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 outline-none dark:text-slate-300"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text" 
                                value={d.storage} 
                                onChange={e => updateDevice(i, 'storage', e.target.value)}
                                placeholder="RAM / Storage e.g. 8GB / 128GB"
                                className="w-full p-2 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 outline-none dark:text-slate-300"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text" 
                                value={d.color} 
                                onChange={e => updateDevice(i, 'color', e.target.value)}
                                placeholder="Black"
                                className="w-full p-2 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 outline-none dark:text-slate-300"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="number" 
                                value={d.sellingPrice} 
                                onChange={e => updateDevice(i, 'sellingPrice', e.target.value)}
                                className="w-full p-2 text-xs font-bold font-mono bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400 rounded-lg focus:border-emerald-500 outline-none"
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="number" 
                                value={d.purchasePrice} 
                                onChange={e => updateDevice(i, 'purchasePrice', e.target.value)}
                                className="w-full p-2 text-xs font-bold font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:border-emerald-500 outline-none dark:text-slate-400"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button onClick={() => removeDeviceRow(i)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Device Cards List */}
                  <div className="block md:hidden space-y-3">
                    {devices.map((d: DeviceRow, i: number) => (
                      <div key={i} className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Device Unit #{i + 1}</span>
                          <button onClick={() => removeDeviceRow(i)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Serial / IMEI 1 (Req)</label>
                            <input 
                              type="text" 
                              value={d.imei1} 
                              onChange={e => updateDevice(i, 'imei1', e.target.value)}
                              placeholder="Scan barcode / IMEI 1..."
                              className="w-full p-2.5 text-xs font-bold font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-emerald-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">IMEI 2 / Alt No.</label>
                            <input 
                              type="text" 
                              value={d.imei2} 
                              onChange={e => updateDevice(i, 'imei2', e.target.value)}
                              placeholder="IMEI 2"
                              className="w-full p-2.5 text-xs font-bold font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Color</label>
                            <input 
                              type="text" 
                              value={d.color} 
                              onChange={e => updateDevice(i, 'color', e.target.value)}
                              placeholder="e.g. Black"
                              className="w-full p-2.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 outline-none"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">RAM / Storage (Variant)</label>
                            <input 
                              type="text" 
                              value={d.storage} 
                              onChange={e => updateDevice(i, 'storage', e.target.value)}
                              placeholder="e.g. 8GB / 128GB or 256GB"
                              className="w-full p-2.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Selling Price (₹)</label>
                            <input 
                              type="number" 
                              value={d.sellingPrice} 
                              onChange={e => updateDevice(i, 'sellingPrice', e.target.value)}
                              className="w-full p-2.5 text-xs font-bold font-mono bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl focus:border-emerald-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Purchase Price (₹)</label>
                            <input 
                              type="number" 
                              value={d.purchasePrice} 
                              onChange={e => updateDevice(i, 'purchasePrice', e.target.value)}
                              className="w-full p-2.5 text-xs font-bold font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                >
                  Back to Model Settings
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 sm:px-8 py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-black text-xs sm:text-sm shadow-md shadow-brand-primary/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4 flex-shrink-0" />
                  <span>{loading ? 'Saving Inventory...' : selectedProductId ? 'Update & Save Inventory' : 'Save & Register Inventory'}</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
      {/* ADD NEW BRAND MODAL */}
      {showAddBrandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden my-8 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-5 bg-brand-primary text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5" />
                <h3 className="text-base font-black">Register New Brand</h3>
              </div>
              <button
                onClick={() => setShowAddBrandModal(false)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="e.g. Motorola, OnePlus, Google"
                  className={`w-full px-3 py-2 rounded-xl border font-bold text-xs focus:outline-none focus:border-emerald-500 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-1 text-slate-700 dark:text-slate-300">
                  Brand Logo Image (Optional)
                </label>
                <div
                  onClick={() => mainImageInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl h-24 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer overflow-hidden relative"
                >
                  {newBrandLogo ? (
                    <img src={newBrandLogo} alt="Brand Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 mb-1 text-emerald-500" />
                      <span className="text-[11px] font-bold">Click to Upload Brand Logo</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAddBrandModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={brandSaving}
                onClick={handleSaveNewBrand}
                className="px-6 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-black text-xs shadow-md shadow-brand-primary/20 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{brandSaving ? 'Saving...' : 'Save & Select Brand'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Box Sticker & Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleStickerScanned}
        title="Snap Box Sticker to Auto-Fill Specs & IMEIs"
      />
    </div>
  );
};
