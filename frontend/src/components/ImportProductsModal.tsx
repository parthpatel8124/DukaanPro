import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  X,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Package,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { importProductsBulk } from '../services/api';
import { toast } from 'react-hot-toast';

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const { isDarkMode } = useStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Helper to trigger 1-click download of sample CSV file
  const downloadSampleCSV = (type: 'SERIALIZED' | 'QUANTITY') => {
    let csvContent = '';
    let fileName = '';

    if (type === 'SERIALIZED') {
      fileName = 'Sample_Import_Serialized_Mobiles_Laptops.csv';
      csvContent = `Brand,Category,Model Name,Tracking Type,HSN Code,GST Rate %,RAM,Storage,Color,IMEI 1,IMEI 2,Purchase Price,Selling Price,Supplier Name
Motorola,Smartphones,Edge 50 Pro,SERIALIZED,8517,18,8GB,256GB,Lux Black,358741092837412,358741092837413,24999,29999,Riddhi Electronics
Motorola,Smartphones,Edge 50 Pro,SERIALIZED,8517,18,8GB,256GB,Moonlight Pearl,358741092837414,358741092837415,24999,29999,Riddhi Electronics
Samsung,Smartphones,Galaxy S24 Ultra,SERIALIZED,8517,18,12GB,512GB,Titanium Gray,359812049812301,359812049812302,98999,119999,Samsung National Dist
Apple,Smartphones,iPhone 15,SERIALIZED,8517,18,6GB,128GB,Blue,352341092837111,,58999,65999,Apple India Sales`;
    } else {
      fileName = 'Sample_Import_Bulk_Accessories.csv';
      csvContent = `Brand,Category,Item Name,Tracking Type,HSN Code,GST Rate %,Purchase Price,Selling Price,Stock Quantity,Min Stock Alert,Supplier Name
Boat,Audio & Earbuds,Airdopes 141,QUANTITY,8518,18,699,1299,25,5,Boat Regional Wholesaler
Anker,Chargers & Cables,65W GaN Fast Charger,QUANTITY,8504,18,1499,2499,15,3,Anker India Sales
SanDisk,Memory & Storage,128GB MicroSD Card Class 10,QUANTITY,8523,18,450,899,40,10,National Storage Supplier
Stuffcool,Screen Protectors,Tempered Glass Guard,QUANTITY,3926,18,49,299,100,20,Local Accessory Wholesaler`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded sample file: ${fileName}`);
  };

  // Simple CSV Line Parser handling quotes & commas
  const parseCSVText = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV file is empty or missing headers.');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    const parsedRows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Match values considering quoted strings
      const values: string[] = [];
      let insideQuote = false;
      let currentVal = '';

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

      const rowObj: any = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] !== undefined ? values[idx] : '';
      });

      // Normalize key mapping for importer compatibility
      const name = rowObj['model name'] || rowObj['item name'] || rowObj['name'] || rowObj['product name'];
      const brand = rowObj['brand'];
      const trackingType = (rowObj['tracking type'] || '').toUpperCase() === 'QUANTITY' ? 'QUANTITY' : 'SERIALIZED';

      if (name && brand) {
        parsedRows.push({
          name,
          brand,
          category: rowObj['category'] || (trackingType === 'SERIALIZED' ? 'Smartphones' : 'Accessories'),
          trackingType,
          hsnCode: rowObj['hsn code'] || rowObj['hsn'] || '8517',
          gstRate: rowObj['gst rate %'] || rowObj['gst rate'] || rowObj['gst'] || '18',
          ram: rowObj['ram'],
          storage: rowObj['storage'] || rowObj['specs'],
          color: rowObj['color'],
          imei1: rowObj['imei 1'] || rowObj['imei'] || rowObj['serial number'] || rowObj['serial'],
          imei2: rowObj['imei 2'],
          purchasePrice: rowObj['purchase price'] || '0',
          sellingPrice: rowObj['selling price'] || '0',
          stockQuantity: rowObj['stock quantity'] || rowObj['qty'] || '1',
          minStockAlert: rowObj['min stock alert'] || '5',
          supplierName: rowObj['supplier name'] || rowObj['supplier']
        });
      }
    }

    return parsedRows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSVText(text);
        if (rows.length === 0) {
          setParseError('No valid product rows found in CSV. Please make sure "Brand" and "Model Name" / "Item Name" headers exist.');
          setPreviewItems([]);
        } else {
          setPreviewItems(rows);
          toast.success(`Found ${rows.length} product entries in ${file.name}`);
        }
      } catch (err: any) {
        setParseError(err.message || 'Failed to parse CSV file.');
        setPreviewItems([]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setParseError('Error reading CSV file.');
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (previewItems.length === 0) {
      toast.error('No items to import.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await importProductsBulk(previewItems);
      if (res.success) {
        toast.success(res.message || `Successfully imported products!`);
        onImportSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Failed to import products.');
      }
    } catch (err) {
      toast.error('Error executing bulk import.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
      <div className={`w-full max-w-3xl rounded-xl border shadow-2xl overflow-hidden my-8 ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="p-5 bg-brand-primary text-white flex items-center justify-between border-b border-brand-hover">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 text-white flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Import Products & Stock from CSV</h3>
              <p className="text-[11px] text-sky-100 font-medium">
                Bulk add IMEI phones, laptops, and bulk accessory items using pre-built CSV templates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Download Sample CSV Template */}
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-primary flex items-center space-x-1.5">
                <Download className="w-4 h-4" />
                <span>Step 1: Download Sample CSV Template</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-400">
                1-Click Download • Auto-Header Columns
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Select your product category form type below to download the matching sample file with exact header columns:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => downloadSampleCSV('SERIALIZED')}
                className="p-3 rounded-lg border border-brand-primary/30 bg-brand-light/60 hover:bg-brand-primary hover:text-white dark:bg-brand-primary/10 dark:hover:bg-brand-primary text-brand-primary dark:text-sky-300 font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer group shadow-xs"
              >
                <div className="flex items-center space-x-2 text-left">
                  <Smartphone className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <div className="font-extrabold">Serialized Phones & Laptops</div>
                    <div className="text-[10px] font-semibold opacity-80">IMEI 1, IMEI 2, Color, RAM, Specs</div>
                  </div>
                </div>
                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => downloadSampleCSV('QUANTITY')}
                className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-brand-primary hover:bg-brand-light/40 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center justify-between transition-all cursor-pointer group shadow-xs"
              >
                <div className="flex items-center space-x-2 text-left">
                  <Package className="w-4 h-4 flex-shrink-0 text-brand-primary" />
                  <div>
                    <div className="font-extrabold">Bulk Accessories & Cables</div>
                    <div className="text-[10px] font-semibold opacity-80 text-slate-400">Stock Qty, HSN, Purchase Price</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* Step 2: Upload CSV File */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <UploadCloud className="w-4 h-4 text-brand-primary" />
              <span>Step 2: Upload Filled CSV File</span>
            </h4>

            <label className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-brand-primary bg-brand-light/20 dark:bg-brand-primary/10'
                : 'border-slate-300 dark:border-slate-700 hover:border-brand-primary hover:bg-slate-50 dark:hover:bg-slate-950'
            }`}>
              <FileSpreadsheet className="w-10 h-10 text-brand-primary mb-2" />
              {selectedFile ? (
                <div>
                  <p className="font-extrabold text-xs text-brand-primary">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different CSV file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-extrabold text-xs text-slate-900 dark:text-white">
                    Click to select CSV file or drag and drop here
                  </p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Supports `.csv` spreadsheet files with column headers
                  </p>
                </div>
              )}
              <input
                type="file"
                accept=".csv, text/csv, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Parse Error Display */}
          {parseError && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Preview Table of Items to Import */}
          {previewItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-brand-primary" />
                  <span>Preview ({previewItems.length} Products Found in File)</span>
                </h4>
                <span className="text-[11px] font-bold text-brand-primary">
                  {previewItems.filter(i => i.imei1).length} Physical IMEIs Detected
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-[10px] uppercase tracking-wider font-extrabold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Brand & Model / Item Name</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">IMEI / Specs / Qty</th>
                      <th className="p-2 text-right">Selling Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                    {previewItems.slice(0, 50).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2">
                          <strong className="text-slate-900 dark:text-white">{item.brand}</strong> {item.name}
                        </td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                            item.trackingType === 'QUANTITY'
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400'
                          }`}>
                            {item.trackingType}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-[11px]">
                          {item.imei1 ? (
                            <span className="text-brand-primary font-bold">
                              IMEI: {item.imei1} {item.color ? `(${item.color})` : ''}
                            </span>
                          ) : (
                            <span>{item.stockQuantity} Pcs</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono font-black text-slate-900 dark:text-white">
                          ₹{parseFloat(item.sellingPrice || '0').toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={previewItems.length === 0 || isImporting || isParsing}
            onClick={handleConfirmImport}
            className="px-6 py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-extrabold text-xs shadow-md shadow-brand-primary/20 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{isImporting ? 'Importing Products...' : `Import ${previewItems.length} Products`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
