import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scan, 
  Camera, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  ShoppingBag, 
  Check, 
  RefreshCw,
  Search,
  CheckCircle2,
  Volume2,
  Zap,
  ZapOff,
  SwitchCamera,
  Upload,
  X,
  MapPin,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  BrowserMultiFormatReader, 
  BarcodeFormat, 
  DecodeHintType 
} from '@zxing/library';
import { Product, StoreId } from '../types';
import { RETAILER_THEMES } from '../lib/retailerTokens';
import { getNearestBranchForStore, getSavedOrFallbackCoordinates } from '../lib/locationService';

interface BarcodeScannerProps {
  products: Product[];
  onAddToBasket: (productId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function BarcodeScanner({ 
  products, 
  onAddToBasket, 
  isOpen = true,
  onClose 
}: BarcodeScannerProps) {
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchCapability, setHasTorchCapability] = useState(false);
  const [scanStatus, setScanStatus] = useState<'scanning' | 'checking' | 'success' | 'not-found'>('scanning');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAddedSuccess, setHasAddedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const userCoords = useRef(getSavedOrFallbackCoordinates());
  const isScanningRef = useRef<boolean>(false);

  // Supermarket Cash Register Audio Beep & Haptics
  const triggerScanAudioBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        // Crisp 2-tone cash register chime
        osc.frequency.setValueAtTime(1050, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1450, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);

        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }
    } catch (e) {
      // Audio not permitted or muted
    }

    // Haptic vibration on physical phones
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 30, 40]);
      }
    } catch {}
  }, []);

  // Initialize ZXing MultiFormatReader instance
  useEffect(() => {
    const hints = new Map();
    const formats = [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
    ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    codeReaderRef.current = reader;

    return () => {
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch {}
      }
    };
  }, []);

  // Enumerate video camera input devices
  const discoverVideoDevices = useCallback(async () => {
    if (!codeReaderRef.current) return;
    try {
      const devices = await codeReaderRef.current.listVideoInputDevices();
      setVideoDevices(devices);

      if (devices.length > 0 && !selectedDeviceId) {
        // Prefer back-facing camera on mobile phones
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') || 
          d.label.toLowerCase().includes('environment')
        );
        setSelectedDeviceId(backCamera ? backCamera.deviceId : devices[devices.length - 1].deviceId);
      }
    } catch (err) {
      console.warn('Error discovering video input devices:', err);
    }
  }, [selectedDeviceId]);

  // Start continuous barcode scanning from camera
  const startScanningStream = useCallback(async () => {
    if (!codeReaderRef.current || !videoRef.current || scanStatus !== 'scanning') return;

    setErrorMessage(null);
    setIsInitializingCamera(true);

    try {
      // Reset any previous stream
      codeReaderRef.current.reset();
      isScanningRef.current = true;

      // Discover available camera lenses
      await discoverVideoDevices();

      // Start continuous optical decoding
      if (selectedDeviceId) {
        await codeReaderRef.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, err) => {
            if (result && isScanningRef.current) {
              const text = result.getText();
              if (text && text.trim()) {
                isScanningRef.current = false;
                handleBarcodeDiscovered(text.trim());
              }
            }
          }
        );
      } else {
        // Fallback to constraints with ideal environment camera
        await codeReaderRef.current.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          videoRef.current,
          (result, err) => {
            if (result && isScanningRef.current) {
              const text = result.getText();
              if (text && text.trim()) {
                isScanningRef.current = false;
                handleBarcodeDiscovered(text.trim());
              }
            }
          }
        );
      }

      // Check for torch / flashlight capability
      setTimeout(() => {
        try {
          const stream = videoRef.current?.srcObject as MediaStream | null;
          if (stream) {
            const track = stream.getVideoTracks()[0];
            if (track) {
              const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
              setHasTorchCapability(Boolean(capabilities.torch));
            }
          }
        } catch (e) {
          setHasTorchCapability(false);
        }
      }, 500);

      setIsInitializingCamera(false);
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Error starting camera stream with ZXing:', err);
      setIsInitializingCamera(false);
      setCameraActive(false);
      isScanningRef.current = false;

      if (err.name === 'NotAllowedError' || err.message?.includes('denied')) {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser or enter the barcode numbers below.');
      } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
        setErrorMessage('No camera device found on this system. You can scan by typing the barcode numbers or uploading a photo.');
      } else {
        setErrorMessage('Could not activate camera scanner. You can use photo upload or manual barcode entry.');
      }
    }
  }, [discoverVideoDevices, scanStatus, selectedDeviceId]);

  // Stop camera feed and reset optical decoder
  const stopScanningStream = useCallback(() => {
    isScanningRef.current = false;
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {}
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  }, []);

  // Manage camera lifecycle
  useEffect(() => {
    if (isOpen && scanStatus === 'scanning' && cameraActive && activeTab === 'camera') {
      startScanningStream();
    } else {
      stopScanningStream();
    }

    return () => {
      stopScanningStream();
    };
  }, [isOpen, scanStatus, cameraActive, activeTab, startScanningStream, stopScanningStream]);

  // Toggle Torch / Flashlight
  const handleToggleTorch = async () => {
    try {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      if (track) {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setIsTorchOn(nextState);
      }
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  // Switch to next available camera device
  const handleSwitchCamera = () => {
    if (videoDevices.length <= 1) return;
    const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    stopScanningStream();
    setSelectedDeviceId(videoDevices[nextIndex].deviceId);
    setTimeout(() => {
      startScanningStream();
    }, 200);
  };

  // Decode barcode from an uploaded image photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !codeReaderRef.current) return;

    setScanStatus('checking');
    setErrorMessage(null);

    // Create a local data preview URL
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setUploadedImagePreview(dataUrl);

      try {
        if (!codeReaderRef.current) throw new Error('Reader not ready');
        const result = await codeReaderRef.current.decodeFromImageUrl(dataUrl);
        if (result && result.getText()) {
          handleBarcodeDiscovered(result.getText().trim());
        } else {
          setScanStatus('not-found');
          setScannedBarcode('Image Photo');
        }
      } catch (err: any) {
        console.warn('ZXing Image Decode failed:', err);
        setScanStatus('not-found');
        setScannedBarcode('Photo Upload');
        setErrorMessage('Could not find a clear barcode in this photo. Please make sure the barcode is well-lit, sharp, and not cropped.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Search product across client catalog and backend API
  const handleBarcodeDiscovered = async (barcode: string) => {
    const cleanCode = barcode.trim();
    if (!cleanCode) return;

    setScannedBarcode(cleanCode);
    setScanStatus('checking');
    stopScanningStream();

    // 1. Try local memory search
    const localMatch = products.find(
      p => p.barcode === cleanCode || 
           (p.barcode && p.barcode.endsWith(cleanCode)) || 
           p.id === cleanCode
    );

    if (localMatch) {
      setMatchedProduct(localMatch);
      setScanStatus('success');
      triggerScanAudioBeep();
      return;
    }

    // 2. Try partial barcode match on local catalog
    const partialMatch = products.find(
      p => p.barcode && p.barcode.includes(cleanCode)
    );

    if (partialMatch) {
      setMatchedProduct(partialMatch);
      setScanStatus('success');
      triggerScanAudioBeep();
      return;
    }

    // 3. Fallback to server API barcode lookup
    try {
      let res = await fetch(`/api/barcode/${encodeURIComponent(cleanCode)}`);
      if (!res.ok || res.headers.get("content-type")?.includes("text/html")) {
        res = await fetch(`https://chuse-chi.vercel.app/api/barcode/${encodeURIComponent(cleanCode)}`);
      }
      if (res.ok) {
        const serverProduct: Product = await res.json();
        if (serverProduct && serverProduct.name) {
          setMatchedProduct(serverProduct);
          setScanStatus('success');
          triggerScanAudioBeep();
          return;
        }
      }
    } catch (e) {
      console.warn('Network barcode lookup failed:', e);
    }

    // 4. Barcode not indexed
    setMatchedProduct(null);
    setScanStatus('not-found');
  };

  // Put matched item in basket
  const handleAddToBasket = () => {
    if (!matchedProduct) return;
    onAddToBasket(matchedProduct.id);
    triggerScanAudioBeep();
    setHasAddedSuccess(true);
    setTimeout(() => setHasAddedSuccess(false), 2000);
  };

  // Reset to continue scanning next item
  const handleScanNext = () => {
    setMatchedProduct(null);
    setScannedBarcode('');
    setManualInput('');
    setUploadedImagePreview(null);
    setScanStatus('scanning');
    setCameraActive(true);
    isScanningRef.current = true;
  };

  // Ranked competitor prices for the scanned product
  const sortedPrices = useMemo(() => {
    if (!matchedProduct) return [];
    return [...matchedProduct.prices]
      .filter(p => p.inStock && p.price > 0)
      .sort((a, b) => a.price - b.price);
  }, [matchedProduct]);

  const cheapestPriceObj = sortedPrices[0];
  const highestPriceObj = sortedPrices[sortedPrices.length - 1];
  const potentialSavings = (highestPriceObj && cheapestPriceObj) ? Math.max(0, highestPriceObj.price - cheapestPriceObj.price) : 0;
  const bestRetailer = cheapestPriceObj ? RETAILER_THEMES[cheapestPriceObj.storeId] : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 relative my-auto flex flex-col font-sans max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#FFE600] flex items-center justify-center text-slate-950 font-black shadow-xs shrink-0">
              <Scan className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-950 font-display uppercase tracking-tight truncate">
                  Barcode Price Matcher
                </h3>
                <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  GS1 EAN-13
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans truncate">
                Scan any South African grocery packaging for instant multi-store prices
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-black cursor-pointer transition-colors shrink-0 ml-2"
              aria-label="Close Scanner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Viewfinder Mode Selector (Camera vs Photo vs Manual) */}
          {scanStatus === 'scanning' && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('camera');
                  setCameraActive(true);
                }}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200 font-black'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  fileInputRef.current?.click();
                }}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200 font-black'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200 font-black'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Manual Digits</span>
              </button>
            </div>
          )}

          {/* Optical Viewfinder (Active when in camera tab) */}
          {scanStatus === 'scanning' && activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl bg-slate-950 overflow-hidden shadow-inner aspect-4/3 sm:aspect-16/9 flex items-center justify-center border border-slate-800">
                
                {/* Live Camera Video Feed */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {isInitializingCamera && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 z-20">
                    <RefreshCw className="w-7 h-7 text-[#FFE600] animate-spin" />
                    <span className="text-xs font-mono font-bold tracking-wide">Starting optical camera...</span>
                  </div>
                )}

                {/* Laser Reticle & HUD Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className="w-60 sm:w-72 h-32 sm:h-36 border-2 border-white/50 rounded-xl relative flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    
                    {/* Animated Red Laser Scanline */}
                    <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.9)] animate-pulse" />
                    
                    {/* Corner Target Markers */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FFE600]" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FFE600]" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#FFE600]" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FFE600]" />

                    <span className="absolute -bottom-6 px-2.5 py-0.5 rounded-full bg-slate-950/90 text-white text-[9px] font-mono font-bold uppercase tracking-wider border border-white/20 flex items-center gap-1 shadow-md">
                      <Scan className="w-2.5 h-2.5 text-[#FFE600]" />
                      Align barcode inside frame
                    </span>
                  </div>
                </div>

                {/* Camera Top Controls */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                  {hasTorchCapability && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      className={`p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer shadow-md ${
                        isTorchOn ? 'bg-[#FFE600] text-slate-950 font-bold' : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                      title="Toggle Torch / Flashlight"
                      aria-label="Toggle Torch"
                    >
                      {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                    </button>
                  )}

                  {videoDevices.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer shadow-md"
                      title="Switch Camera Lens"
                      aria-label="Switch Camera"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Bottom Left Live Status Pill */}
                <div className="absolute bottom-3 left-3 z-20">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-400/40 text-emerald-300 text-[9.5px] font-mono font-bold flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    ZXing Optical Engine Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Photo Upload View */}
          {scanStatus === 'scanning' && activeTab === 'upload' && (
            <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-slate-700">
                <Upload className="w-6 h-6 text-slate-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 font-sans">
                  Upload a photo of any grocery barcode
                </h4>
                <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto">
                  Take a photo with your phone camera or select an existing picture from your gallery
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-black text-white text-xs font-mono font-bold uppercase cursor-pointer transition-colors shadow-xs"
              >
                Choose Photo
              </button>
            </div>
          )}

          {/* Manual Digits View (Active when manual tab selected) */}
          {scanStatus === 'scanning' && activeTab === 'manual' && (
            <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-slate-800">
                <Scan className="w-6 h-6 text-slate-700" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 font-sans">
                  Enter Barcode Number
                </h4>
                <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto">
                  Type the 8, 12, or 13 digits printed beneath the barcode stripes on the packaging
                </p>
              </div>

              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualInput.trim()) {
                      handleBarcodeDiscovered(manualInput);
                    }
                  }}
                  autoFocus
                  placeholder="e.g. 6001299011113"
                  className="w-full pl-10 pr-24 py-3 rounded-xl bg-white border-2 border-slate-200 text-sm font-mono font-bold text-slate-900 tracking-wider placeholder:text-slate-400 placeholder:tracking-normal focus:outline-none focus:border-slate-950 transition-all shadow-xs"
                />
                <button
                  type="button"
                  disabled={!manualInput.trim()}
                  onClick={() => handleBarcodeDiscovered(manualInput)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-lg bg-slate-950 hover:bg-black disabled:bg-slate-300 text-white text-xs font-mono font-bold uppercase cursor-pointer disabled:cursor-not-allowed transition-colors shadow-xs"
                >
                  Lookup
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-mono">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Compatible with South African GS1 EAN-13, EAN-8 & UPC</span>
              </div>
            </div>
          )}

          {/* Hidden File Input for Image Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Error Message Notice */}
          {errorMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <span>{errorMessage}</span>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      startScanningStream();
                    }}
                    className="text-[11px] font-bold text-amber-950 underline hover:text-black cursor-pointer"
                  >
                    Try Camera Again
                  </button>
                  <span className="text-amber-400">•</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className="text-[11px] font-bold text-amber-950 underline hover:text-black cursor-pointer"
                  >
                    Enter Digits Manually
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Inline Quick Search (when in Camera mode) */}
          {scanStatus === 'scanning' && activeTab === 'camera' && (
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualInput.trim()) {
                      handleBarcodeDiscovered(manualInput);
                    }
                  }}
                  placeholder="Or enter barcode digits directly..."
                  className="w-full pl-9 pr-20 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-slate-950 focus:bg-white transition-all shadow-2xs"
                />
                {manualInput.trim() && (
                  <button
                    type="button"
                    onClick={() => handleBarcodeDiscovered(manualInput)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-black text-white text-[10.5px] font-mono font-bold uppercase cursor-pointer transition-colors shadow-xs"
                  >
                    Lookup
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Checking / Matching Loading State */}
          {scanStatus === 'checking' && (
            <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
              <RefreshCw className="w-10 h-10 text-[#FFE600] animate-spin mx-auto stroke-[2.5]" />
              <h4 className="text-sm font-black text-slate-900 font-sans">
                Querying National Supermarket Index...
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                Matching GTIN Barcode: <strong className="text-slate-900">{scannedBarcode}</strong>
              </p>
            </div>
          )}

          {/* Product Match Success Result */}
          {scanStatus === 'success' && matchedProduct && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              {/* Product Header Card */}
              <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/60 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <img
                  src={matchedProduct.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150'}
                  alt={matchedProduct.name}
                  className="w-18 h-18 sm:w-20 sm:h-20 object-contain bg-white rounded-xl p-1.5 border border-slate-200 shadow-2xs shrink-0"
                />

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white font-mono font-black text-[9.5px] uppercase tracking-wide flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3" />
                      GTIN Confirmed
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                      #{scannedBarcode}
                    </span>
                  </div>

                  <h4 className="text-base sm:text-lg font-black text-slate-950 font-sans leading-tight">
                    {matchedProduct.name}
                  </h4>

                  <span className="text-xs font-mono font-bold text-slate-600 block">
                    {matchedProduct.category} • Pack Size: {matchedProduct.unit}
                  </span>
                </div>

                {cheapestPriceObj && (
                  <div className="text-center sm:text-right shrink-0 bg-white/90 p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 block">
                      Lowest Shelf Price
                    </span>
                    <span className="text-2xl font-black font-mono text-emerald-700 leading-none">
                      R{cheapestPriceObj.price.toFixed(2)}
                    </span>
                    {potentialSavings > 0 && (
                      <span className="text-[9.5px] font-mono font-bold text-slate-600 block mt-0.5">
                        Save R{potentialSavings.toFixed(2)} vs highest
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 7-Store Ranked Price Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  <span>Live Supermarket Price Ranking</span>
                  <span className="text-emerald-700">{sortedPrices.length} Stores Tracked</span>
                </div>

                <div className="space-y-1.5 font-sans">
                  {sortedPrices.map((pr, idx) => {
                    const retailer = RETAILER_THEMES[pr.storeId];
                    const isLowest = idx === 0;
                    const diff = pr.price - (cheapestPriceObj?.price || 0);
                    const nearestBranch = getNearestBranchForStore(userCoords.current, pr.storeId);

                    return (
                      <div
                        key={pr.storeId}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isLowest
                            ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-300/40 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                            isLowest ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-950 font-sans truncate">
                                {retailer?.name || pr.storeId}
                              </span>
                              {retailer && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${retailer.badgeBg} ${retailer.badgeText}`}>
                                  {retailer.loyaltyProgram}
                                </span>
                              )}
                              {pr.onSpecial && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  {pr.specialDetail || 'Special'}
                                </span>
                              )}
                            </div>
                            {nearestBranch && (
                              <span className="text-[10px] text-slate-500 font-mono block truncate">
                                📍 {nearestBranch.distanceFormatted} away • {nearestBranch.mallOrCenter}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-sm font-black font-mono ${isLowest ? 'text-emerald-700' : 'text-slate-950'}`}>
                            R{pr.price.toFixed(2)}
                          </span>
                          {isLowest ? (
                            <span className="block text-[9.5px] font-bold text-emerald-700 uppercase font-mono">
                              Cheapest
                            </span>
                          ) : (
                            <span className="block text-[9.5px] font-mono text-slate-500 font-semibold">
                              +R{diff.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons: Add to Basket & Scan Next */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase font-mono cursor-pointer transition-colors text-center shadow-2xs"
                >
                  Scan Next Item
                </button>

                <button
                  type="button"
                  onClick={handleAddToBasket}
                  className="py-3 px-4 rounded-xl bg-[#FFE600] hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase font-mono flex items-center justify-center gap-2 cursor-pointer shadow-xs border border-yellow-400 transition-colors"
                >
                  {hasAddedSuccess ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Added to Basket!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Put in Basket</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Barcode Not Found State */}
          {scanStatus === 'not-found' && (
            <div className="py-10 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 font-sans">
                  Barcode Not Found in Index
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-mono">
                  Code <strong className="text-slate-900">#{scannedBarcode}</strong> is not registered in our current South African supermarket database.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-black text-white font-bold text-xs font-mono cursor-pointer transition-colors shadow-xs"
                >
                  Scan Another Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleScanNext();
                    setActiveTab('upload');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs font-mono cursor-pointer transition-colors"
                >
                  Upload Photo Instead
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer info bar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-sans shrink-0">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            Audio chime & haptic feedback enabled
          </span>
          <span className="font-mono text-[10px] text-slate-600">
            Powered by ZXing WebAssembly
          </span>
        </div>
      </motion.div>
    </div>
  );
}