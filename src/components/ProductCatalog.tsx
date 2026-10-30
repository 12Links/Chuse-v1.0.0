import React, { useState, useMemo } from 'react';
import { Product, StoreId, BasketItem } from '../types';
import { STORES } from '../data/catalog';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  ArrowUpDown, 
  X,
  AlertCircle
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
  onReportDiscrepancy?: (product: Product) => void;
}

// Brand color styles for store badges
const STORE_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  checkers: { bg: 'bg-[#008374] text-white', text: 'text-[#008374]', label: 'Checkers' },
  pnp: { bg: 'bg-[#002B49] text-white', text: 'text-[#002B49]', label: 'Pick n Pay' },
  woolworths: { bg: 'bg-black text-white', text: 'text-black', label: 'Woolworths' },
  shoprite: { bg: 'bg-[#D61B28] text-white', text: 'text-[#D61B28]', label: 'Shoprite' },
  spar: { bg: 'bg-[#007A3D] text-white', text: 'text-[#007A3D]', label: 'SPAR' },
  boxer: { bg: 'bg-[#FF6A13] text-white', text: 'text-[#FF6A13]', label: 'Boxer' },
  foodlovers: { bg: 'bg-[#557A18] text-white', text: 'text-[#557A18]', label: "Food Lover's" },
};

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
  onReportDiscrepancy
}: ProductCatalogProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortBy, setSortBy] = useState<'lowestPrice' | 'biggestSavings' | 'name' | 'popular'>('popular');
  const [inspectProduct, setInspectProduct] = useState<Product | null>(null);

  // Use external search term if provided, otherwise internal
  const activeSearch = externalSearchTerm || internalSearch;

  const dynamicCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['All', ...cats.sort()];
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
    <div id="product-catalog-view" className="space-y-4">
      {/* Category Scrolling Bar & Sort Controls */}
      <div className="bg-[#FFFFFF] rounded-[6px] p-3.5 sm:p-4 border border-[#E2E0D8] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category scrolling tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
            {dynamicCategories.map((cat) => {
              const isSelected = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategoryFilter?.(cat)}
                  className={`px-3 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap transition-all cursor-pointer font-sans ${
                    isSelected
                      ? 'bg-slate-950 text-white font-black'
                      : 'bg-[#F7F6F0] text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto font-sans">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 hidden sm:inline flex items-center gap-1 font-mono">
              <ArrowUpDown className="w-3 h-3" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-[4px] bg-[#F7F6F0] border border-[#E2E0D8] text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="lowestPrice">Price: Low to High</option>
              <option value="biggestSavings">Highest Store Savings</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter status strip */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-[#E2E0D8] font-sans">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{processedProducts.length} items in view</span>
            {activeSearch && (
              <span className="bg-[#FFE600] text-black px-2 py-0.5 rounded-[2px] text-[10px] font-black uppercase font-mono">
                "{activeSearch}"
              </span>
            )}
            {selectedCategoryFilter !== 'All' && (
              <span className="text-slate-600 text-[11px] font-medium">
                • {selectedCategoryFilter}
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
              className="text-[11px] text-slate-600 hover:text-black underline cursor-pointer font-medium"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Tactile Supermarket Product Grid - Crisp 6px corners & clean typography */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {processedProducts.map((product) => {
          const basketQty = getBasketQty(product.id);

          // Find cheapest price & other competitor prices
          const validPrices = product.prices.filter(pr => pr.inStock && pr.price > 0);
          const sortedPrices = [...validPrices].sort((a, b) => a.price - b.price);
          const cheapest = sortedPrices[0];
          const secondCheapest = sortedPrices[1];
          const highest = sortedPrices[sortedPrices.length - 1];
          const bestBadge = cheapest ? STORE_BADGE_STYLES[cheapest.storeId] : null;

          // Single muted competitor comparison summary
          let comparisonSummary = '';
          if (secondCheapest && highest && highest.price > cheapest.price) {
            const secondBadge = STORE_BADGE_STYLES[secondCheapest.storeId]?.label || secondCheapest.storeId;
            const highBadge = STORE_BADGE_STYLES[highest.storeId]?.label || highest.storeId;
            if (sortedPrices.length === 2) {
              comparisonSummary = `R${highest.price.toFixed(2)} at ${highBadge}`;
            } else {
              comparisonSummary = `R${secondCheapest.price.toFixed(2)} at ${secondBadge} · Up to R${highest.price.toFixed(2)} at ${highBadge}`;
            }
          }

          return (
            <div
              key={product.id}
              className="bg-[#FFFFFF] rounded-[6px] border border-[#E2E0D8] p-3.5 flex flex-col justify-between hover:border-slate-400 transition-all duration-150 shadow-2xs"
              id={`product-card-${product.id}`}
            >
              <div>
                {/* Product Image Container */}
                <div 
                  onClick={() => setInspectProduct(product)}
                  className="relative aspect-square w-full rounded-[4px] bg-[#F7F6F0] p-3 mb-2.5 flex items-center justify-center cursor-pointer group"
                >
                  <img
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300'}
                    alt={product.name}
                    className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/200x200?text=${encodeURIComponent(product.name.charAt(0))}`;
                    }}
                  />
                  {product.unit && (
                    <span className="absolute bottom-1.5 right-1.5 text-[9.5px] font-mono bg-white/95 text-slate-700 px-1.5 py-0.5 rounded-[2px] border border-[#E2E0D8] font-bold">
                      {product.unit}
                    </span>
                  )}
                </div>

                {/* Product Title */}
                <div className="mb-2">
                  <span className="text-[9.5px] font-mono text-slate-400 uppercase tracking-widest block mb-0.5">
                    {product.category}
                  </span>
                  <h4 
                    onClick={() => setInspectProduct(product)}
                    className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 hover:underline cursor-pointer font-sans"
                  >
                    {product.name}
                  </h4>
                </div>

                {/* Lead with ONE Winning Price */}
                <div className="pt-2 border-t border-[#E2E0D8] mb-3">
                  <div className="flex items-baseline justify-between gap-1 mb-1">
                    <span className="text-lg font-black text-slate-950 font-mono tracking-tight tabular-nums">
                      R{cheapest ? cheapest.price.toFixed(2) : '--'}
                    </span>
                    {bestBadge && (
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-[2px] uppercase font-mono ${bestBadge.bg}`}>
                        {bestBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Muted Competitor Line */}
                  {comparisonSummary ? (
                    <p 
                      onClick={() => setInspectProduct(product)}
                      className="text-[10.5px] text-slate-500 font-mono truncate cursor-pointer hover:underline"
                      title="Click to compare all 7 stores"
                    >
                      {comparisonSummary}
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-slate-400 font-mono">
                      Single store available
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons: Add / Stepper + Compare Link */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#E2E0D8]">
                {basketQty > 0 ? (
                  <div className="flex-1 flex items-center justify-between bg-slate-950 text-white rounded-[4px] p-1">
                    <button
                      onClick={() => updateQuantity(product.id, -1)}
                      className="w-6 h-6 rounded-[2px] hover:bg-slate-800 flex items-center justify-center text-[#FFE600] active:scale-95 transition-all cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-xs">
                      {basketQty} in basket
                    </span>
                    <button
                      onClick={() => updateQuantity(product.id, 1)}
                      className="w-6 h-6 rounded-[2px] hover:bg-slate-800 flex items-center justify-center text-[#FFE600] active:scale-95 transition-all cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToBasket(product.id)}
                    className="flex-1 py-2 px-3 rounded-[4px] bg-[#FFE600] hover:bg-yellow-400 active:scale-98 text-black font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 font-sans"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add to Basket</span>
                  </button>
                )}

                <button
                  onClick={() => setInspectProduct(product)}
                  className="px-2.5 py-2 rounded-[4px] border border-[#E2E0D8] bg-[#F7F6F0] hover:bg-slate-200 text-slate-700 text-[11px] font-bold font-mono transition-colors cursor-pointer"
                  title="Compare all 7 stores"
                >
                  Compare
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty Search State */}
        {processedProducts.length === 0 && (
          <div className="col-span-full py-16 text-center bg-[#FFFFFF] rounded-[6px] border border-[#E2E0D8] p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#F7F6F0] flex items-center justify-center text-slate-400 mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm font-sans">
              No products found matching "{activeSearch}"
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
              Try searching for basic grocery staples like milk, bread, sunflower oil, eggs, or rice.
            </p>
          </div>
        )}
      </div>

      {/* Product Deep Comparison Modal with "Report Discrepancy" */}
      <AnimatePresence>
        {inspectProduct && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectProduct(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-white rounded-[6px] p-5 sm:p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl relative z-10 border border-[#E2E0D8] space-y-5"
            >
              <div className="flex items-start justify-between border-b border-[#E2E0D8] pb-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={inspectProduct.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120'}
                    alt={inspectProduct.name}
                    className="w-14 h-14 rounded-[4px] object-contain bg-[#F7F6F0] p-2 border border-[#E2E0D8] shrink-0"
                  />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                      {inspectProduct.category} • {inspectProduct.unit}
                    </span>
                    <h3 className="text-base font-bold text-slate-950 leading-tight font-sans">
                      {inspectProduct.name}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setInspectProduct(null)}
                  className="w-8 h-8 rounded-[4px] bg-[#F7F6F0] flex items-center justify-center text-slate-500 hover:text-black transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 7-Store Comparison Table */}
              <div className="space-y-2">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  Store Price Breakdown
                </h5>
                <div className="space-y-1.5 font-sans">
                  {[...inspectProduct.prices].sort((a, b) => a.price - b.price).map((pr, idx) => {
                    const store = STORES.find(s => s.id === pr.storeId);
                    const isLowest = idx === 0;
                    return (
                      <div
                        key={pr.storeId}
                        className={`p-3 rounded-[4px] flex items-center justify-between border ${
                          isLowest 
                            ? 'bg-[#F0FDF4] border-emerald-300' 
                            : 'bg-[#F7F6F0] border-[#E2E0D8]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-[2px] flex items-center justify-center text-[10px] font-mono font-bold ${
                            isLowest ? 'bg-emerald-700 text-white' : 'bg-slate-300 text-slate-800'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block font-sans">
                              {store?.name || pr.storeId}
                            </span>
                            {pr.onSpecial && (
                              <span className="text-[10px] font-bold text-amber-700 font-mono">
                                {pr.specialDetail || 'Special Deal'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-sm font-black font-mono ${isLowest ? 'text-emerald-700' : 'text-slate-900'}`}>
                            R{pr.price.toFixed(2)}
                          </span>
                          {isLowest && (
                            <span className="block text-[9px] font-bold text-emerald-700 uppercase font-mono">
                              Cheapest
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

              {/* Modal Actions: Add to Basket + Subtle Report Discrepancy Link */}
              <div className="pt-2 border-t border-[#E2E0D8] space-y-3 font-sans">
                <button
                  onClick={() => {
                    addToBasket(inspectProduct.id);
                    setInspectProduct(null);
                  }}
                  className="w-full py-3 rounded-[4px] bg-[#FFE600] hover:bg-yellow-400 text-black font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add {inspectProduct.name} to Basket</span>
                </button>

                {/* Subtle Discrepancy Report Link */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      const prodToReport = inspectProduct;
                      setInspectProduct(null);
                      onReportDiscrepancy?.(prodToReport);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-700 underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Wrong price? Report discrepancy</span>
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
