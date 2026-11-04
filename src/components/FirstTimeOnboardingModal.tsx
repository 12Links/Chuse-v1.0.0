import React, { useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  ScanBarcode, 
  Sparkles, 
  ShoppingBag, 
  ArrowRight, 
  Check, 
  X,
  ChevronRight,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { requestUserLocation, findNearestBranches } from '../lib/locationService';
import { FulfillmentSettings } from './FulfillmentModal';

interface FirstTimeOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onLocationDetected: (settings: FulfillmentSettings) => void;
  currentSettings: FulfillmentSettings;
}

export function FirstTimeOnboardingModal({
  isOpen,
  onComplete,
  onLocationDetected,
  currentSettings
}: FirstTimeOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [detectedLocationName, setDetectedLocationName] = useState<string | null>(null);
  const [detectedBranchName, setDetectedBranchName] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDetectGPS = async () => {
    setIsLocating(true);
    setGpsError(null);
    try {
      const coords = await requestUserLocation();
      const branches = findNearestBranches(coords, { maxDistanceKm: 35, limit: 1 });
      
      if (branches.length > 0) {
        const closest = branches[0];
        const newSettings: FulfillmentSettings = {
          suburb: closest.suburb,
          postalCode: closest.postalCode,
          province: closest.province,
          hub: closest.city,
          mode: currentSettings.mode || 'deliveryApp',
          activeStoreBranchId: closest.id,
          activeStoreBranchName: closest.name,
          distanceFormatted: closest.distanceFormatted
        };
        setDetectedLocationName(closest.suburb);
        setDetectedBranchName(`${closest.name} (${closest.distanceFormatted} away)`);
        onLocationDetected(newSettings);
      } else {
        setDetectedLocationName('Gauteng');
      }
    } catch (err: any) {
      console.warn('Onboarding GPS failed:', err);
      setGpsError(err.message || 'Location access was not enabled.');
    } finally {
      setIsLocating(false);
    }
  };

  const steps = [
    {
      title: "Find Supermarkets Near You",
      subtitle: "Automatic Location Detection",
      badge: "STEP 1 OF 3",
      description: "chuse. scans 7 major South African retailers (Checkers, Pick n Pay, Woolworths, Shoprite, SPAR, Boxer, and Food Lover's) and personalizes deals for your exact suburb.",
      icon: MapPin,
      iconBg: "bg-amber-100 text-amber-700",
      content: (
        <div className="space-y-4 my-2">
          {detectedLocationName ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Location Configured</p>
                <p className="text-sm font-black text-emerald-950 mt-0.5 truncate">
                  {detectedLocationName}
                </p>
                {detectedBranchName && (
                  <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                    Closest: {detectedBranchName}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isLocating}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 active:scale-[0.99] text-[#FFE600] font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer disabled:opacity-75"
              >
                {isLocating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#FFE600] border-t-transparent rounded-full animate-spin" />
                    <span>Detecting your neighborhood...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 stroke-[2.5]" />
                    <span>Enable Location (Auto-Detect)</span>
                  </>
                )}
              </button>
              {gpsError && (
                <p className="text-xs text-rose-600 font-medium text-center px-2">
                  {gpsError} (You can also select manually anytime)
                </p>
              )}
              <p className="text-[11px] text-slate-700 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                <span>Automatically updates nearby stores as you travel across SA</span>
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      title: "Optical Barcode Matcher",
      subtitle: "Instant In-Aisle Comparison",
      badge: "STEP 2 OF 3",
      description: "Point your phone camera at any grocery item at home or on supermarket shelves. Instantly compare prices across all stores before paying.",
      icon: ScanBarcode,
      iconBg: "bg-blue-100 text-blue-700",
      content: (
        <div className="my-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
            <span className="w-5 h-5 rounded-full bg-slate-950 text-[#FFE600] flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Tap the yellow <strong className="text-slate-950">Scan</strong> button in the bottom navigation.</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
            <span className="w-5 h-5 rounded-full bg-slate-950 text-[#FFE600] flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Align the red laser reticle over the barcode.</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
            <span className="w-5 h-5 rounded-full bg-slate-950 text-[#FFE600] flex items-center justify-center text-[10px] font-bold">3</span>
            <span>See the cheapest supermarket in your neighborhood in real-time.</span>
          </div>
        </div>
      )
    },
    {
      title: "Smart Basket Optimization",
      subtitle: "Cut Your Monthly Grocery Bill",
      badge: "STEP 3 OF 3",
      description: "Build your weekly shopping list. chuse. automatically recommends private-label swaps (e.g. Simple Truth, Housebrand) and multi-buys to save up to 25%.",
      icon: ShoppingBag,
      iconBg: "bg-emerald-100 text-emerald-700",
      content: (
        <div className="my-2 bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950">Average South African Basket Savings</span>
            <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Save ~R84.50</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            Compare delivery app prices (Checkers Sixty60, Pick n Pay asap!) vs in-store shelf tags with 1-tap toggling.
          </p>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-slate-950 font-sans">
                chuse<span className="text-[#FFE600]">.</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                Quick Tour
              </span>
            </div>
            <button
              type="button"
              onClick={onComplete}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 py-1 px-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Skip
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${currentStepData.iconBg} flex items-center justify-center shrink-0`}>
                <StepIcon className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                  {currentStepData.badge}
                </span>
                <h3 className="text-base font-black text-slate-950 tracking-tight leading-snug">
                  {currentStepData.title}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {currentStepData.description}
            </p>

            {/* Interactive Step Specific Content */}
            {currentStepData.content}
          </div>

          {/* Footer Controls */}
          <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStep ? 'w-6 bg-slate-950' : 'w-1.5 bg-slate-300'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Next / Finish Button */}
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-[#FFE600] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <span>{currentStep === steps.length - 1 ? "Start Shopping" : "Continue"}</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
