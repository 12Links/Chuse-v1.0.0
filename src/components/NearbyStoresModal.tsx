import React, { useState, useEffect } from 'react';
import { 
  SupermarketBranch, 
  SUPERMARKET_BRANCHES 
} from '../data/supermarketBranches';
import { 
  UserCoordinates, 
  BranchWithDistance, 
  findNearestBranches, 
  requestUserLocation, 
  getSavedOrFallbackCoordinates,
  getGoogleMapsDirectionsUrl 
} from '../lib/locationService';
import { StoreId } from '../types';
import { RETAILER_THEMES } from '../lib/retailerTokens';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Phone, 
  ExternalLink, 
  X, 
  Check, 
  AlertCircle, 
  Truck, 
  Store,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NearbyStoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStoreBranch: (branch: SupermarketBranch) => void;
  currentSelectedBranchId?: string;
}

export function NearbyStoresModal({
  isOpen,
  onClose,
  onSelectStoreBranch,
  currentSelectedBranchId
}: NearbyStoresModalProps) {
  const [userCoords, setUserCoords] = useState<UserCoordinates>(() => getSavedOrFallbackCoordinates());
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedChainFilter, setSelectedChainFilter] = useState<StoreId | 'all'>('all');
  const [radiusKm, setRadiusKm] = useState<number>(25);

  // Trigger GPS retrieval
  const handleDetectGPS = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const coords = await requestUserLocation();
      setUserCoords(coords);
    } catch (err: any) {
      setLocationError(err.message || 'Could not retrieve GPS coordinates.');
    } finally {
      setIsLocating(false);
    }
  };

  // Compute nearest branches
  const nearestBranches = React.useMemo(() => {
    return findNearestBranches(userCoords, {
      storeId: selectedChainFilter,
      maxDistanceKm: radiusKm,
      limit: 30
    });
  }, [userCoords, selectedChainFilter, radiusKm]);

  if (!isOpen) return null;

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
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl relative z-10 border border-slate-200 flex flex-col font-sans"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFE600] flex items-center justify-center text-slate-950 font-bold shadow-xs">
                <Navigation className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-950 font-display tracking-tight leading-snug">
                  Supermarkets Close to You
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Real-time GPS proximity, trading hours & online delivery fulfillment
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-black cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* GPS Quick Action Bar */}
          <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-sans">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="text-slate-600">
                Location:{' '}
                <strong className="text-slate-900 font-mono">
                  {userCoords.lat.toFixed(4)}° S, {userCoords.lng.toFixed(4)}° E
                </strong>{' '}
                {userCoords.source === 'gps' ? '(Live GPS)' : '(Default: Sandton)'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={isLocating}
              className="px-3.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 disabled:opacity-50"
            >
              <Navigation className={`w-3.5 h-3.5 text-[#FFE600] ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Acquiring GPS...' : 'Use My Exact Location'}</span>
            </button>
          </div>

          {/* Error notice if location denied */}
          {locationError && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{locationError}</span>
            </div>
          )}

          {/* Supermarket Brand Filter Pills */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedChainFilter('all')}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedChainFilter === 'all'
                    ? 'bg-slate-950 text-white border-slate-950 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                All Brands
              </button>

              {(['checkers', 'pnp', 'woolworths', 'shoprite', 'spar', 'foodlovers', 'boxer'] as StoreId[]).map((stId) => {
                const theme = RETAILER_THEMES[stId];
                const isSelected = selectedChainFilter === stId;
                return (
                  <button
                    key={stId}
                    type="button"
                    onClick={() => setSelectedChainFilter(stId)}
                    className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? `${theme.badgeBg} ${theme.badgeText} shadow-xs font-black ring-1 ring-black/10`
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                    <span>{theme.shortName}</span>
                  </button>
                );
              })}
            </div>

            {/* Radius selector */}
            <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-slate-200">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Radius:</span>
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="bg-white border border-slate-200 text-xs rounded px-1.5 py-1 font-mono font-bold text-slate-800 cursor-pointer focus:outline-none"
              >
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
            </div>
          </div>

          {/* Branches List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 font-sans">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono font-bold uppercase mb-1">
              <span>{nearestBranches.length} Supermarkets Found within {radiusKm} km</span>
              <span>Sorted by Distance</span>
            </div>

            {nearestBranches.map((branch) => {
              const theme = RETAILER_THEMES[branch.storeId];
              const isSelected = currentSelectedBranchId === branch.id;
              const mapsUrl = getGoogleMapsDirectionsUrl(branch);

              return (
                <div
                  key={branch.id}
                  className={`p-4 rounded-xl border transition-all duration-200 bg-white shadow-2xs hover:shadow-md ${
                    isSelected
                      ? 'border-[#004D40] ring-2 ring-[#004D40]/15 bg-teal-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: Retailer Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded shadow-2xs ${theme?.badgeBg || 'bg-slate-950'} ${theme?.badgeText || 'text-white'}`}>
                          {theme?.shortName || branch.storeId}
                        </span>

                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 font-mono font-black text-xs">
                          📍 {branch.distanceFormatted} away
                        </span>

                        {/* Open/Close Status */}
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-mono font-bold px-2 py-0.5 rounded ${
                          branch.isOpenNow ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {branch.openStatusLabel}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-black text-slate-950 font-sans leading-tight">
                        {branch.name}
                      </h4>

                      <p className="text-xs text-slate-600 leading-snug">
                        {branch.address}
                      </p>

                      {/* Feature Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {branch.hasSixty60 && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-[#004D40]/10 text-[#004D40]">
                            ⚡ Sixty60
                          </span>
                        )}
                        {branch.hasAsap && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-[#0B2B6B]/10 text-[#0B2B6B]">
                            ⚡ PnP ASAP!
                          </span>
                        )}
                        {branch.hasBakery && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            🥖 Fresh Bakery
                          </span>
                        )}
                        {branch.hasDeli && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-slate-100 text-slate-700">
                            🍗 Hot Deli
                          </span>
                        )}
                        {branch.hasLiquorShop && (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-purple-50 text-purple-900">
                            🍷 Liquor
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStoreBranch(branch);
                          onClose();
                        }}
                        className={`w-full sm:w-auto px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                          isSelected
                            ? 'bg-slate-950 text-white font-black'
                            : 'bg-[#FFE600] hover:bg-yellow-400 text-slate-950 border border-yellow-400'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                        <span>{isSelected ? 'My Active Store' : 'Set as My Store'}</span>
                      </button>

                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Navigation className="w-3 h-3 text-slate-500" />
                          <span>Directions</span>
                        </a>

                        {branch.phone && (
                          <a
                            href={`tel:${branch.phone.replace(/\s+/g, '')}`}
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs flex items-center justify-center transition-colors"
                            title={`Call ${branch.name}`}
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {nearestBranches.length === 0 && (
              <div className="p-10 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">No supermarkets found within {radiusKm} km</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try expanding the search radius to 50 km or click "Use My Exact Location" to refresh GPS coordinates.
                </p>
                <button
                  type="button"
                  onClick={() => setRadiusKm(50)}
                  className="px-4 py-2 bg-slate-950 text-white rounded-lg text-xs font-bold font-mono cursor-pointer"
                >
                  Expand Radius to 50 km
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 font-sans">
            <span>
              Tip: Setting your store dynamically loads exact branch shelf pricing and delivery slots.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 font-bold text-slate-800 cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
