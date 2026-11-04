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
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FulfillmentSettings {
  suburb: string;
  postalCode: string;
  province: string;
  hub: string;
  mode: 'deliveryApp' | 'inStore'; // Sixty60/ASAP! vs In-Store Shelf
}

interface FulfillmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FulfillmentSettings;
  onSave: (newSettings: FulfillmentSettings) => void;
}

export const POPULAR_SUBURBS = [
  // Gauteng
  { suburb: 'Sandton City', postalCode: '2196', province: 'Gauteng', hub: 'Johannesburg' },
  { suburb: 'Fourways Hyper', postalCode: '2055', province: 'Gauteng', hub: 'Johannesburg North' },
  { suburb: 'Rosebank Mall', postalCode: '2196', province: 'Gauteng', hub: 'Johannesburg' },
  { suburb: 'Menlyn Park', postalCode: '0081', province: 'Gauteng', hub: 'Pretoria East' },
  { suburb: 'Centurion Mall', postalCode: '0157', province: 'Gauteng', hub: 'Centurion' },
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
  onSave
}: FulfillmentModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<'deliveryApp' | 'inStore'>(settings.mode);
  const [tempSettings, setTempSettings] = useState<FulfillmentSettings>(settings);

  if (!isOpen) return null;

  const filteredSuburbs = POPULAR_SUBURBS.filter(item => 
    item.suburb.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.postalCode.includes(searchQuery) ||
    item.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.hub.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApply = (suburbItem?: typeof POPULAR_SUBURBS[0]) => {
    const final: FulfillmentSettings = suburbItem 
      ? {
          suburb: suburbItem.suburb,
          postalCode: suburbItem.postalCode,
          province: suburbItem.province,
          hub: suburbItem.hub,
          mode: selectedMode
        }
      : {
          ...tempSettings,
          mode: selectedMode
        };

    onSave(final);
    onClose();
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
          className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl relative z-10 border border-slate-200 flex flex-col font-sans"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#FFE600] flex items-center justify-center text-slate-950 font-bold shadow-xs">
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
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-950 cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
            {/* 1. Mode Toggle: Delivery App vs In-Store */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
                1. Select Pricing Model
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Delivery App Card */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('deliveryApp')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
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
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Checkers Sixty60 & PnP ASAP! prices & live app promos
                  </p>
                  <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-[#FFE600] text-black">
                    60-Min Ready
                  </span>
                </button>

                {/* In-Store Card */}
                <button
                  type="button"
                  onClick={() => setSelectedMode('inStore')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                    selectedMode === 'inStore'
                      ? 'border-slate-950 bg-slate-950/5 ring-2 ring-slate-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-slate-700" />
                      <span className="text-xs font-black text-slate-950">
                        In-Store Shelf
                      </span>
                    </div>
                    {selectedMode === 'inStore' && (
                      <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Hypermarket & Supermarket physical aisle prices
                  </p>
                  <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Walk-in Shelf
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Suburb Search & Quick Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
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
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white mt-2">
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
                          <div className="text-xs font-bold text-slate-900">
                            {item.suburb}{' '}
                            <span className="text-[10px] font-mono font-normal text-slate-500">
                              ({item.postalCode})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {item.hub} • {item.province}
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-xs font-mono font-bold text-[#004D40] flex items-center gap-1">
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
              Currently: <strong className="text-slate-900">{tempSettings.suburb}</strong> ({selectedMode === 'deliveryApp' ? 'Sixty60 / ASAP!' : 'In-Store'})
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
