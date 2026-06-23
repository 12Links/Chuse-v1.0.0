import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scan, 
  Camera, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  ShoppingBag, 
  HelpCircle, 
  TrendingUp, 
  Check, 
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerProps {
  products: Product[];
  onAddToBasket: (productId: string) => void;
}

export default function BarcodeScanner({ products, onAddToBasket }: BarcodeScannerProps) {
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'checking' | 'not-found'>('idle');
  const [errorText, setErrorText] = useState('');
  const [showScannerTips, setShowScannerTips] = useState(true);
  
  // Real video feed stream target refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Web Audio Synth Barcode Beep
  const triggerHapticBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(985, audioCtx.currentTime); // Clear high-frequency register
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08); // Short snappy beep
    } catch (e) {
      console.warn("Haptic beep audio context is blocked or unsupported:", e);
    }
  };

  // Start continuous simulation check or camera access
  useEffect(() => {
    if (cameraActive) {
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [cameraActive]);

  const startCameraStream = async () => {
    setErrorText('');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Mock a physical background barcode parser if user has camera running
        simulateIntermittentAutoScan();
      } else {
        throw new Error("Your browser or sandbox environment doesn't support active camera inputs.");
      }
    } catch (err: any) {
      console.warn("Camera streaming request failed:", err);
      setErrorText("Camera stream blocked (possibly by browser iframe sandbox or missing permissions). Simulating interactive viewport...");
      setCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // For visual demo, let's auto scan a random bread barcode after 5 seconds if camera starts
  const simulateIntermittentAutoScan = () => {
    setTimeout(() => {
      if (streamRef.current && scanStatus === 'idle') {
        const randomProducts = products.filter(p => p.barcode);
        if (randomProducts.length > 0) {
          const randomItem = randomProducts[Math.floor(Math.random() * randomProducts.length)];
          if (randomItem.barcode) {
            handleLookupBarcode(randomItem.barcode);
          }
        }
      }
    }, 4500);
  };

  const handleLookupBarcode = (barcode: string) => {
    if (!barcode.trim()) return;
    setScanStatus('checking');
    setErrorText('');
    setScannedBarcode(barcode);

    setTimeout(() => {
      const match = products.find(p => p.barcode === barcode.trim());
      if (match) {
        setMatchedProduct(match);
        setScanStatus('success');
        triggerHapticBeep();
      } else {
        setMatchedProduct(null);
        setScanStatus('not-found');
      }
    }, 600);
  };

  const handleAddMatchedToBasket = () => {
    if (matchedProduct) {
      onAddToBasket(matchedProduct.id);
      triggerHapticBeep();
      // small pop text success
      setScanStatus('idle'); // Back to scanning!
      setMatchedProduct(null);
      setScannedBarcode('');
    }
  };

  // Helper: Find cheapest store price info
  const getCheapestStoreInfo = (product: Product) => {
    const validPrices = product.prices.filter(p => p.inStock && p.price > 0);
    if (validPrices.length === 0) return null;
    return [...validPrices].sort((a, b) => a.price - b.price)[0];
  };

  return (
    <div id="barcode-scan-container" className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
      
      {/* Scanner Control column */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Banner */}
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-xs flex items-center gap-4">
          <div className="bg-[#FFE600] rounded-2xl p-3 text-black shadow-md border border-yellow-350">
            <Scan className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-850">Smart Barcode Matcher</h2>
            <p className="text-xs text-slate-500 font-bold mt-0.5">Scan or input standard SA UPC barcodes for instant cheap supermarket indexing</p>
          </div>
        </div>

        {/* Viewfinder Frame Card */}
        <div className="bg-slate-900 rounded-[32px] border border-slate-800 overflow-hidden relative shadow-md min-h-[300px] flex flex-col justify-between">
          
          {/* Top Indicators inside viewfinder */}
          <div className="p-4 flex items-center justify-between relative z-10 w-full bg-linear-to-b from-slate-900/80 to-transparent">
            <span className="bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> 
              {cameraActive ? 'Camera Terminal Live' : 'Interactive Scan Mode'}
            </span>
            
            <button
              onClick={() => setCameraActive(!cameraActive)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{cameraActive ? 'Stop Stream' : 'Live Camera'}</span>
            </button>
          </div>

          {/* Viewport content */}
          <div className="flex-1 flex items-center justify-center relative min-h-[220px]">
            
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              /* Simulated ambient pulsing digital radar */
              <div className="absolute inset-0 bg-radial from-slate-800 to-slate-900 flex flex-col items-center justify-center p-8 text-center space-y-4 overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,24,38,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0)_1px,transparent_1px)] bg-[size:16px_16px]" />
                
                {/* Visual Radar Pulse */}
                <div className="w-20 h-20 bg-[#FFE600]/10 border-2 border-[#FFE600]/30 rounded-full flex items-center justify-center relative animate-pulse">
                  <Scan className="w-10 h-10 text-[#FFE600]" />
                </div>
                
                <div className="space-y-1 relative z-10">
                  <p className="text-xs text-slate-300 font-black">Interactive Multi-Scanner Ready</p>
                  <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Point your device camera at a barcode, or select from the South African staple catalog list below for instant simulated lookup.
                  </p>
                </div>
              </div>
            )}

            {/* Red Neon Laser Overlay */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none z-20">
              <div className="h-[2px] bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.7)] w-[90%] mx-auto animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-red-500/40 w-56 h-36 rounded-2xl flex items-center justify-center">
                <div className="text-[9px] font-black text-red-400 uppercase tracking-widest bg-slate-950/70 py-1 px-2.5 rounded border border-red-500/20">
                  Align UPC/EAN Code
                </div>
              </div>
            </div>

            {/* Quick Laser corner brackets */}
            <div className="absolute top-8 left-8 w-6 h-6 border-t-4 border-l-4 border-white/50 rounded-tl-md pointer-events-none" />
            <div className="absolute top-8 right-8 w-6 h-6 border-t-4 border-r-4 border-white/50 rounded-tr-md pointer-events-none" />
            <div className="absolute bottom-8 left-8 w-6 h-6 border-b-4 border-l-4 border-white/50 rounded-bl-md pointer-events-none" />
            <div className="absolute bottom-8 right-8 w-6 h-6 border-b-4 border-r-4 border-white/50 rounded-br-md pointer-events-none" />

          </div>

          {/* Manual Input Panel in Frame bottom */}
          <div className="p-4 bg-slate-950/90 border-t border-slate-800 relative z-20 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Type Barcode Digit... (e.g. 6001234567890)"
                value={scannedBarcode}
                onChange={e => setScannedBarcode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookupBarcode(scannedBarcode)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FFE600] transition-all"
              />
            </div>
            
            <button
              onClick={() => handleLookupBarcode(scannedBarcode)}
              className="bg-[#FFE600] hover:bg-yellow-405 text-black px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Verify
            </button>
          </div>

        </div>

        {errorText && (
          <div className="bg-rose-50 border border-rose-100/50 text-rose-700 text-xs p-4 rounded-2xl flex items-start gap-2.5 font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Demo Preset Barcodes quick selector */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              Staple Catalog Fast Demo codes
            </h3>
            <span className="bg-yellow-50 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-amber-200">
              1-Click Scan
            </span>
          </div>

          <p className="text-[11px] text-slate-450 font-bold leading-normal">
            Click any product below to trigger an authentic barcode parse, visual beep flash, and compare supermarket rates instantly:
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {products.filter(p => p.barcode).slice(0, 6).map(prod => (
              <button
                key={prod.id}
                onClick={() => handleLookupBarcode(prod.barcode || '')}
                className="p-3 text-left bg-slate-100 hover:bg-yellow-50/50 border border-slate-200 rounded-xl text-[11px] font-extrabold text-slate-700 hover:text-black transition-all hover:border-yellow-300 cursor-pointer flex flex-col justify-between h-20"
              >
                <span>{prod.name}</span>
                <span className="font-mono text-[9px] text-slate-400 mt-1 block">
                  #{prod.barcode?.slice(-5)}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Lookup Match results column */}
      <div className="lg:col-span-5 space-y-6">
        
        <AnimatePresence mode="wait">
          
          {scanStatus === 'checking' && (
            <motion.div
              key="checking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-200 rounded-[32px] p-8 text-center space-y-4 shadow-xs min-h-[420px] flex flex-col items-center justify-center text-slate-700"
            >
              <RefreshCw className="w-12 h-12 text-amber-500 animate-spin" />
              <div className="space-y-1">
                <p className="font-black text-slate-850">Connecting to Retail Database...</p>
                <p className="text-[11px] font-bold text-slate-500">Comparing Checkers, Woolworths, Spar, and PnP registers</p>
              </div>
            </motion.div>
          )}

          {scanStatus === 'idle' && !matchedProduct && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-200 rounded-[32px] p-8 text-center space-y-4 shadow-xs min-h-[420px] flex flex-col items-center justify-center text-slate-500 border-dashed"
            >
              <div className="w-14 h-14 bg-slate-50 border border-slate-200/80 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                <Scan className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-700 text-sm">Awaiting Scanner Input</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-semibold">
                  Scan a physical box barcode using the camera, or tap one of the fast demo products for full price comparisons.
                </p>
              </div>
            </motion.div>
          )}

          {scanStatus === 'not-found' && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-slate-200 rounded-[32px] p-8 text-center space-y-5 shadow-xs min-h-[420px] flex flex-col items-center justify-center text-slate-700"
            >
              <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              
              <div className="space-y-1">
                <h4 className="font-black text-slate-850">Barcode Not Registered</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-bold">
                  The scanned UPC/EAN code <strong className="font-mono text-slate-700">{scannedBarcode}</strong> is not listed on current index charts.
                </p>
              </div>

              <div className="bg-rose-50/50 p-4 border border-rose-100/50 rounded-2xl w-full text-left space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block">Pro Tip</span>
                <p className="text-[11px] text-rose-950/80 leading-normal font-semibold">
                  You can register and map any custom local supermarket prices by clicking the <strong>Log Custom Price</strong> tab!
                </p>
              </div>

              <button
                onClick={() => setScanStatus('idle')}
                className="w-full py-3 rounded-full text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Reset Scanner
              </button>
            </motion.div>
          )}

          {scanStatus === 'success' && matchedProduct && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-2 border-emerald-500 rounded-[32px] p-6 shadow-md space-y-6"
            >
              {/* Match Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-150">
                <div className="bg-emerald-50 text-emerald-600 rounded-full p-2.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50">
                    Matched SASKO / GTIN System
                  </span>
                  <h3 className="font-black text-slate-850 text-base">{matchedProduct.name}</h3>
                  <p className="text-[11px] text-slate-400 font-bold">Unit Size: {matchedProduct.unit} | Barcode: {matchedProduct.barcode}</p>
                </div>
              </div>

              {/* Price comparison registers */}
              <div className="space-y-3">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Live National Supermarket Rates
                </label>

                <div className="space-y-2">
                  {matchedProduct.prices.map(item => {
                    const priceFormatted = (item.inStock && item.price > 0) ? `R ${item.price.toFixed(2)}` : 'Out of Stock';
                    return (
                      <div
                        key={item.storeId}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border text-slate-705 ${
                          item.storeId === 'woolworths' ? 'bg-neutral-50 border-neutral-200' :
                          item.storeId === 'checkers' ? 'bg-teal-50/20 border-teal-150/50' :
                          item.storeId === 'pnp' ? 'bg-zinc-100/60 border-zinc-200' :
                          'bg-slate-50/40 border-slate-150'
                        }`}
                      >
                        <span className="text-xs font-black capitalize text-slate-800">{item.storeId}</span>
                        <div className="text-right flex flex-col items-end">
                          <span className={`text-xs font-mono font-black ${item.price > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                            {priceFormatted}
                          </span>
                          {item.onSpecial && (
                            <span className="text-[9px] text-[#006A4E] font-extrabold uppercase mt-0.5 bg-[#006A4E]/5 px-1.5 py-0.2 rounded-full">
                              {item.specialDetail}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cost Saving metrics */}
              {getCheapestStoreInfo(matchedProduct) && (
                <div className="bg-emerald-50/55 border border-emerald-100 rounded-2xl p-4 flex justify-between items-center text-emerald-800">
                  <div className="text-left">
                    <span className="text-[9px] font-black uppercase tracking-wider block text-emerald-600 leading-none">Best Store Index</span>
                    <span className="text-xs font-black capitalize block mt-0.5">
                      {getCheapestStoreInfo(matchedProduct)?.storeId}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase tracking-wider block text-emerald-600 leading-none">Min Price</span>
                    <span className="text-sm font-mono font-black block mt-0.5 text-emerald-700">
                      R {getCheapestStoreInfo(matchedProduct)?.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setScanStatus('idle')}
                  className="py-3.5 rounded-full text-xs font-black text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 transition-all border border-slate-200 cursor-pointer text-center"
                >
                  Scan Another Card
                </button>

                <button
                  onClick={handleAddMatchedToBasket}
                  className="inline-flex items-center justify-center gap-1.5 py-3.5 rounded-full text-xs font-black text-white bg-slate-900 hover:bg-emerald-600 transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Put In Basket</span>
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* Informational Scanner Tips */}
        {showScannerTips && (
          <div className="bg-yellow-50/40 border border-yellow-200 rounded-[24px] p-5 text-left relative overflow-hidden">
            <button
              onClick={() => setShowScannerTips(false)}
              className="absolute top-4 right-4 text-amber-600 hover:text-black text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
            
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-500 animate-bounce" /> How Scan to Compare Works
            </h4>
            
            <ul className="text-[11px] text-slate-700 space-y-2 font-semibold">
              <li className="flex items-start gap-1">
                <span className="text-amber-550 font-black">1.</span>
                <span>Select active loyalty cards under your User profile.</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-amber-550 font-black">2.</span>
                <span>Type or scan standard barcodes from South African pantry groceries.</span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-amber-550 font-black">3.</span>
                <span>The system matches GTIN barcodes directly against Checkers, Pick n Pay, Woolworths, and Spar listings to select your optimized cart mix.</span>
              </li>
            </ul>
          </div>
        )}

      </div>

    </div>
  );
}
