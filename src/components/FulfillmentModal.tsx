import React, { useState } from 'react';
import { 
  MapPin, 
  X, 
  Search, 
  Check, 
  Truck, 
  Store, 
  Clock, 
  Sparkles,
  ChevronRight,
  Navigation,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  requestUserLocation, 
  findNearestBranches, 
  getSavedOrFallbackCoordinates,
  BranchWithDistance 
} from '../lib/locationService';
import { RETAILER_THEMES } from '../lib/retailerTokens';
import { SupermarketBranch } from '../data/supermarketBranches';

export interface FulfillmentSettings {
  suburb: string;
  postalCode: string;
  province: string;
  hub: string;
  mode: 'deliveryApp' | 'inStore'; // Sixty60/ASAP! vs In-Store Shelf
  activeStoreBranchId?: string;
  activeStoreBranchName?: string;
  distanceFormatted?: string;
}

interface FulfillmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FulfillmentSettings;
  onSave: (newSettings: FulfillmentSettings) => void;
  onOpenNearbyStores?: () => void;
}

export const POPULAR_SUBURBS = [
  // Gauteng - Pretoria & Joburg
  { suburb: 'Hatfield', postalCode: '0083', province: 'Gauteng', hub: 'Pretoria Central' },
  { suburb: 'Brooklyn', postalCode: '0181', province: 'Gauteng', hub: 'Pretoria East' },
  { suburb: 'Menlyn Park', postalCode: '0081', province: 'Gauteng', hub: 'Pretoria East' },
  { suburb: 'Centurion Mall', postalCode: '0157', province: 'Gauteng', hub: 'Centurion' },
  { suburb: 'Sandton City', postalCode: '2196', province: 'Gauteng', hub: 'Johannesburg' },
  { suburb: 'Fourways Hyper', postalCode: '2055', province: 'Gauteng', hub: 'Johannesburg North' },
  { suburb: 'Rosebank Mall', postalCode: '2196', province: 'Gauteng', hub: 'Johannesburg' },
  { suburb: 'Bryanston', postalCode: '2191', province: 'Gauteng', hub: 'Johannesburg North' },

  // Western Cape
  { suburb: 'V&A Waterfront', postalCode: '8001', province: 'Western Cape', hub: 'Cape Town Central' },
  { suburb: 'Camps Bay', postalCode: '8005', province: 'Western Cape', hub: 'Atlantic Seaboard' },
  { suburb: 'Sea Point', postalCode: '8005', province: 'Western Cape', hub: 'Atlantic Seaboard' },
  { suburb: 'Century City', postalCode: '7441', province: 'Western Cape', hub: 'Cape Town Northern' },
  { suburb: 'Stellenbosch Square', postalCode: '7600', province: 'Western Cape', hub: 'Winelands' },
  { suburb: 'Claremont', postalCode: '7708', province: 'Western Cape', hub: 'Southern Suburbs' },

  // KwaZulu-Natal
  { suburb: 'Umhlanga Gateway', postalCode: '4319', province: 'KwaZulu-Natal', hub: 'Durban North' },
  { suburb: 'Durban North', postalCode: '4051', province: 'KwaZulu-Natal', hub: 'Durban' },
  { suburb: 'Ballito Junction', postalCode: '4399', province: 'KwaZulu-Natal', hub: 'North Coast' },
  { suburb: 'Westville', postalCode: '3629', province: 'KwaZulu-Natal', hub: 'Durban West' },

  // Eastern Cape
  { suburb: 'Summerstrand', postalCode: '6001', province: 'Eastern Cape', hub: 'Gqeberha' },
  { suburb: 'Beacon Bay', postalCode: '5241', province: 'Eastern Cape', hub: 'East London' },

  // Free State
  { suburb: 'Westdene', postalCode: '9301', province: 'Free State', hub: 'Bloemfontein' },
];

export function FulfillmentModal({
  isOpen,
  onClose,
  settings,
  onSave,
  onOpenNearbyStores
}: FulfillmentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<'deliveryApp' | 'inStore'>(settings.mode);
  const [tempSettings, setTempSettings] = useState<FulfillmentSettings>(settings);

  // GPS State
  const [isLocating, setIsLocating] = useState(false);
  const [nearbyBranches, setNearbyBranches] = useState<BranchWithDistance[]>(() => {
    const coords = getSavedOrFallbackCoordinates();
    return findNearestBranches(coords, { maxDistanceKm: 25, limit: 3 });
  });
  const [gpsError, setGpsError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSuburbs = POPULAR_SUBURBS.filter(item => 
    item.suburb.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.postalCode.includes(searchQuery) ||
    item.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.hub.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApply = (suburbItem?: typeof POPULAR_SUBURBS[0], branch?: BranchWithDistance) => {
    let final: FulfillmentSettings;

    if (branch) {
      final = {
        suburb: branch.suburb,
        postalCode: branch.postalCode,
        province: branch.province,
        hub: branch.city,
        mode: selectedMode,
        activeStoreBranchId: branch.id,
        activeStoreBranchName: branch.name,
        distanceFormatted: branch.distanceFormatted
      };
    } else if (suburbItem) {
      final = {
        suburb: suburbItem.suburb,
        postalCode: suburbItem.postalCode,
        province: suburbItem.province,
        hub: suburbItem.hub,
        mode: selectedMode
      };
    } else {
      final = {
        ...tempSettings,
        mode: selectedMode
      };
    }

    onSave(final);
    onClose();
  };

  const handleDetectGPS = async () => {
    setIsLocating(true);
    setGpsError(null);
    try {
      const coords = await requestUserLocation();
      const branches = findNearestBranches(coords, { maxDistanceKm: 35, limit: 3 });
      setNearbyBranches(branches);

      if (branches.length > 0) {
        const closest = branches[0];
        const autoApplied: FulfillmentSettings = {
          ...tempSettings,
          suburb: closest.suburb,
          postalCode: closest.postalCode,
          province: closest.province,
          hub: closest.city,
          activeStoreBranchId: closest.id,
          activeStoreBranchName: closest.name,
          distanceFormatted: closest.distanceFormatted,
          mode: selectedMode
        };
        setTempSettings(autoApplied);
        // Automatically save and apply immediately without requiring manual update
        onSave(autoApplied);
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setGpsError(err.message || 'Could not access GPS location.');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl relative z-10 border border-slate-200 flex flex-col font-sans"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FFE600] flex items-center justify-center text-slate-950 font-bold shadow-xs">
                <MapPin className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950 font-display tracking-tight leading-snug">
                  Choose Fulfillment & Store
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Prices dynamically adjust to your suburb and fulfillment mode
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-950 cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
            {/* 1. GPS Auto-Locate Hero Card */}
            <div className="p-3.5 bg-gradient-to-r from-amber-50/80 to-yellow-50 border border-amber-200/80 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-950 text-[#FFE600] flex items-center justify-center shadow-xs">
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-950 block leading-tight">
                      Find Closest Supermarkets
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">
                      Uses browser GPS to calculate exact store distances
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 text-[#FFE600] font-black text-xs font-sans flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
                </button>
              </div>

              {gpsError && (
                <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                  {gpsError}
                </div>
              )}

              {/* Closest Supermarket Quick List */}
              {nearbyBranches.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-amber-200/60">
                  <span className="text-xs font-bold text-slate-600 font-sans block">
                    Closest Supermarkets Around You:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {nearbyBranches.map((br) => {
                      const theme = RETAILER_THEMES[br.storeId];
                      return (
                        <div
                          key={br.id}
                          onClick={() => handleApply(undefined, br)}
                          className="p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-400 flex items-center justify-between gap-2 cursor-pointer transition-all hover:bg-slate-50 shadow-2xs group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[9px] font-sans font-bold uppercase px-1.5 py-0.2 rounded shrink-0 ${theme?.badgeBg || 'bg-slate-950'} ${theme?.badgeText || 'text-white'}`}>
                              {theme?.shortName || br.storeId}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-black font-sans">
                                {br.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{br.distanceFormatted} away • {br.suburb}</span>
                              </span>
                            </div>
                          </div>

                          <span className="text-[11px] font-sans font-bold text-slate-700 group-hover:text-black shrink-0 flex items-center gap-1">
                            Select <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {onOpenNearbyStores && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenNearbyStores();
                      }}
                      className="text-xs font-semibold text-slate-800 hover:text-black hover:underline flex items-center gap-1 pt-1 cursor-pointer font-sans"
                    >
                      <span>Explore all 30+ supermarkets on live radar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Mode Toggle: Delivery App vs In-Store */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 font-sans block">
                1. Select Pricing Model
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Delivery App Card */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('deliveryApp')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    selectedMode === 'deliveryApp'
                      ? 'border-[#004D40] bg-[#004D40]/5 ring-2 ring-[#004D40]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#008374]" />
                      <span className="text-xs font-black text-slate-950">
                        Delivery Apps
                      </span>
                    </div>
                    {selectedMode === 'deliveryApp' && (
                      <Check className="w-3.5 h-3.5 text-[#004D40] stroke-[3]" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight font-sans">
                    Checkers Sixty60 & PnP ASAP! prices & live app promos
                  </p>
                  <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-[#FFE600] text-black">
                    60-Min Ready
                  </span>
                </button>

                {/* In-Store Card */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('inStore')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    selectedMode === 'inStore'
                      ? 'border-slate-950 bg-slate-950/5 ring-2 ring-slate-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-slate-700" />
                      <span className="text-xs font-black text-slate-950 font-sans">
                        In-Store Shelf
                      </span>
                    </div>
                    {selectedMode === 'inStore' && (
                      <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight font-sans">
                    Hypermarket & Supermarket physical aisle prices
                  </p>
                  <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Walk-in Shelf
                  </span>
                </button>
              </div>
            </div>

            {/* 3. Suburb Search & Quick Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 font-sans block">
                2. Suburb / Delivery Destination
              </label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search suburb, mall, or postal code (e.g. Sandton, 8001)..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-950 focus:bg-white transition-colors"
                />
              </div>

              {/* Suburb list */}
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white mt-2">
                {filteredSuburbs.map((item) => {
                  const isCurrent = tempSettings.suburb === item.suburb;
                  return (
                    <div
                      key={item.suburb}
                      onClick={() => handleApply(item)}
                      className={`p-2.5 sm:p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                        isCurrent ? 'bg-slate-50 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-rose-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-bold text-slate-900 font-sans">
                            {item.suburb}{' '}
                            <span className="text-[10px] font-sans font-medium text-slate-500">
                              ({item.postalCode})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {item.hub} • {item.province}
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-xs font-sans font-bold text-[#004D40] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Selected
                        </span>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  );
                })}

                {filteredSuburbs.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500 font-sans">
                    No matching suburb found. You can keep{' '}
                    <span className="font-bold text-slate-900">{tempSettings.suburb}</span> or try searching by postal code.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-[11px] text-slate-600 font-sans">
              Currently: <strong className="text-slate-900">{tempSettings.suburb}</strong>{' '}
              {tempSettings.distanceFormatted && (
                <span className="text-emerald-700 font-sans font-bold">
                  ({tempSettings.distanceFormatted})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleApply()}
              className="px-4 py-2 bg-[#FFE600] hover:bg-yellow-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-yellow-400 shadow-xs"
            >
              Apply Settings
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
