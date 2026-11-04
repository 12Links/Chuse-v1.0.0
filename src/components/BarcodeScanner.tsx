import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scan, 
  Camera, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  ShoppingBag, 
  Check, 
  ArrowRight,
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
  ChevronRight
} from 'lucide-react';
import { Product, StoreId } from '../types';
import { RETAILER_THEMES } from '../lib/retailerTokens';
import { getNearestBranchForStore, getSavedOrFallbackCoordinates } from '../lib/locationService';

interface BarcodeScannerProps {
  products: Product[];
  onAddToBasket: (productId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

// Popular South African staple grocery presets for instant 1-click test scanning
const POPULAR_STAPLE_BARCODES = [
  { name: 'Clover Milk 2L', barcode: '6001299011113', emoji: '🥛' },
  { name: 'Albany White Bread', barcode: '6001248000144', emoji: '🍞' },
  { name: 'Sunfoil Oil 2L', barcode: '6001087000034', emoji: '🌻' },
  { name: 'Snowflake Flour 2.5kg', barcode: '6001007000015', emoji: '🌾' },
  { name: 'Spekko Rice 2kg', barcode: '6001016112233', emoji: '🍚' },
  { name: 'Large Eggs 18s', barcode: '6002135468790', emoji: '🥚' },
  { name: 'Nescafe Gold 200g', barcode: '6001056123456', emoji: '☕' },
  { name: 'Huletts Sugar 2.5kg', barcode: '6001007001001', emoji: '🍬' }
];

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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchCapability, setHasTorchCapability] = useState(false);
  const [scanStatus, setScanStatus] = useState<'scanning' | 'checking' | 'success' | 'not-found'>('scanning');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasAddedSuccess, setHasAddedSuccess] = useState(false);

  // Video feed stream target refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // User coordinates for nearby store distance
  const userCoords = useRef(getSavedOrFallbackCoordinates());

  // Cash Register Audio Beep
  const triggerScanAudioBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
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
    } catch (e) {
      console.warn("Scan audio beep unavailable:", e);
    }

    // Haptic vibration on supported devices
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 30, 40]);
      }
    } catch {}
  };

  // Start or Stop camera stream when modal opens/closes or facing mode changes
  useEffect(() => {
    if (cameraActive && scanStatus === 'scanning') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [cameraActive, facingMode, scanStatus]);

  const startCamera = async () => {
    setErrorMessage(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;

      // Check if torch is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorchCapability(Boolean(capabilities.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }

      // Initialize hardware BarcodeDetector loop if supported
      initBarcodeDetectionLoop();
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraActive(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. You can still scan by typing barcode numbers or picking a staple below.'
          : 'Could not activate camera. Please use manual barcode entry or image upload.'
      );
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  };

  // Toggle Torch / Flashlight
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setIsTorchOn(nextState);
      } catch (e) {
        console.warn('Torch constraint error:', e);
      }
    }
  };

  // Switch between front and back cameras
  const handleSwitchCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Continuous Hardware-accelerated Barcode Detection Loop
  const initBarcodeDetectionLoop = () => {
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    if (!BarcodeDetectorClass) {
      // Browser doesn't have native BarcodeDetector (fallback to manual & fast demo chips)
      return;
    }

    try {
      const barcodeDetector = new BarcodeDetectorClass({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
      });

      const detectFrame = async () => {
        if (
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          !videoRef.current.paused &&
          scanStatus === 'scanning'
        ) {
          try {
            const detected = await barcodeDetector.detect(videoRef.current);
            if (detected && detected.length > 0) {
              const code = detected[0].rawValue;
              if (code && code.trim()) {
                handleBarcodeDiscovered(code.trim());
                return;
              }
            }
          } catch (e) {
            // frame skip
          }
        }

        if (streamRef.current && scanStatus === 'scanning') {
          animationFrameRef.current = requestAnimationFrame(detectFrame);
        }
      };

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    } catch (e) {
      console.warn('BarcodeDetector initialization error:', e);
    }
  };

  // Handle Photo Upload Barcode Parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanStatus('checking');
    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (BarcodeDetectorClass) {
        const detector = new BarcodeDetectorClass({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
        });
        const imageBitmap = await createImageBitmap(file);
        const results = await detector.detect(imageBitmap);

        if (results && results.length > 0) {
          handleBarcodeDiscovered(results[0].rawValue);
          return;
        }
      }

      // If no barcode found in image
      setScanStatus('not-found');
      setScannedBarcode('Image Photo');
    } catch (err) {
      setScanStatus('not-found');
      setScannedBarcode('Image Photo');
    }
  };

  // Barcode Lookup logic
  const handleBarcodeDiscovered = (barcode: string) => {
    const cleanCode = barcode.trim();
    if (!cleanCode) return;

    setScannedBarcode(cleanCode);
    setScanStatus('checking');
    stopCamera();

    // Find in products catalog by barcode or ID
    setTimeout(() => {
      const match = products.find(p => p.barcode === cleanCode || p.barcode?.includes(cleanCode) || p.id === cleanCode);

      if (match) {
        setMatchedProduct(match);
        setScanStatus('success');
        triggerScanAudioBeep();
      } else {
        setMatchedProduct(null);
        setScanStatus('not-found');
      }
    }, 450);
  };

  // Add matched item to basket
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
    setScanStatus('scanning');
    setCameraActive(true);
  };

  // Sorted competitor prices for matched product
  const sortedPrices = React.useMemo(() => {
    if (!matchedProduct) return [];
    return [...matchedProduct.prices]
      .filter(p => p.inStock && p.price > 0)
      .sort((a, b) => a.price - b.price);
  }, [matchedProduct]);

  const cheapestPriceObj = sortedPrices[0];
  const highestPriceObj = sortedPrices[sortedPrices.length - 1];
  const potentialSavings = (highestPriceObj && cheapestPriceObj) ? Math.max(0, highestPriceObj.price - cheapestPriceObj.price) : 0;
  const bestRetailer = cheapestPriceObj ? RETAILER_THEMES[cheapestPriceObj.storeId] : null;
  const nearestStoreBranch = cheapestPriceObj ? getNearestBranchForStore(userCoords.current, cheapestPriceObj.storeId) : null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 relative my-auto flex flex-col font-sans max-h-[94vh]"
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFE600] flex items-center justify-center text-slate-950 font-black shadow-xs">
              <Scan className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-950 font-display uppercase tracking-tight leading-none">
                Barcode Scanner & Price Matcher
              </h3>
              <span className="text-[10px] text-slate-500 font-sans">
                Scan any South African supermarket product barcode for live price comparisons
              </span>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-black cursor-pointer transition-colors"
              aria-label="Close Scanner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Viewfinder Section (Active when scanning) */}
          {scanStatus === 'scanning' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl bg-slate-950 overflow-hidden shadow-lg aspect-4/3 sm:aspect-16/9 flex items-center justify-center border border-slate-800">
                
                {/* Live Video Element */}
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs font-semibold">Camera is paused or unavailable.</p>
                    <button
                      type="button"
                      onClick={() => setCameraActive(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#FFE600] text-slate-950 font-bold text-xs font-mono cursor-pointer"
                    >
                      Turn On Camera
                    </button>
                  </div>
                )}

                {/* Tactical HUD Overlay & Laser Scanline */}
                {cameraActive && (
                  <>
                    {/* Targeting Reticle Frame */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-64 sm:w-80 h-36 sm:h-44 border-2 border-white/60 rounded-xl relative flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                        {/* Red Laser Barcode Line with Sweep Animation */}
                        <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.8)] animate-pulse" />
                        
                        {/* Corner Target Markers */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FFE600]" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FFE600]" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#FFE600]" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FFE600]" />

                        <span className="absolute -bottom-6 px-2 py-0.5 rounded bg-slate-950/80 text-white text-[9.5px] font-mono font-bold uppercase tracking-wider border border-white/20">
                          Align barcode inside box
                        </span>
                      </div>
                    </div>

                    {/* Camera Control Overlays */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                      {hasTorchCapability && (
                        <button
                          type="button"
                          onClick={handleToggleTorch}
                          className={`p-2 rounded-lg backdrop-blur-md transition-colors cursor-pointer ${
                            isTorchOn ? 'bg-[#FFE600] text-slate-950' : 'bg-black/50 text-white hover:bg-black/70'
                          }`}
                          title="Toggle Flashlight"
                        >
                          {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleSwitchCamera}
                        className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors cursor-pointer"
                        title="Switch Camera (Front/Back)"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-400/40 text-emerald-300 text-[9.5px] font-mono font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Live Optical Decoder
                      </span>
                    </div>
                  </>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Manual Barcode Entry + Photo Upload row */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
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
                    placeholder="Or enter barcode digits (e.g. 6001299011113)..."
                    className="w-full pl-9 pr-16 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-950 focus:bg-white transition-all"
                  />
                  {manualInput && (
                    <button
                      type="button"
                      onClick={() => handleBarcodeDiscovered(manualInput)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-950 text-white text-[10px] font-mono font-bold uppercase cursor-pointer"
                    >
                      Lookup
                    </button>
                  )}
                </div>

                {/* Upload Image Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold font-mono"
                  title="Upload photo of barcode"
                >
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Photo</span>
                </button>
              </div>

              {/* Instant Mzansi Staple Presets (1-Click Test Scan) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  <span>Fast Demo Barcode Presets</span>
                  <span className="text-amber-600">Tap to Simulate Scan</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {POPULAR_STAPLE_BARCODES.map((item) => (
                    <button
                      key={item.barcode}
                      type="button"
                      onClick={() => handleBarcodeDiscovered(item.barcode)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-400 text-left transition-all hover:bg-slate-50 cursor-pointer shadow-2xs group flex items-center gap-1.5"
                    >
                      <span className="text-base">{item.emoji}</span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-black">
                          {item.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 block">
                          #{item.barcode.slice(-4)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading / Checking State */}
          {scanStatus === 'checking' && (
            <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
              <RefreshCw className="w-10 h-10 text-[#FFE600] animate-spin mx-auto stroke-[2.5]" />
              <h4 className="text-sm font-black text-slate-900 font-sans">
                Connecting to National Supermarket Index...
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                Matching GTIN: <strong className="text-slate-900">{scannedBarcode}</strong>
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
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <img
                  src={matchedProduct.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=150'}
                  alt={matchedProduct.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain bg-white rounded-lg p-1.5 border border-slate-200 shadow-2xs shrink-0"
                />

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white font-mono font-black text-[9.5px] uppercase tracking-wide flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3" />
                      GTIN Match Confirmed
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Barcode: {scannedBarcode}
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
                  <div className="text-center sm:text-right shrink-0">
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 block">
                      Lowest Shelf Price
                    </span>
                    <span className="text-2xl font-black font-mono text-emerald-700 leading-none">
                      R{cheapestPriceObj.price.toFixed(2)}
                    </span>
                    {potentialSavings > 0 && (
                      <span className="text-[10px] font-mono font-bold text-slate-500 block mt-0.5">
                        Saves R{potentialSavings.toFixed(2)} vs highest
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 7-Store Ranked Price Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  <span>Live Supermarket Price Comparison</span>
                  <span>Ranked</span>
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
                            ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300/30'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${
                            isLowest ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-950 font-sans">
                                {retailer?.name || pr.storeId}
                              </span>
                              {retailer && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${retailer.badgeBg} ${retailer.badgeText}`}>
                                  {retailer.loyaltyProgram}
                                </span>
                              )}
                            </div>
                            {nearestBranch && (
                              <span className="text-[10px] text-slate-500 font-mono block">
                                📍 {nearestBranch.distanceFormatted} away • {nearestBranch.mallOrCenter}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-sm font-black font-mono ${isLowest ? 'text-emerald-700' : 'text-slate-950'}`}>
                            R{pr.price.toFixed(2)}
                          </span>
                          {isLowest ? (
                            <span className="block text-[9.5px] font-bold text-emerald-700 uppercase font-mono">
                              Cheapest
                            </span>
                          ) : (
                            <span className="block text-[9.5px] font-mono text-slate-400">
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
                  className="py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs uppercase font-mono cursor-pointer transition-colors text-center"
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
            <div className="py-12 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 font-sans">
                  Barcode Not Found in Catalog
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-mono">
                  Code: <strong className="text-slate-900">{scannedBarcode}</strong> is not indexed in the current South African national database yet.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="px-4 py-2 rounded-xl bg-slate-950 text-white font-bold text-xs font-mono cursor-pointer"
                >
                  Scan Another Code
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 font-sans shrink-0">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            Audio beep & haptic confirmation active
          </span>
          <span className="font-mono text-[10px]">EAN-13 / UPC-A GS1 ZA</span>
        </div>
      </motion.div>
    </div>
  );
}
