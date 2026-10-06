import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Smartphone, Image as ImageIcon, Sparkles, Save, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'react-hot-toast';
import { BrowserMultiFormatReader } from '@zxing/library';
import { createWorker } from 'tesseract.js';
import { fetchProductsList, createProductItem, updateProductItem } from '../services/api';
import { parseBoxStickerText } from '../utils/boxStickerParser';
import type { ParsedBoxSticker } from '../utils/boxStickerParser';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedCode: string, parsedSticker?: ParsedBoxSticker) => void;
  title?: string;
}

/**
 * Preprocess Canvas: Grayscale with optional contrast level.
 * IMPORTANT: Do NOT use hard binarization for Tesseract OCR — it destroys accuracy.
 * Hard binarization is only useful for ZXing barcode decoding.
 */
function createGrayscaleCanvas(
  img: HTMLImageElement,
  rotationDeg: number = 0,
  contrastLevel: 'none' | 'soft' | 'hard' = 'soft'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const targetWidth = 1600;
  const scale = img.width > targetWidth ? targetWidth / img.width : 1;
  const scaledWidth = Math.round(img.width * scale);
  const scaledHeight = Math.round(img.height * scale);

  if (rotationDeg === 90 || rotationDeg === 270) {
    canvas.width = scaledHeight;
    canvas.height = scaledWidth;
  } else {
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
  }

  ctx.save();
  if (rotationDeg === 90) {
    ctx.translate(canvas.width, 0);
    ctx.rotate((90 * Math.PI) / 180);
  } else if (rotationDeg === 180) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate((180 * Math.PI) / 180);
  } else if (rotationDeg === 270) {
    ctx.translate(0, canvas.height);
    ctx.rotate((270 * Math.PI) / 180);
  }
  ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
  ctx.restore();

  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      let v: number;
      if (contrastLevel === 'none') {
        v = avg;
      } else if (contrastLevel === 'soft') {
        // Mild contrast boost — ideal for Tesseract on printed labels
        v = Math.min(255, Math.max(0, (avg - 128) * 1.5 + 128));
      } else {
        // Hard binary threshold — only for ZXing barcode scanning
        v = avg > 128 ? 255 : 0;
      }
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (_) {
    // Tainted canvas (cross-origin) — skip pixel manipulation
  }

  return canvas;
}

/** Load an image from a URL into an HTMLImageElement using a Promise */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Barcode or Box Sticker'
}) => {
  const { isDarkMode } = useStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState('Analyzing photo...');
  const [isSavingDirect, setIsSavingDirect] = useState(false);

  // Review Card: shown after OCR, user verifies/edits before filling the form
  const [reviewCard, setReviewCard] = useState<{
    brand: string;
    modelName: string;
    color: string;
    storage: string;
    ram: string;
    imei1: string;
    imei2: string;
    sellingPrice: string;
    purchasePrice: string;
  } | null>(null);

  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    zxingReaderRef.current = new BrowserMultiFormatReader();
    return () => {
      stopCamera();
      if (zxingReaderRef.current) zxingReaderRef.current.reset();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setReviewCard(null);
      setScannedResult(null);
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Live video requires HTTPS. Use Camera or Gallery buttons below.');
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startVideoScanner();
      }
    } catch (err) {
      console.warn('Camera stream blocked:', err);
      setCameraError('Live stream blocked over HTTP. Tap Camera or Gallery buttons below.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startVideoScanner = () => {
    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
      if (zxingReaderRef.current) {
        try {
          const result = await zxingReaderRef.current.decodeFromVideoElement(videoRef.current);
          if (result && result.getText()) {
            clearInterval(interval);
            handleSuccess(result.getText());
          }
        } catch (_) {
          // ignore per-frame decode errors
        }
      }
    }, 450);
  };

  /**
   * processImageFile: Full pipeline for a selected photo.
   * Step 1 — ZXing barcode scan at 4 rotation angles (hard contrast)
   * Step 2 — Native BarcodeDetector API (if available)
   * Step 3 — Multi-pass Tesseract OCR:
   *   Pass 1: Soft-contrast grayscale (best for printed labels)
   *   Pass 2: Pure grayscale (no contrast changes)
   *   Pass 3: Raw original file (Tesseract handles color images)
   * Shows ReviewCard after OCR — user can edit fields before filling the form.
   */
  const processImageFile = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    setProcessingProgress('Loading image...');
    const toastId = toast.loading('🔍 Reading sticker — please wait (15-30 sec)...', { duration: 60000 });

    try {
      const imgUrl = URL.createObjectURL(file);
      // Properly await image load — NOT a callback — so all errors are caught
      const img = await loadImage(imgUrl);

      let detectedCode = '';
      const detectedCodes: string[] = [];

      // Step 1: ZXing barcode scanning at 4 angles
      setProcessingProgress('Scanning barcodes...');
      if (zxingReaderRef.current) {
        for (const rot of [0, 90, 180, 270]) {
          try {
            const canvas = createGrayscaleCanvas(img, rot, 'hard');
            const rotImg = await loadImage(canvas.toDataURL());
            const res = await zxingReaderRef.current.decodeFromImageElement(rotImg);
            if (res && res.getText()) {
              const txt = res.getText();
              if (!detectedCodes.includes(txt)) detectedCodes.push(txt);
              if (!detectedCode) detectedCode = txt;
            }
          } catch (_) {
            // try next angle
          }
        }
      }

      // Step 2: Native BarcodeDetector
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const detector = new window.BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'upc_a', 'ean_8', 'itf']
          });
          const barcodes = await detector.detect(img);
          barcodes?.forEach((b: any) => {
            if (b.rawValue && !detectedCodes.includes(b.rawValue)) {
              detectedCodes.push(b.rawValue);
              if (!detectedCode) detectedCode = b.rawValue;
            }
          });
        } catch (_) {
          // BarcodeDetector not available
        }
      }

      // Step 3: Multi-pass Tesseract OCR
      const runOcr = async (source: HTMLCanvasElement | File): Promise<string> => {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(source);
        await worker.terminate();
        return ret.data.text || '';
      };

      let bestOcrText = '';

      // OCR Pass 1 — Soft grayscale (recommended for printed stickers)
      setProcessingProgress('OCR Pass 1: reading text...');
      try {
        const t1 = await runOcr(createGrayscaleCanvas(img, 0, 'soft'));
        console.log('[OCR P1 soft len]:', t1.length, '\n', t1.substring(0, 300));
        if (t1.length > bestOcrText.length) bestOcrText = t1;
      } catch (e) { console.warn('OCR P1 fail', e); }

      // OCR Pass 2 — Pure grayscale (if pass 1 got too little text)
      if (bestOcrText.length < 50) {
        setProcessingProgress('OCR Pass 2: retry with pure grayscale...');
        try {
          const t2 = await runOcr(createGrayscaleCanvas(img, 0, 'none'));
          console.log('[OCR P2 pure len]:', t2.length, '\n', t2.substring(0, 300));
          if (t2.length > bestOcrText.length) bestOcrText = t2;
        } catch (e) { console.warn('OCR P2 fail', e); }
      }

      // OCR Pass 3 — Raw original file (Tesseract handles color well)
      if (bestOcrText.length < 30) {
        setProcessingProgress('OCR Pass 3: retry with original file...');
        try {
          const t3 = await runOcr(file as any);
          console.log('[OCR P3 raw len]:', t3.length, '\n', t3.substring(0, 300));
          if (t3.length > bestOcrText.length) bestOcrText = t3;
        } catch (e) { console.warn('OCR P3 fail', e); }
      }

      console.log('[Final OCR]:', bestOcrText);

      // Parse the best OCR text
      const parsed = parseBoxStickerText(bestOcrText);
      console.log('[Parsed sticker]:', parsed);

      // Determine IMEIs
      const primaryImei =
        parsed.imei1 ||
        detectedCodes.find(b => /^\d{15}$/.test(b)) ||
        (/^\d{15}$/.test(detectedCode) ? detectedCode : '');
      const allImeis = detectedCodes.filter(b => /^\d{15}$/.test(b));
      const secondaryImei =
        parsed.imei2 ||
        (allImeis.find(b => b !== primaryImei) ?? '');

      toast.dismiss(toastId);
      setIsProcessing(false);

      // Show review card (DO NOT call onScanSuccess yet — wait for user to click Fill Form)
      setReviewCard({
        brand: parsed.brand || '',
        modelName: parsed.modelName || '',
        color: parsed.color || '',
        storage: parsed.storage || '',
        ram: parsed.ram || '',
        imei1: primaryImei,
        imei2: secondaryImei,
        sellingPrice: '',
        purchasePrice: ''
      });

      if (primaryImei || parsed.brand || parsed.modelName) {
        toast.success(
          `✨ Extracted: ${parsed.brand || '?'} ${parsed.modelName || ''}${primaryImei ? ` | IMEI: ${primaryImei.slice(0, 8)}...` : ''}\nEdit if needed, then click Fill Form.`,
          { duration: 5000 }
        );
      } else {
        toast('📋 OCR done — fill any missing fields manually then click Fill Form.', { icon: '📋', duration: 5000 });
      }

      URL.revokeObjectURL(imgUrl);
    } catch (err) {
      console.error('Image processing error:', err);
      toast.dismiss(toastId);
      setIsProcessing(false);
      toast.error('Could not read image. Please enter details manually below.');
    }
  };

  // Direct 1-tap save to database without going to form
  const handleSaveProductDirectly = async () => {
    if (!reviewCard) return;
    if (!reviewCard.brand || !reviewCard.modelName || !reviewCard.imei1) {
      toast.error('Brand, Model Name, and IMEI 1 are required before saving.');
      return;
    }
    setIsSavingDirect(true);
    try {
      const newImei1 = reviewCard.imei1.trim().toUpperCase();
      const newImei2 = reviewCard.imei2 ? reviewCard.imei2.trim().toUpperCase() : '';
      const allProducts = await fetchProductsList();
      const existingProduct = allProducts.find(
        (p: any) =>
          p.name.toLowerCase().trim() === reviewCard.modelName.toLowerCase().trim() ||
          (p.brand.toLowerCase().trim() === reviewCard.brand.toLowerCase().trim() &&
            p.name.toLowerCase().trim().includes(reviewCard.modelName.toLowerCase().trim()))
      );

      if (existingProduct) {
        const existingDevices = existingProduct.devices || [];
        const isDuplicate = existingDevices.some(
          (d: any) => d.imei1 === newImei1 || (d.imei2 && d.imei2 === newImei1)
        );
        if (isDuplicate) {
          toast.error(`IMEI ${newImei1} already exists for ${existingProduct.name}!`);
          setIsSavingDirect(false);
          return;
        }
        const newDevice = {
          imei1: newImei1, imei2: newImei2 || undefined,
          color: reviewCard.color.trim(), storage: reviewCard.storage.trim(), ram: reviewCard.ram.trim(),
          purchasePrice: parseFloat(reviewCard.purchasePrice || '0'),
          sellingPrice: parseFloat(reviewCard.sellingPrice || '0'),
          status: 'AVAILABLE'
        };
        await updateProductItem(existingProduct.id, {
          ...existingProduct,
          stockQuantity: (existingProduct.stockQuantity || 0) + 1,
          devices: [...existingDevices, newDevice]
        });
        toast.success(`📱 Added IMEI: ${newImei1} to existing ${existingProduct.name}!`);
      } else {
        await createProductItem({
          name: reviewCard.modelName.trim(), brand: reviewCard.brand.trim(),
          category: 'Mobile', isMobile: true, trackingType: 'SERIALIZED',
          purchasePrice: parseFloat(reviewCard.purchasePrice || '0'),
          sellingPrice: parseFloat(reviewCard.sellingPrice || '0'),
          gstRate: 18, hsnCode: '8517', warrantyMonths: 12,
          devices: [{
            imei1: newImei1, imei2: newImei2 || undefined,
            color: reviewCard.color.trim(), storage: reviewCard.storage.trim(), ram: reviewCard.ram.trim(),
            purchasePrice: parseFloat(reviewCard.purchasePrice || '0'),
            sellingPrice: parseFloat(reviewCard.sellingPrice || '0'),
            status: 'AVAILABLE'
          }]
        });
        toast.success(`🎉 ${reviewCard.brand} ${reviewCard.modelName} saved to inventory!`);
      }

      const stickerData: ParsedBoxSticker = {
        brand: reviewCard.brand, modelName: reviewCard.modelName, color: reviewCard.color,
        storage: reviewCard.storage, ram: reviewCard.ram, imei1: reviewCard.imei1, imei2: reviewCard.imei2
      };
      handleSuccess(reviewCard.imei1, stickerData);
    } catch (err) {
      console.error('Direct save failed:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSavingDirect(false);
    }
  };

  /**
   * handleSuccess: Close the modal, notify parent with parsed sticker data.
   * Called by "Fill Original Form" button and direct barcode scan.
   */
  const handleSuccess = (code: string, parsedData?: ParsedBoxSticker) => {
    setScannedResult(code);
    // Close modal FIRST so user sees the form fields update
    onClose();
    // Then call parent callback (React batches this with the close)
    onScanSuccess(code, parsedData);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) handleSuccess(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`w-full max-w-md border rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-sm">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* REVIEW FORM CARD — shown after OCR, user edits then fills form */}
        {reviewCard ? (
          <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-950/50 overflow-y-auto max-h-[80vh]">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3 rounded-xl shadow-md flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-amber-300 flex-shrink-0" />
                <span className="font-black text-xs">OCR Extracted — Verify & Edit Before Filling</span>
              </div>
              <button onClick={() => setReviewCard(null)} className="text-[10px] font-extrabold underline opacity-80 hover:opacity-100 flex-shrink-0 ml-2">
                Rescan
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Brand *</label>
                <input
                  type="text" value={reviewCard.brand} placeholder="e.g. Samsung"
                  onChange={e => setReviewCard({ ...reviewCard, brand: e.target.value })}
                  className="w-full p-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Model Name *</label>
                <input
                  type="text" value={reviewCard.modelName} placeholder="e.g. Galaxy S24 Ultra"
                  onChange={e => setReviewCard({ ...reviewCard, modelName: e.target.value })}
                  className="w-full p-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Color</label>
                <input
                  type="text" value={reviewCard.color} placeholder="e.g. Midnight Black"
                  onChange={e => setReviewCard({ ...reviewCard, color: e.target.value })}
                  className="w-full p-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Storage</label>
                <input
                  type="text" value={reviewCard.storage} placeholder="e.g. 256GB"
                  onChange={e => setReviewCard({ ...reviewCard, storage: e.target.value })}
                  className="w-full p-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">RAM</label>
                <input
                  type="text" value={reviewCard.ram} placeholder="e.g. 12GB"
                  onChange={e => setReviewCard({ ...reviewCard, ram: e.target.value })}
                  className="w-full p-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">IMEI 1 *</label>
                <input
                  type="text" value={reviewCard.imei1} placeholder="15-digit IMEI e.g. 359124098124901"
                  onChange={e => setReviewCard({ ...reviewCard, imei1: e.target.value })}
                  className="w-full p-2 text-xs font-mono font-bold rounded-xl border border-emerald-500 bg-white dark:bg-slate-900 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">IMEI 2 (Optional / Dual SIM)</label>
                <input
                  type="text" value={reviewCard.imei2} placeholder="15-digit second IMEI (if dual SIM)"
                  onChange={e => setReviewCard({ ...reviewCard, imei2: e.target.value })}
                  className="w-full p-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Selling Price (₹)</label>
                <input
                  type="number" value={reviewCard.sellingPrice} placeholder="e.g. 29999"
                  onChange={e => setReviewCard({ ...reviewCard, sellingPrice: e.target.value })}
                  className="w-full p-2 text-xs font-mono font-black text-emerald-600 rounded-xl border border-emerald-400 bg-white dark:bg-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Purchase Price (₹)</label>
                <input
                  type="number" value={reviewCard.purchasePrice} placeholder="e.g. 26000"
                  onChange={e => setReviewCard({ ...reviewCard, purchasePrice: e.target.value })}
                  className="w-full p-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Fill Form — closes modal, fills all Add Product form fields */}
              <button
                type="button"
                onClick={() => {
                  const stickerData: ParsedBoxSticker = {
                    brand: reviewCard.brand,
                    modelName: reviewCard.modelName,
                    color: reviewCard.color,
                    storage: reviewCard.storage,
                    ram: reviewCard.ram,
                    imei1: reviewCard.imei1,
                    imei2: reviewCard.imei2
                  };
                  handleSuccess(reviewCard.imei1 || 'STICKER_EXTRACTED', stickerData);
                }}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs shadow-md flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Fill Original Form</span>
              </button>

              {/* Save Direct to DB without going to form */}
              <button
                type="button"
                disabled={isSavingDirect}
                onClick={handleSaveProductDirectly}
                className="py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-black text-xs shadow-lg shadow-brand-primary/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingDirect ? 'Saving...' : 'Save Direct to DB'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Camera Viewport */}
            <div className="relative w-full h-60 bg-slate-950 flex items-center justify-center overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

              {/* Viewfinder overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-60 h-32 border-2 border-brand-primary/80 rounded-2xl relative shadow-[0_0_20px_rgba(2,132,199,0.3)] flex items-center justify-center overflow-hidden">
                  <div className="w-full h-0.5 bg-brand-primary animate-pulse shadow-[0_0_8px_#0284c7]" />
                </div>
                <p className="text-[10px] text-white/80 font-mono mt-2 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                  Align IMEI or Box Sticker inside frame
                </p>
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white space-y-3 p-4 text-center">
                  <RefreshCw className="w-10 h-10 animate-spin text-amber-400" />
                  <p className="text-xs font-black">{processingProgress}</p>
                  <p className="text-[10px] text-slate-400">This can take 15-30 seconds on first run</p>
                </div>
              )}

              {scannedResult && !isProcessing && (
                <div className="absolute inset-0 bg-brand-primary/95 p-4 flex flex-col items-center justify-center text-white font-extrabold space-y-2 text-center">
                  <CheckCircle2 className="w-12 h-12 animate-bounce text-white" />
                  <p className="text-sm font-mono tracking-tight">Scanned: {scannedResult}</p>
                </div>
              )}

              {cameraError && !isProcessing && (
                <div className="absolute inset-0 bg-slate-900/95 p-5 flex flex-col items-center justify-center text-center space-y-2.5">
                  <Smartphone className="w-8 h-8 text-amber-500" />
                  <p className="text-xs text-slate-300 font-bold px-2">{cameraError}</p>
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-black flex items-center space-x-1.5 shadow-md cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Photo</span>
                    </button>
                    <button
                      onClick={startCamera}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <input type="file" ref={cameraInputRef}
                onChange={(e) => { if (e.target.files?.[0]) processImageFile(e.target.files[0]); }}
                accept="image/*" capture="environment" className="hidden"
              />
              <input type="file" ref={galleryInputRef}
                onChange={(e) => { if (e.target.files?.[0]) processImageFile(e.target.files[0]); }}
                accept="image/*" className="hidden"
              />

              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={isProcessing}
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Camera Photo</span>
                </button>
                <button type="button" disabled={isProcessing}
                  onClick={() => galleryInputRef.current?.click()}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <ImageIcon className="w-4 h-4 text-brand-primary" />
                  <span>Upload Gallery</span>
                </button>
              </div>

              <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-center pt-1">
                Or type barcode / IMEI manually:
              </div>
              <form onSubmit={handleManualSubmit} className="flex items-center space-x-2">
                <input
                  type="text" value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. 861950081725032"
                  className={`flex-1 px-3 py-2 rounded-xl text-xs border font-mono font-bold focus:outline-none focus:border-brand-primary ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-black shadow-sm cursor-pointer hover:bg-brand-hover">
                  Confirm
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
