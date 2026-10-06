import React, { useEffect, useState } from 'react';
import { Package, ArrowLeft, Edit3, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { BASE_URL } from '../services/api';

export const ProductDetailPage: React.FC = () => {
  const { isDarkMode, selectedProductId, setActiveModule, setSelectedProductId } = useStore();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedProductId) {
      setActiveModule('products');
      return;
    }

    const fetchProduct = async () => {
      try {
        const res = await fetch(`${BASE_URL}/products/${selectedProductId}`);
        const json = await res.json();
        if (json.success) {
          setProduct(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [selectedProductId, setActiveModule]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading Product Details...</div>;
  }

  if (!product) {
    return <div className="p-12 text-center text-slate-400">Product not found.</div>;
  }

  const isSmartphone = product.isMobile;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Full-Width Top Header Background Canvas with Illustration & Bottom Gradient Fade */}
      <div className="-mx-3 -mt-3 sm:-mx-6 sm:-mt-6 px-3.5 sm:px-6 pt-4 sm:pt-6 pb-12 sm:pb-14 bg-gradient-to-b from-sky-100/70 via-blue-50/40 to-slate-50/0 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950/0 relative overflow-hidden">
        {/* Background Decorative Graphic Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-48 sm:w-80 opacity-25 sm:opacity-35 dark:opacity-15 pointer-events-none flex items-center justify-end pr-2 sm:pr-6">
          <svg viewBox="0 0 200 160" className="h-full text-brand-primary fill-current">
            <rect x="50" y="35" width="100" height="100" rx="10" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.2" />
            <circle cx="100" cy="75" r="20" opacity="0.25" />
            <path d="M70 115 H130" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
          </svg>
        </div>

        <div className="relative z-10 space-y-0.5 sm:space-y-1 max-w-xl">
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {product.brand} {product.name}
          </h1>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {product.category} • SKU: {product.sku || 'N/A'}
          </p>
        </div>
      </div>

      {/* Floating Action Bar Container (Back Button + Edit Product Button) */}
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

        <button
          onClick={() => setActiveModule('add-product')}
          className="h-10 sm:h-10.5 px-3 sm:px-5 rounded-xl btn-gradient-primary text-white text-[11px] sm:text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
        >
          <Edit3 className="w-4 h-4 text-white flex-shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">Edit Product Details</span>
          <span className="sm:hidden whitespace-nowrap">Edit</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image & Core Details */}
        <div className={`col-span-1 rounded-xl border p-6 space-y-6 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center relative">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-4" />
            ) : (
              <ImageIcon className="w-16 h-16 text-slate-300 dark:text-slate-700" />
            )}
            <div className="absolute top-3 right-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${
                product.stockQuantity <= 0
                  ? 'bg-rose-100 text-rose-600 border border-rose-200'
                  : product.stockQuantity <= product.minStockAlert
                  ? 'bg-amber-100 text-amber-600 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-600 border border-emerald-200'
              }`}>
                {product.stockQuantity} IN STOCK
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Selling Price</span>
                <span className="font-extrabold text-emerald-500 text-lg">₹{product.sellingPrice?.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Purchase Cost</span>
                <span className="font-extrabold text-slate-700 dark:text-slate-300 text-lg">₹{product.purchasePrice?.toLocaleString() || '-'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-bold">GST Rate</span>
                <span className="font-extrabold dark:text-slate-300">{product.gstRate}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-bold">HSN Code</span>
                <span className="font-extrabold dark:text-slate-300">{product.hsnCode || '-'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-bold">Warranty</span>
                <span className="font-extrabold dark:text-slate-300">{product.warrantyMonths} Months</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-bold">Supplier</span>
                <span className="font-extrabold dark:text-slate-300">{product.supplierName || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Devices Table for Smartphones OR Standard Info for Accessories */}
        <div className={`col-span-2 rounded-xl border ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col`}>
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-black text-lg dark:text-white">
              {isSmartphone ? 'Physical Devices Inventory (IMEIs)' : 'Accessory Details'}
            </h2>
          </div>

          <div className="p-6 flex-1 overflow-x-auto">
            {isSmartphone ? (
              product.devices && product.devices.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <th className="pb-3 pr-4 w-12 text-center">Image</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4">Serial / IMEI No.</th>
                          <th className="pb-3 pr-4">Color</th>
                          <th className="pb-3 pr-4">Variant / Specs</th>
                          <th className="pb-3 pr-4">Purchase Price</th>
                          <th className="pb-3">Selling Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {product.devices.map((d: any) => (
                          <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 pr-4 text-center">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden mx-auto">
                                {d.imageUrl || product.imageUrl ? (
                                  <img src={d.imageUrl || product.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              {d.status === 'AVAILABLE' ? (
                                <span className="flex items-center space-x-1.5 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md text-[10px] font-black w-max border border-emerald-500/20">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>AVAILABLE</span>
                                </span>
                              ) : (
                                <span className="flex items-center space-x-1.5 text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-md text-[10px] font-black w-max border border-rose-500/20">
                                  <XCircle className="w-3 h-3" />
                                  <span>{d.status}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4 font-mono font-bold text-xs dark:text-white">
                              {d.imei1}
                            </td>
                            <td className="py-3 pr-4 text-slate-700 dark:text-slate-300 font-medium text-xs">
                              {d.color || '-'}
                            </td>
                            <td className="py-3 pr-4 text-slate-700 dark:text-slate-300 font-medium text-xs">
                              {d.storage || d.ram ? `${d.ram || ''} ${d.storage || ''}`.trim() : '-'}
                            </td>
                            <td className="py-3 pr-4 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {d.purchasePrice ? `₹${d.purchasePrice.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                              ₹{(d.sellingPrice || product.sellingPrice).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Device Cards View */}
                  <div className="block md:hidden space-y-3">
                    {product.devices.map((d: any) => (
                      <div key={d.id} className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                              {d.imageUrl || product.imageUrl ? (
                                <img src={d.imageUrl || product.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <span className="font-mono font-black text-xs text-slate-900 dark:text-white block">{d.imei1}</span>
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

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="text-slate-500 font-medium">
                            Specs: <strong>{d.storage || d.ram ? `${d.ram || ''} ${d.storage || ''}`.trim() : 'Standard'}</strong>
                          </span>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{(d.sellingPrice || product.sellingPrice).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                  <p className="text-slate-500 font-bold">No physical units registered for this product model.</p>
                </div>
              )
            ) : (
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                <p>This item is tracked by quantity bulk stock and does not require individual serial numbers.</p>
                <p className="mt-2">Use the Edit page to adjust stock alerts, descriptions, or prices.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
