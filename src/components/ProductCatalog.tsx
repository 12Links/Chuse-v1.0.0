import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, StoreId, BasketItem } from '../types';
import { STORES } from '../data/catalog';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  ArrowUpDown, 
  X, 
  AlertCircle, 
  Bookmark, 
  BookmarkCheck, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  Tag, 
  Flame, 
  Check, 
  TrendingDown, 
  Layers, 
  Sparkles,
  Navigation,
  MapPin,
  Leaf,
  ShieldCheck,
  CheckCircle2,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PriceHistoryChart } from './PriceHistoryChart';
import { 
  analyzePriceTiming, 
  getTrackedStapleIds, 
  toggleTrackStaple 
} from '../lib/priceTiming';
import { StapleTimingSection } from './StapleTimingSection';
import { RETAILER_THEMES, calculateNormalizedUnitPrice } from '../lib/retailerTokens';
import { 
  getNearestBranchForStore, 
  getSavedOrFallbackCoordinates 
} from '../lib/locationService';

interface ProductCatalogProps {
  products: Product[];
  basket: BasketItem[];
  addToBasket: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromBasket?: (productId: string) => void;
  onSearchRealTime: (query: string) => Promise<void>;
  isSearchingRealTime: boolean;
  searchError: string | null;
  externalSearchTerm?: string;
  onClearSearch?: () => void;
  selectedStoreFilter?: StoreId | 'all';
  onSelectStoreFilter?: (store: StoreId | 'all') => void;
  selectedCategoryFilter?: string;
  onSelectCategoryFilter?: (cat: string) => void;
  onOpenCart?: () => void;
  onReportDiscrepancy?: (product: Product) => void;
  onOpenNearbyStores?: () => void;
}

// Canonical South African Supermarket Aisles
export interface Aisle {
  id: string;
  name: string;
  thumbnail: string;
}

export const SUPERMARKET_AISLES: Aisle[] = [
  { id: 'All', name: 'All Aisles', thumbnail: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=140' },
  { id: 'Milk, Dairy & Eggs', name: 'Milk, Dairy & Eggs', thumbnail: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=140' },
  { id: 'Bakery & Bread', name: 'Bakery & Bread', thumbnail: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=140' },
  { id: 'Pantry Staples', name: 'Pantry Staples', thumbnail: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=140' },
  { id: 'Breakfast & Cereals', name: 'Breakfast & Cereals', thumbnail: 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=140' },
  { id: 'Fresh Produce', name: 'Fresh Produce', thumbnail: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=140' },
  { id: 'Meat & Poultry', name: 'Meat & Poultry', thumbnail: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=140' },
  { id: 'Beverages', name: 'Beverages', thumbnail: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=140' },
  { id: 'Snacks & Treats', name: 'Snacks & Treats', thumbnail: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=140' },
  { id: 'Household & Cleaning', name: 'Household & Cleaning', thumbnail: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=140' },
  { id: 'Personal Care', name: 'Personal Care', thumbnail: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=140' },
  { id: 'Baby Care', name: 'Baby Care', thumbnail: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=140' },
];

export function getShortDealBadge(storeId?: string, specialDetail?: string): string {
  const detail = (specialDetail || '').toLowerCase();
  
  if (detail.includes('buy 2') || detail.includes('buy 3') || detail.includes('combo') || detail.includes('any 2') || detail.includes('any 3') || detail.includes('for r') || detail.includes('bulk')) {
    return 'Combo Deal';
  }
  if (storeId === 'checkers' || detail.includes('xtra')) {
    return 'Xtra Savings';
  }
  if (storeId === 'pnp' || detail.includes('smart')) {
    return 'Smart Shopper';
  }
  if (storeId === 'woolworths' || detail.includes('wrewards')) {
    return 'WRewards';
  }
  if (storeId === 'spar' || detail.includes('spar')) {
    return 'SPAR Rewards';
  }
  if (storeId === 'shoprite') {
    return 'Xtra Savings';
  }
  if (storeId === 'boxer') {
    return 'Combo Deal';
  }
  if (storeId === 'foodlovers') {
    return 'Combo Deal';
  }
  return 'Combo Deal';
}

export function normalizeCategory(cat: string): string {
  const c = (cat || '').trim().toLowerCase();
  if (c.includes('dairy') || c.includes('milk') || c.includes('egg')) return 'Milk, Dairy & Eggs';
  if (c.includes('breakfast') || c.includes('cereal') || c.includes('oats')) return 'Breakfast & Cereals';
  if (c.includes('pantry') || c.includes('staple') || c.includes('cupboard') || c.includes('oil') || c.includes('flour') || c.includes('rice') || c.includes('sugar') || c.includes('maize')) return 'Pantry Staples';
  if (c.includes('bakery') || c.includes('bread')) return 'Bakery & Bread';
  if (c.includes('meat') || c.includes('poultry') || c.includes('chicken') || c.includes('beef')) return 'Meat & Poultry';
  if (c.includes('produce') || c.includes('fruit') || c.includes('veg')) return 'Fresh Produce';
  if (c.includes('beverage') || c.includes('drink') || c.includes('tea') || c.includes('coffee') || c.includes('juice')) return 'Beverages';
  if (c.includes('snack') || c.includes('sweet') || c.includes('treat') || c.includes('biscuit') || c.includes('chocolate') || c.includes('chip')) return 'Snacks & Treats';
  if (c.includes('household') || c.includes('cleaning') || c.includes('detergent') || c.includes('paper')) return 'Household & Cleaning';
  if (c.includes('baby')) return 'Baby Care';
  if (c.includes('personal') || c.includes('toilet') || c.includes('beauty') || c.includes('hygiene')) return 'Personal Care';
  return cat || 'General Groceries';
}

function matchesDietary(product: Product, tag: string): boolean {
  const text = `${product.name} ${product.category}`.toLowerCase();
  if (tag === 'Halaal') {
    return !text.includes('pork') && !text.includes('bacon') && !text.includes('ham') && !text.includes('wine') && !text.includes('beer');
  }
  if (tag === 'Kosher') {
    return !text.includes('pork') && !text.includes('bacon') && !text.includes('shellfish') && !text.includes('ham');
  }
  if (tag === 'Vegan') {
    return !text.includes('milk') && !text.includes('cheese') && !text.includes('butter') && !text.includes('dairy') && 
           !text.includes('meat') && !text.includes('beef') && !text.includes('chicken') && !text.includes('egg') && 
           !text.includes('yogurt') && !text.includes('yoghurt') && !text.includes('bacon') && !text.includes('polony') && !text.includes('fish');
  }
  if (tag === 'Gluten-Free') {
    return !text.includes('bread') && !text.includes('flour') && !text.includes('wheat') && 
           !text.includes('cereal') && !text.includes('biscuit') && !text.includes('pasta') && 
           !text.includes('oats') && !text.includes('cake');
  }
  return true;
}

export default function ProductCatalog({
  products,
  basket,
  addToBasket,
  updateQuantity,
  onSearchRealTime,
  isSearchingRealTime,
  searchError,
  externalSearchTerm = '',
  onClearSearch,
  selectedStoreFilter = 'all',
  onSelectStoreFilter,
  selectedCategoryFilter = 'All',
  onSelectCategoryFilter,
  onOpenCart,
  onReportDiscrepancy,
  onOpenNearbyStores
}: ProductCatalogProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'bestTimeToBuy' | 'lowestPrice' | 'biggestSavings' | 'name'>('popular');
  const [activeSecondaryFilter, setActiveSecondaryFilter] = useState<'all' | 'specials' | 'multibuys' | 'drops' | 'tracked' | 'halaal' | 'vegan' | 'gluten_free'>('all');
  const [trackedIds, setTrackedIds] = useState<string[]>(() => getTrackedStapleIds());
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);

  // Cached GPS coordinates for nearest branch distances
  const userCoords = useMemo(() => getSavedOrFallbackCoordinates(), []);

  // Category horizontal scroll ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Sync tracked staples across tabs
  useEffect(() => {
    const handleTrackedUpdated = () => {
      setTrackedIds(getTrackedStapleIds());
    };
    window.addEventListener('chuse_tracked_staples_updated', handleTrackedUpdated);
    window.addEventListener('storage', handleTrackedUpdated);
    return () => {
      window.removeEventListener('chuse_tracked_staples_updated', handleTrackedUpdated);
      window.removeEventListener('storage', handleTrackedUpdated);
    };
  }, []);

  const activeSearch = externalSearchTerm || internalSearch;

  // Memoized 30-day Price Timing Analysis
  const timingAnalyses = useMemo(() => {
    const map = new Map<string, ReturnType<typeof analyzePriceTiming>>();
    products.forEach(p => {
      map.set(p.id, analyzePriceTiming(p));
    });
    return map;
  }, [products]);

  // Counts for secondary filter badges
  const filterCounts = useMemo(() => {
    let specials = 0;
    let multibuys = 0;
    let drops = 0;

    products.forEach(p => {
      const hasSpecial = p.prices.some(pr => pr.inStock && pr.onSpecial);
      if (hasSpecial) specials++;

      const hasMulti = p.prices.some(pr => pr.inStock && pr.specialDetail && /buy\s*\d|for\s*r/i.test(pr.specialDetail));
      if (hasMulti) multibuys++;

      const timing = timingAnalyses.get(p.id);
      if (timing?.status === 'buy') drops++;
    });

    return { specials, multibuys, drops, tracked: trackedIds.length };
  }, [products, timingAnalyses, trackedIds]);

  // Deduplicated active aisles
  const activeAisles = useMemo(() => {
    const productCategories = new Set(products.map(p => normalizeCategory(p.category)));
    return SUPERMARKET_AISLES.filter(aisle => {
      if (aisle.id === 'All') return true;
      return productCategories.has(aisle.id);
    });
  }, [products]);

  // Dynamic visual thumbnails linking directly to live product packshots
  const aisleThumbnails = useMemo(() => {
    const map: Record<string, string> = {};
    SUPERMARKET_AISLES.forEach(aisle => {
      if (aisle.id === 'All') {
        map['All'] = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=140';
        return;
      }
      const sample = products.find(p => normalizeCategory(p.category) === aisle.id && p.imageUrl);
      map[aisle.id] = sample?.imageUrl || aisle.thumbnail;
    });
    return map;
  }, [products]);

  const getBasketQty = (productId: string) => {
    return basket.find(item => item.productId === productId)?.quantity || 0;
  };

  // Filter and sort products
  const processedProducts = useMemo(() => {
    const query = activeSearch.toLowerCase().trim();
    const searchTokens = query.split(/\s+/).filter(Boolean);

    return products
      .filter(p => {
        // Search token matching
        if (searchTokens.length > 0) {
          const searchableText = `${p.name} ${p.category} ${p.unit || ''} ${p.barcode || ''}`.toLowerCase();
          const matches = searchTokens.every(token => searchableText.includes(token));
          if (!matches) return false;
        }

        // Category matching
        if (selectedCategoryFilter !== 'All') {
          const norm = normalizeCategory(p.category);
          if (norm !== selectedCategoryFilter && p.category !== selectedCategoryFilter) {
            return false;
          }
        }

        // Store matching
        if (selectedStoreFilter !== 'all') {
          const hasInStore = p.prices.some(pr => pr.storeId === selectedStoreFilter && pr.inStock && pr.price > 0);
          if (!hasInStore) return false;
        }

        // Secondary Filters
        if (activeSecondaryFilter === 'specials') {
          const hasSpecial = p.prices.some(pr => pr.inStock && pr.onSpecial);
          if (!hasSpecial) return false;
        } else if (activeSecondaryFilter === 'multibuys') {
          const hasMulti = p.prices.some(pr => pr.inStock && pr.specialDetail && /buy\s*\d|for\s*r/i.test(pr.specialDetail));
          if (!hasMulti) return false;
        } else if (activeSecondaryFilter === 'drops') {
          const timing = timingAnalyses.get(p.id);
          if (timing?.status !== 'buy') return false;
        } else if (activeSecondaryFilter === 'tracked') {
          if (!trackedIds.includes(p.id)) return false;
        } else if (activeSecondaryFilter === 'halaal') {
          if (!matchesDietary(p, 'Halaal')) return false;
        } else if (activeSecondaryFilter === 'vegan') {
          if (!matchesDietary(p, 'Vegan')) return false;
        } else if (activeSecondaryFilter === 'gluten_free') {
          if (!matchesDietary(p, 'Gluten-Free')) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'bestTimeToBuy') {
          const tA = timingAnalyses.get(a.id);
          const tB = timingAnalyses.get(b.id);
          const statusPriority: Record<string, number> = { buy: 3, fair: 2, wait: 1 };
          const pA = statusPriority[tA?.status || 'fair'] || 0;
          const pB = statusPriority[tB?.status || 'fair'] || 0;
          if (pA !== pB) return pB - pA;
          return (tA?.diffFromAvgPercent || 0) - (tB?.diffFromAvgPercent || 0);
        }

        const getMinPrice = (p: Product) => {
          const prices = p.prices.filter(pr => pr.inStock && pr.price > 0).map(pr => pr.price);
          return prices.length > 0 ? Math.min(...prices) : 999999;
        };

        const getMaxSavings = (p: Product) => {
          const prices = p.prices.filter(pr => pr.inStock && pr.price > 0).map(pr => pr.price);
          if (prices.length < 2) return 0;
          return Math.max(...prices) - Math.min(...prices);
        };

        if (sortBy === 'lowestPrice') {
          return getMinPrice(a) - getMinPrice(b);
        } else if (sortBy === 'biggestSavings') {
          return getMaxSavings(b) - getMaxSavings(a);
        } else if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        } else {
          // popular first
          if (a.isPopular && !b.isPopular) return -1;
          if (!a.isPopular && b.isPopular) return 1;
          return 0;
        }
      });
  }, [products, activeSearch, selectedCategoryFilter, selectedStoreFilter, sortBy, activeSecondaryFilter, timingAnalyses, trackedIds]);

  return (
    <div id="product-catalog-view" className="space-y-4">
      {/* 1. Visual "Shop by Aisle" Strip (Checkers Sixty60 Style) */}
      <div className="relative py-1 w-full max-w-full overflow-hidden">
        {/* Left Arrow with Soft Gradient Fade */}
        <div className="hidden md:flex absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent z-10 items-center justify-start pointer-events-none">
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            className="pointer-events-auto w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-black hover:bg-slate-50 transition-all cursor-pointer"
            title="Scroll aisles left"
            aria-label="Scroll aisles left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Scroll Container with hidden scrollbar */}
        <div
          ref={categoryScrollRef}
          className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 px-1 sm:px-2 md:px-8 scroll-smooth select-none w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {activeAisles.map((aisle) => {
            const isSelected = selectedCategoryFilter === aisle.id;
            const thumbUrl = aisleThumbnails[aisle.id] || aisle.thumbnail;

            return (
              <button
                key={aisle.id}
                type="button"
                onClick={() => onSelectCategoryFilter?.(aisle.id)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
              >
                {/* 58x58 / 64x64 Tile Box */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center p-2 transition-all relative ${
                    isSelected
                      ? 'bg-slate-950 border-2 border-slate-950 shadow-md ring-2 ring-slate-950/20'
                      : 'bg-white border border-slate-200 shadow-2xs group-hover:border-slate-300 group-hover:shadow-sm'
                  }`}
                >
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={aisle.name}
                      className={`w-full h-full object-contain transition-transform duration-200 group-hover:scale-105 ${
                        isSelected ? 'brightness-110 drop-shadow-sm' : 'mix-blend-multiply'
                      }`}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {/* Aisle Name Underneath */}
                <span
                  className={`text-[11px] sm:text-xs text-center leading-tight line-clamp-1 max-w-[80px] transition-colors font-sans ${
                    isSelected
                      ? 'font-black text-slate-950'
                      : 'font-semibold text-slate-600 group-hover:text-black'
                  }`}
                >
                  {aisle.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Arrow with Soft Gradient Fade */}
        <div className="hidden md:flex absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent z-10 items-center justify-end pointer-events-none">
          <button
            type="button"
            onClick={() => scrollCategories('right')}
            className="pointer-events-auto w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-black hover:bg-slate-50 transition-all cursor-pointer"
            title="Scroll aisles right"
            aria-label="Scroll aisles right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Secondary Sticky Filter Chips Strip (Checkers/PnP style) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs font-sans w-full">
        <button
          type="button"
          onClick={() => setActiveSecondaryFilter('all')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer border ${
            activeSecondaryFilter === 'all'
              ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          All Items ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSecondaryFilter('specials')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeSecondaryFilter === 'specials'
              ? 'bg-[#FFE600] text-slate-950 border-yellow-400 font-black shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Tag className="w-3.5 h-3.5 text-amber-600" />
          <span>Specials Only ({filterCounts.specials})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSecondaryFilter('multibuys')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeSecondaryFilter === 'multibuys'
              ? 'bg-[#004D40] text-[#FFE600] border-[#004D40] font-black shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-teal-600" />
          <span>Multi-Buys (Buy 2...) ({filterCounts.multibuys})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSecondaryFilter('drops')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeSecondaryFilter === 'drops'
              ? 'bg-emerald-700 text-white border-emerald-700 font-black shadow-xs'
              : 'bg-white text-emerald-800 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
          <span>Price Drops &lt;30d ({filterCounts.drops})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSecondaryFilter('tracked')}
          className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
            activeSecondaryFilter === 'tracked'
              ? 'bg-slate-950 text-[#FFE600] border-slate-950 font-black shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${activeSecondaryFilter === 'tracked' ? 'fill-[#FFE600] text-[#FFE600]' : 'text-slate-400'}`} />
          <span>Saved Staples ({filterCounts.tracked})</span>
        </button>

        {/* Dietary Badges */}
        <span className="w-px h-4 bg-slate-300 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => setActiveSecondaryFilter(activeSecondaryFilter === 'halaal' ? 'all' : 'halaal')}
          className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border font-sans ${
            activeSecondaryFilter === 'halaal'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Halaal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSecondaryFilter(activeSecondaryFilter === 'vegan' ? 'all' : 'vegan')}
          className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border font-sans ${
            activeSecondaryFilter === 'vegan'
              ? 'bg-green-600 text-white border-green-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Leaf className="w-3.5 h-3.5" />
          <span>Vegan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSecondaryFilter(activeSecondaryFilter === 'gluten_free' ? 'all' : 'gluten_free')}
          className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border font-sans ${
            activeSecondaryFilter === 'gluten_free'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Gluten-Free</span>
        </button>
      </div>

      {/* 3. Utility Toolbar: Aisle Header + Sort Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-1 pb-1.5 border-b border-slate-200 font-sans w-full max-w-full">
        {/* Left: Bold Aisle Title & Count */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base sm:text-lg font-black text-slate-950 font-display uppercase tracking-tight">
            {selectedCategoryFilter === 'All' ? 'All Groceries' : selectedCategoryFilter}
            <span className="ml-2 text-xs font-bold text-slate-500 normal-case font-sans">
              ({processedProducts.length} {processedProducts.length === 1 ? 'item' : 'items'})
            </span>
          </h3>

          {/* Active search chip */}
          {activeSearch && (
            <span className="bg-[#FFE600] text-slate-950 px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans shadow-2xs">
              "{activeSearch}"
            </span>
          )}

          {/* Reset button if any filter is active */}
          {(activeSearch || selectedCategoryFilter !== 'All' || selectedStoreFilter !== 'all' || activeSecondaryFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                onClearSearch?.();
                setInternalSearch('');
                onSelectCategoryFilter?.('All');
                onSelectStoreFilter?.('all');
                setActiveSecondaryFilter('all');
              }}
              className="text-[11px] text-slate-500 hover:text-black underline font-sans font-semibold cursor-pointer ml-1"
            >
              Reset all filters
            </button>
          )}
        </div>

        {/* Right: Sort Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-950 cursor-pointer shadow-2xs font-sans"
            aria-label="Sort products"
          >
            <option value="popular">Sort: Most Popular</option>
            <option value="bestTimeToBuy">Sort: Best Price Drops (Stock Up)</option>
            <option value="lowestPrice">Sort: Price (Low to High)</option>
            <option value="biggestSavings">Sort: Highest Multi-Store Savings</option>
            <option value="name">Sort: Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 4. Tactile Supermarket Product Grid - Pure White Cards, 1px Border, Soft Elevation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {processedProducts.map((product) => {
          const basketQty = getBasketQty(product.id);

          // Find cheapest price & other competitor prices
          const validPrices = product.prices.filter(pr => pr.inStock && pr.price > 0);
          const sortedPrices = [...validPrices].sort((a, b) => a.price - b.price);
          const cheapest = sortedPrices[0];
          const secondCheapest = sortedPrices[1];
          const highest = sortedPrices[sortedPrices.length - 1];
          const bestRetailer = cheapest ? RETAILER_THEMES[cheapest.storeId] : null;

          // Normalized Unit Price (e.g. R14.95 / L or R39.20 / kg)
          const unitPriceInfo = calculateNormalizedUnitPrice(cheapest?.price || 0, product.unit);

          // Regular price calculation (for strikethrough if on special)
          const hasPromo = cheapest?.onSpecial || (highest && highest.price > cheapest.price * 1.08);
          const strikethroughPrice = cheapest?.onSpecial 
            ? Math.round(cheapest.price * 1.18 * 100) / 100
            : (highest && highest.price > cheapest.price * 1.05 ? highest.price : null);

          // Promotional Badge text - Authentic SA Loyalty tags that never truncate
          const promoBadgeText = hasPromo ? getShortDealBadge(cheapest?.storeId, cheapest?.specialDetail) : '';

          // Timing analysis for stock up callout
          const timing = timingAnalyses.get(product.id);

          return (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200/90 p-3.5 flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-200 shadow-2xs group relative"
              id={`product-card-${product.id}`}
            >
              <div>
                {/* Product Image Packshot Box with Badges */}
                <div 
                  onClick={() => setInspectProduct(product)}
                  className="relative aspect-square w-full rounded-lg bg-slate-50/80 p-3 mb-2.5 flex items-center justify-center cursor-pointer group-hover:bg-slate-100/60 transition-colors"
                >
                  {/* Top-Left Promotional Badge */}
                  {promoBadgeText ? (
                    <span 
                      className={`absolute top-2 left-2 z-10 text-[10px] font-sans font-bold whitespace-nowrap px-2 py-0.5 rounded shadow-xs ${
                        bestRetailer ? `${bestRetailer.badgeBg} ${bestRetailer.badgeText}` : 'bg-slate-950 text-white'
                      }`}
                    >
                      {promoBadgeText}
                    </span>
                  ) : timing?.status === 'buy' ? (
                    <span className="absolute top-2 left-2 z-10 text-[10px] font-sans font-bold whitespace-nowrap px-2 py-0.5 rounded bg-emerald-700 text-white shadow-xs">
                      Best Drop
                    </span>
                  ) : null}

                  {/* Top-Right Staple Watchlist / LocalStorage Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTrackStaple(product.id);
                      setTrackedIds(getTrackedStapleIds());
                    }}
                    className={`absolute top-2 right-2 p-1.5 rounded-md border transition-all z-10 cursor-pointer ${
                      trackedIds.includes(product.id)
                        ? 'bg-slate-950 text-[#FFE600] border-slate-950 shadow-xs'
                        : 'bg-white/95 hover:bg-white text-slate-400 hover:text-slate-950 border-slate-200 shadow-2xs'
                    }`}
                    title={trackedIds.includes(product.id) ? "Saved in Local Storage (Tracking)" : "Track price drops for this staple"}
                    aria-label="Track staple"
                  >
                    {trackedIds.includes(product.id) ? (
                      <BookmarkCheck className="w-3.5 h-3.5 text-[#FFE600]" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Packshot Image */}
                  <img
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}
                    alt={product.name}
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/200x200?text=${encodeURIComponent(product.name.charAt(0))}`;
                    }}
                  />

                  {/* Bottom-Right Pack Size Pill */}
                  {product.unit && (
                    <span className="absolute bottom-1.5 right-1.5 text-[10px] font-sans bg-white/95 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 font-bold shadow-2xs">
                      {product.unit}
                    </span>
                  )}
                </div>

                {/* Product Title & Category */}
                <div className="mb-2">
                  <span className="text-[10px] font-sans font-semibold text-slate-500 block mb-0.5">
                    {product.category}
                  </span>
                  <h4 
                    onClick={() => setInspectProduct(product)}
                    className="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug line-clamp-2 hover:text-black cursor-pointer font-sans group-hover:text-slate-950"
                  >
                    {product.name}
                  </h4>
                </div>

                {/* Hero Pricing Row */}
                <div className="pt-2 border-t border-slate-100 mb-3 space-y-1">
                  <div className="flex items-baseline justify-between gap-1 flex-wrap">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-slate-950 font-sans tracking-tight tabular-nums">
                        R{cheapest ? cheapest.price.toFixed(2) : '--'}
                      </span>
                      {strikethroughPrice && strikethroughPrice > (cheapest?.price || 0) && (
                        <span className="text-xs text-slate-400 line-through font-sans font-semibold tabular-nums">
                          R{strikethroughPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Winning Store Badge */}
                    {bestRetailer && (
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded font-sans uppercase tracking-tight shadow-2xs ${bestRetailer.badgeBg} ${bestRetailer.badgeText}`}>
                        {bestRetailer.shortName}
                      </span>
                    )}
                  </div>

                  {/* Normalized Unit Price (R/L, R/kg, etc.) */}
                  {unitPriceInfo && (
                    <div className="text-[10px] font-sans font-semibold text-slate-500">
                      {unitPriceInfo.formatted}
                    </div>
                  )}

                  {/* 7-Store Comparison Rank Indicator (Checkers vs Competitors Sparkline) */}
                  <div 
                    onClick={() => setInspectProduct(product)}
                    className="pt-1.5 cursor-pointer"
                    title="Click to view all 7 stores price comparison"
                  >
                    <div className="flex items-center gap-1">
                      {sortedPrices.slice(0, 5).map((pr, i) => {
                        const r = RETAILER_THEMES[pr.storeId];
                        return (
                          <div
                            key={pr.storeId}
                            className={`h-1.5 rounded-full flex-1 transition-all ${
                              i === 0 
                                ? 'bg-emerald-500 ring-1 ring-emerald-600' 
                                : 'bg-slate-200 hover:bg-slate-300'
                            }`}
                            title={`${r?.shortName || pr.storeId}: R${pr.price.toFixed(2)}`}
                          />
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-sans font-medium text-slate-500 mt-1">
                      <span className="text-emerald-700 font-bold truncate">
                        Lowest at {bestRetailer?.shortName || cheapest?.storeId}
                      </span>
                      {secondCheapest && (
                        <span className="text-slate-400">
                          +R{(secondCheapest.price - (cheapest?.price || 0)).toFixed(2)} next
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Add / Morphing Stepper + Compare Link */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                {basketQty > 0 ? (
                  <div className="flex-1 flex items-center justify-between bg-slate-950 text-white rounded-lg p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, -1)}
                      className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-[#FFE600] active:scale-95 transition-all cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                    <span className="font-sans font-black text-xs text-white px-2">
                      {basketQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(product.id, 1)}
                      className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-[#FFE600] active:scale-95 transition-all cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => addToBasket(product.id)}
                    className="flex-1 py-2 px-3 rounded-lg bg-[#FFE600] hover:bg-yellow-400 active:scale-98 text-slate-950 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 font-sans border border-yellow-400 shadow-2xs hover:shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add to Basket</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setInspectProduct(product)}
                  className="px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-950 text-[11px] font-bold font-sans transition-colors cursor-pointer shrink-0"
                  title="Compare all 7 supermarkets"
                >
                  Compare
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty Search State */}
        {processedProducts.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200 p-8 space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-base font-sans">
              No products found matching "{activeSearch}"
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
              Try searching for staple groceries like Clover milk, Albany bread, Sunfoil oil, or large eggs.
            </p>
            <button
              type="button"
              onClick={() => {
                onClearSearch?.();
                setInternalSearch('');
                onSelectCategoryFilter?.('All');
                setActiveSecondaryFilter('all');
              }}
              className="mt-2 px-4 py-2 rounded-lg bg-[#FFE600] text-slate-950 font-bold text-xs font-sans cursor-pointer shadow-xs"
            >
              View All Products
            </button>
          </div>
        )}
      </div>

      {/* 5. Product Deep Comparison Modal / Bottom Sheet */}
      <AnimatePresence>
        {inspectProduct && (
          <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectProduct(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal / Bottom Sheet Box */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="bg-white rounded-t-2xl sm:rounded-xl p-5 sm:p-6 max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative z-10 border border-slate-200 space-y-5 font-sans"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={inspectProduct.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120'}
                    alt={inspectProduct.name}
                    className="w-14 h-14 rounded-lg object-contain bg-slate-50 p-2 border border-slate-200 shrink-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block font-sans">
                      {inspectProduct.category} • {inspectProduct.unit}
                    </span>
                    <h3 className="text-base font-bold text-slate-950 leading-tight font-sans">
                      {inspectProduct.name}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectProduct(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-black transition-all cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Best Time to Buy Predictor Breakdown */}
              {(() => {
                const analysis = timingAnalyses.get(inspectProduct.id) || analyzePriceTiming(inspectProduct);
                const isTracked = trackedIds.includes(inspectProduct.id);
                return (
                  <StapleTimingSection
                    product={inspectProduct}
                    analysis={analysis}
                    isTracked={isTracked}
                    onToggleTrack={(prodId) => {
                      toggleTrackStaple(prodId);
                      setTrackedIds(getTrackedStapleIds());
                    }}
                  />
                );
              })()}

              {/* 7-Store Comparison Table with Deep Links & Proximity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 font-sans tracking-tight">
                    Price Comparison Across 7 Stores
                  </h5>
                  {onOpenNearbyStores && (
                    <button
                      type="button"
                      onClick={() => onOpenNearbyStores()}
                      className="text-[11px] font-sans font-medium text-slate-600 hover:text-black flex items-center gap-1 cursor-pointer underline"
                    >
                      <Navigation className="w-3 h-3 text-slate-500" />
                      <span>Nearby Supermarket Branches</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 font-sans">
                  {(() => {
                    const sorted = [...inspectProduct.prices].sort((a, b) => a.price - b.price);
                    const lowestPrice = sorted[0]?.price || 0;

                    return sorted.map((pr, idx) => {
                      const retailer = RETAILER_THEMES[pr.storeId];
                      const isLowest = idx === 0;
                      const diffFromLowest = pr.price - lowestPrice;
                      const diffPercent = lowestPrice > 0 ? (diffFromLowest / lowestPrice) * 100 : 0;
                      const storeDeepLink = retailer?.appDeepLinkPrefix ? `${retailer.appDeepLinkPrefix}${encodeURIComponent(inspectProduct.name)}` : null;
                      const nearestBranch = getNearestBranchForStore(userCoords, pr.storeId);

                      return (
                        <div
                          key={pr.storeId}
                          className={`p-3 rounded-lg flex items-center justify-between border transition-all ${
                            isLowest 
                              ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/30' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-sans font-bold ${
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
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold ${retailer.badgeBg} ${retailer.badgeText}`}>
                                    {retailer.loyaltyProgram}
                                  </span>
                                )}
                              </div>
                              {pr.onSpecial && (
                                <span className="text-[10.5px] font-bold text-amber-700 font-sans flex items-center gap-1 mt-0.5">
                                  <Tag className="w-3 h-3" />
                                  {pr.specialDetail || 'Special Deal'}
                                </span>
                              )}
                              {nearestBranch && (
                                <span className="text-[10px] text-slate-500 font-sans flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{nearestBranch.distanceFormatted}</span>
                                  <span className="text-slate-400">• {nearestBranch.mallOrCenter}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-3">
                            <div>
                              <span className={`text-sm font-black font-sans ${isLowest ? 'text-emerald-700' : 'text-slate-950'}`}>
                                R{pr.price.toFixed(2)}
                              </span>
                              {isLowest ? (
                                <span className="block text-[9.5px] font-bold text-emerald-700 uppercase font-sans">
                                  Cheapest
                                </span>
                              ) : (
                                <span className="block text-[9.5px] font-sans text-slate-400">
                                  +{diffPercent.toFixed(1)}% (+R{diffFromLowest.toFixed(2)})
                                </span>
                              )}
                            </div>

                            {/* Store Deep Link */}
                            {storeDeepLink && (
                              <a
                                href={storeDeepLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-slate-400 hover:text-slate-950 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                title={`Open on ${retailer?.name || pr.storeId}`}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Price History Chart */}
              <div>
                <PriceHistoryChart product={inspectProduct} />
              </div>

              {/* Modal Actions: Add to Basket + Discrepancy Link */}
              <div className="pt-2 border-t border-slate-200 space-y-3 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    addToBasket(inspectProduct.id);
                    setInspectProduct(null);
                  }}
                  className="w-full py-3 rounded-lg bg-[#FFE600] hover:bg-yellow-400 text-slate-950 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 border border-yellow-400 shadow-xs"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add {inspectProduct.name} to Basket</span>
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      const prodToReport = inspectProduct;
                      setInspectProduct(null);
                      onReportDiscrepancy?.(prodToReport);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-700 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Price discrepancy? Report to community</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
