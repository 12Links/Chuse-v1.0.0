import React, { useState, useMemo } from 'react';
import { Product, Store, StoreId, BasketItem } from '../types';
import { STORES } from '../data/catalog';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Heart, 
  Sparkles, 
  TrendingDown, 
  ArrowUpDown, 
  Check, 
  SlidersHorizontal,
  ChevronRight,
  Info,
  Percent,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PriceHistoryChart } from './PriceHistoryChart';

interface ProductCatalogProps {
  products: Product[];
  basket: BasketItem[];
  addToBasket: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromBasket: (productId: string) => void;
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
}

// Brand color styles for store badges
const STORE_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  checkers: { bg: 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800', text: 'text-teal-700', label: 'Checkers' },
  pnp: { bg: 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800', text: 'text-rose-800', label: 'Pick n Pay' },
  woolworths: { bg: 'bg-neutral-100 border-neutral-300 text-neutral-900 dark:bg-neutral-800 dark:text-white dark:border-neutral-700', text: 'text-neutral-900', label: 'Woolworths' },
  shoprite: { bg: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800', text: 'text-red-600', label: 'Shoprite' },
  spar: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800', text: 'text-emerald-700', label: 'SPAR' },
  boxer: { bg: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800', text: 'text-orange-700', label: 'Boxer' },
  foodlovers: { bg: 'bg-lime-50 border-lime-200 text-lime-900 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-800', text: 'text-lime-800', label: "Food Lover's" },
};

export default function ProductCatalog({
  products,
  basket,
  addToBasket,
  updateQuantity,
  removeFromBasket,
  onSearchRealTime,
  isSearchingRealTime,
  searchError,
  externalSearchTerm = '',
  onClearSearch,
  selectedStoreFilter = 'all',
  onSelectStoreFilter,
  selectedCategoryFilter = 'All',
  onSelectCategoryFilter,
  onOpenCart
}: ProductCatalogProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortBy, setSortBy] = useState<'lowestPrice' | 'biggestSavings' | 'name' | 'popular'>('popular');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);

  // Use external search term if provided, otherwise internal
  const activeSearch = externalSearchTerm || internalSearch;

  const dynamicCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['All', ...cats.sort()];
  }, [products]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

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
        if (selectedCategoryFilter !== 'All' && p.category !== selectedCategoryFilter) {
          return false;
        }

        // Store matching
        if (selectedStoreFilter !== 'all') {
          const hasInStore = p.prices.some(pr => pr.storeId === selectedStoreFilter && pr.inStock && pr.price > 0);
          if (!hasInStore) return false;
        }

        return true;
      })
      .sort((a, b) => {
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
  }, [products, activeSearch, selectedCategoryFilter, selectedStoreFilter, sortBy]);

  return (
    <div id="product-catalog-view" className="space-y-6">
      {/* Category Pills & Sorting Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        {/* Top Control Bar: Category scrolling + Sort dropdown */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category scrolling pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1">
            {dynamicCategories.map((cat) => {
              const isSelected = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategoryFilter?.(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-950 dark:bg-[#FFE600] text-[#FFE600] dark:text-black border-transparent shadow-xs scale-[1.02]'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200/70 dark:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer shadow-2xs"
            >
              <option value="popular">Most Popular Staples</option>
              <option value="lowestPrice">Price: Low to High</option>
              <option value="biggestSavings">Highest Store Savings (ZAR)</option>
              <option value="name">Product Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Search Active Indicator / Result Count */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Showing {processedProducts.length} items
            </span>
            {activeSearch && (
              <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                Matching "{activeSearch}"
              </span>
            )}
            {selectedCategoryFilter !== 'All' && (
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[11px] font-medium">
                {selectedCategoryFilter}
              </span>
            )}
          </div>

          {(activeSearch || selectedCategoryFilter !== 'All' || selectedStoreFilter !== 'all') && (
            <button
              onClick={() => {
                onClearSearch?.();
                setInternalSearch('');
                onSelectCategoryFilter?.('All');
                onSelectStoreFilter?.('all');
              }}
              className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Modern E-Commerce Retail Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {processedProducts.map((product, index) => {
          const basketQty = getBasketQty(product.id);
          const isFavorited = favorites.includes(product.id);

          // Find cheapest price & highest price for comparison
          const validPrices = product.prices.filter(pr => pr.inStock && pr.price > 0);
          const sortedPrices = [...validPrices].sort((a, b) => a.price - b.price);
          const cheapest = sortedPrices[0];
          const highest = sortedPrices[sortedPrices.length - 1];
          const bestStore = cheapest ? STORES.find(s => s.id === cheapest.storeId) : null;
          const bestBadge = cheapest ? STORE_BADGE_STYLES[cheapest.storeId] : null;

          const savingsAmount = (cheapest && highest && highest.price > cheapest.price)
            ? highest.price - cheapest.price
            : 0;

          const savingsPercent = (cheapest && highest && highest.price > cheapest.price)
            ? Math.round(((highest.price - cheapest.price) / highest.price) * 100)
            : 0;

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(24, index) * 0.02 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 relative group overflow-hidden"
              id={`product-card-${product.id}`}
            >
              <div>
                {/* Image & Badges Container */}
                <div className="relative aspect-square w-full rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 mb-3.5 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800">
                  {/* Discount / Savings Ribbon */}
                  {savingsPercent > 5 ? (
                    <div className="absolute top-2.5 left-2.5 bg-rose-500 text-white text-[9.5px] font-black px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 z-10">
                      <Percent className="w-2.5 h-2.5 stroke-[3]" />
                      <span>SAVE {savingsPercent}%</span>
                    </div>
                  ) : product.isPopular ? (
                    <div className="absolute top-2.5 left-2.5 bg-amber-400 text-slate-950 text-[9.5px] font-black px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1 z-10">
                      <Sparkles className="w-2.5 h-2.5 fill-black" />
                      <span>TOP STAPLE</span>
                    </div>
                  ) : null}

                  {/* Favorite button */}
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all cursor-pointer shadow-2xs z-10"
                    title="Add to favorites"
                  >
                    <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  {/* Product Image with Zoom on hover */}
                  <img
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}
                    alt={product.name}
                    className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-108 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/200x200?text=${encodeURIComponent(product.name.charAt(0))}`;
                    }}
                  />
                </div>

                {/* Product Metadata */}
                <div className="space-y-1 mb-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                    <span>{product.category}</span>
                    <span className="font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9.5px]">
                      {product.unit}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                    {product.name}
                  </h4>
                </div>

                {/* The Price Hero Bento: Prominent Lowest Price */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 space-y-1.5 mb-3.5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                        Best Retail Price
                      </span>
                      <span className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                        R{cheapest ? cheapest.price.toFixed(2) : '--'}
                      </span>
                    </div>

                    {bestBadge && (
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border ${bestBadge.bg} shadow-2xs`}>
                        at {bestBadge.label}
                      </span>
                    )}
                  </div>

                  {savingsAmount > 0 && (
                    <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold">
                      <TrendingDown className="w-3 h-3" />
                      <span>Save R{savingsAmount.toFixed(2)} vs highest</span>
                    </div>
                  )}

                  {/* Multi-Store Comparison Matrix Micro Pills */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 grid grid-cols-3 gap-1 text-[9px] font-mono">
                    {product.prices.slice(0, 6).map(pr => {
                      const isBest = cheapest && pr.storeId === cheapest.storeId;
                      return (
                        <div
                          key={pr.storeId}
                          className={`px-1.5 py-0.5 rounded text-center truncate ${
                            isBest 
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black' 
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                          title={`${pr.storeId}: R${pr.price}`}
                        >
                          <span className="uppercase text-[8px] opacity-75">{pr.storeId.slice(0, 4)}:</span> R{pr.price.toFixed(0)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Actions: Stepper / Compare */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                {basketQty > 0 ? (
                  <div className="flex-1 flex items-center justify-between bg-slate-950 text-white rounded-2xl p-1 shadow-sm">
                    <button
                      onClick={() => updateQuantity(product.id, -1)}
                      className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-[#FFE600] active:scale-95 transition-all cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-black text-xs text-white">
                      {basketQty} in basket
                    </span>
                    <button
                      onClick={() => updateQuantity(product.id, 1)}
                      className="w-8 h-8 rounded-xl hover:bg-slate-800 flex items-center justify-center text-[#FFE600] active:scale-95 transition-all cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      addToBasket(product.id);
                    }}
                    className="flex-1 py-3 px-4 rounded-2xl bg-[#FFE600] hover:bg-yellow-400 active:scale-98 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Compare</span>
                  </button>
                )}

                <button
                  onClick={() => setInspectProduct(product)}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
                  title="View Store Breakdown & History"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}

        {/* Empty State */}
        {processedProducts.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
              <Search className="w-8 h-8 opacity-60" />
            </div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              <h4 className="font-black text-slate-800 dark:text-slate-200 text-base">
                No Supermarket Products Found
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                We couldn't find items matching "{activeSearch}". Try searching for staple terms like "milk", "bread", "oil", or "chicken".
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              {['Milk 2L', 'White Bread', 'Sunflower Oil', 'Tastic Rice', 'Cereal', 'Sugar'].map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setInternalSearch(tag);
                  }}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#FFE600] hover:text-black text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product Deep Comparison Modal */}
      <AnimatePresence>
        {inspectProduct && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectProduct(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 border border-slate-200 dark:border-slate-800 space-y-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={inspectProduct.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120'}
                    alt={inspectProduct.name}
                    className="w-16 h-16 rounded-2xl object-contain bg-slate-50 dark:bg-slate-800 p-2 border border-slate-100 dark:border-slate-700 shrink-0"
                  />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      {inspectProduct.category} • {inspectProduct.unit}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                      {inspectProduct.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setInspectProduct(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-black dark:hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Store breakdown list */}
              <div className="space-y-2">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Live Price Comparison across 7 Stores
                </h5>
                <div className="space-y-2">
                  {[...inspectProduct.prices].sort((a, b) => a.price - b.price).map((pr, idx) => {
                    const store = STORES.find(s => s.id === pr.storeId);
                    const isLowest = idx === 0;
                    return (
                      <div
                        key={pr.storeId}
                        className={`p-3.5 rounded-2xl flex items-center justify-between border ${
                          isLowest 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' 
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                            isLowest ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">
                              {store?.name || pr.storeId}
                            </span>
                            {pr.onSpecial && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                {pr.specialDetail || 'Special Deal'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-base font-black font-mono ${isLowest ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                            R{pr.price.toFixed(2)}
                          </span>
                          {isLowest && (
                            <span className="block text-[9.5px] font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                              Cheapest Option
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price History Chart */}
              <div>
                <PriceHistoryChart product={inspectProduct} />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    addToBasket(inspectProduct.id);
                    setInspectProduct(null);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-[#FFE600] hover:bg-yellow-400 text-black font-black text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add {inspectProduct.name} to Basket</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
