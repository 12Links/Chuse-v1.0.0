import React, { useState } from 'react';
import { Product, Store, StoreId, BasketItem } from '../types';
import { STORES } from '../data/catalog';
import { Search, Grid, List as ListIcon, ShoppingCart, Plus, Minus, Check, Star, Filter, Heart, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
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
}

const CATEGORIES = ['All', 'Groceries', 'Pantry', 'Fresh Produce', 'Household', 'Electronics'] as const;

export default function ProductCatalog({
  products,
  basket,
  addToBasket,
  updateQuantity,
  removeFromBasket,
  onSearchRealTime,
  isSearchingRealTime,
  searchError
}: ProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>('All');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<StoreId | 'all'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const getBasketQty = (productId: string) => {
    return basket.find(item => item.productId === productId)?.quantity || 0;
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    
    const matchesStore = selectedStoreFilter === 'all' || 
      p.prices.some(pr => pr.storeId === selectedStoreFilter && pr.inStock && pr.price > 0);

    return matchesSearch && matchesCategory && matchesStore;
  });

  return (
    <div id="product-catalog-view" className="space-y-6">
      {/* Search & Filter Bar as premium Bento box */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search box */}
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              id="search-products-input"
              type="text"
              placeholder="Search Sasko bread, full cream milk, Huletts sugar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-[#FFE600] transition-all font-semibold text-slate-700"
            />
          </div>
          
          <button
            id="trigger-live-supermarket-search"
            type="button"
            disabled={isSearchingRealTime || !searchTerm.trim()}
            onClick={() => onSearchRealTime(searchTerm)}
            className={`px-5 py-3.5 rounded-2xl font-black text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
              isSearchingRealTime 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : searchTerm.trim() 
                  ? 'bg-[#FFE600] text-black hover:bg-yellow-400 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSearchingRealTime ? (
              <>
                <svg className="animate-spin h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4 shrink-0" />
                <span>Live Search</span>
              </>
            )}
          </button>

          {/* Store Quick filter */}
          <div className="w-full md:w-auto flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0 hidden sm:inline-flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Retailer:
            </span>
            <select
              id="store-filter-select"
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value as StoreId | 'all')}
              className="w-full md:w-auto px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-[#FFE600] font-extrabold text-slate-700 cursor-pointer shadow-xs"
            >
              <option value="all">All SA Stores</option>
              {STORES.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Display feedback during search failures/errors */}
        {searchError && (
          <div className="p-4 rounded-xl bg-orange-50/20 border border-orange-500/20 text-orange-900 text-xs font-semibold leading-relaxed">
            ⚠️ {searchError}
          </div>
        )}

        {/* Categories Chips styled as chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-2 no-scrollbar">
          {CATEGORIES.map(category => (
            <button
              id={`cat-chip-${category.toLowerCase()}`}
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-5 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all active:scale-95 duration-200 cursor-pointer ${
                selectedCategory === category
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product, index) => {
          const basketQty = getBasketQty(product.id);
          const isFavorited = favorites.includes(product.id);

          // Find the absolute cheapest active price in the loop
          const eligiblePrices = product.prices.filter(pr => pr.inStock && pr.price > 0);
          const sortedPrices = [...eligiblePrices].sort((a, b) => a.price - b.price);
          const cheapestPrice = sortedPrices[0];
          const cheapestStore = cheapestPrice ? STORES.find(s => s.id === cheapestPrice.storeId) : null;

          // Find premium / highest price
          const highestPrice = sortedPrices[sortedPrices.length - 1];

          return (
            <div
              key={product.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all relative group overflow-hidden"
              id={`product-card-${product.id}`}
            >
              {/* Image abstract area & Quick badge */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col">
                  {product.isPopular && (
                    <span className="inline-flex items-center gap-1 bg-amber-100/40 text-amber-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full mb-1">
                      <Sparkles className="w-2.5 h-2.5" /> Popular Choice
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-bold font-mono uppercase">{product.category}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    id={`fav-${product.id}`}
                    onClick={() => toggleFavorite(product.id)}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Product Info with Image Thumbnail (User Request feature) */}
              <div className="flex items-center gap-4">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover shrink-0 bg-slate-50 border border-slate-150 shadow-xs"
                    onError={(e) => {
                      // Fallback in case of image failure or hotlinking restrictions
                      (e.target as HTMLImageElement).src = `https://placehold.co/100x100?text=${encodeURIComponent(product.name.charAt(0))}`;
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-55 flex items-center justify-center text-slate-600 border border-slate-200 shrink-0 font-extrabold text-lg font-mono uppercase">
                    {product.name.charAt(0)}
                  </div>
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-800 text-lg line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold">
                    Unit Pack: <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm">{product.unit}</span>
                  </p>
                </div>
              </div>

              {/* List of Store Prices inside item card */}
              <div className="bg-slate-50 rounded-2xl p-4 my-4 space-y-2 border border-slate-200/50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">SA Supermarket Offers:</span>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {product.prices.map(pr => {
                    const store = STORES.find(s => s.id === pr.storeId)!;
                    const isCheapestStore = cheapestPrice && cheapestPrice.storeId === pr.storeId;
                    
                    return (
                      <div 
                        key={pr.storeId} 
                        className={`p-1.5 rounded-lg flex items-center justify-between border ${
                          pr.inStock 
                            ? isCheapestStore
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 font-semibold'
                              : 'bg-white border-slate-150 text-slate-600 font-medium'
                            : 'bg-slate-100/50 border-slate-100 text-slate-300 line-through'
                        }`}
                      >
                        <span className="font-bold truncate text-[11px] mr-1 flex items-center gap-1 min-w-0">
                          {store && store.logoUrl ? (
                            <img 
                              src={store.logoUrl} 
                              alt={store.name} 
                              referrerPolicy="no-referrer"
                              className="h-3 w-auto object-contain shrink-0 max-w-[32px] mix-blend-multiply"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          <span className="truncate">{store ? store.name : ''}</span>
                        </span>
                        {pr.inStock && pr.price > 0 ? (
                          <span className={`font-mono font-bold text-[11px] truncate ${isCheapestStore ? 'text-emerald-600 font-black' : ''}`}>
                            R{pr.price.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight font-mono">OOS</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price fluctuations over the last 30 days */}
              <PriceHistoryChart product={product} />

              {/* Footer pricing summary & Basket quick add */}
              <div className="flex items-center justify-between pt-4 border-t border-dashed border-slate-150 mt-auto">
                <div className="flex flex-col">
                  {cheapestStore && cheapestPrice ? (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        Best Value
                      </span>
                      <span className="font-extrabold text-slate-900 text-xl font-mono">
                        R {cheapestPrice.price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold leading-none mt-1.5 uppercase tracking-wider flex items-center gap-1">
                        at 
                        {cheapestStore.logoUrl ? (
                          <img 
                            src={cheapestStore.logoUrl} 
                            alt={cheapestStore.name} 
                            referrerPolicy="no-referrer"
                            className="h-3.5 w-auto object-contain shrink-0 max-w-[45px] mix-blend-multiply"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <span>{cheapestStore.name}</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">Out of Stock everywhere</span>
                  )}
                </div>

                {/* Basket actions */}
                {basketQty > 0 ? (
                  <div className="flex items-center bg-slate-900 text-white rounded-full p-1 shadow-sm shrink-0">
                    <button 
                      id={`dec-qty-${product.id}`}
                      onClick={() => updateQuantity(product.id, -1)}
                      className="p-1.5 hover:bg-slate-800 rounded-full active:scale-95 transition-all cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-black font-mono">
                      {basketQty}
                    </span>
                    <button 
                      id={`inc-qty-${product.id}`}
                      onClick={() => updateQuantity(product.id, 1)}
                      className="p-1.5 hover:bg-slate-800 rounded-full active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  cheapestPrice && (
                    <button
                      id={`add-catalog-${product.id}`}
                      onClick={() => addToBasket(product.id)}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-full text-xs font-extrabold text-[#111111] bg-[#FFE600] hover:bg-yellow-400 active:scale-95 transition-all cursor-pointer shadow-xs shrink-0 font-black"
                    >
                      <Plus className="w-4 h-4" /> Compare
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <Search className="w-10 h-10 text-slate-350 mx-auto mb-3" />
            <h4 className="font-black text-slate-700 text-base">No Matching Supermarket Products</h4>
            <p className="text-xs text-slate-450 max-w-sm mx-auto mt-1.5 font-semibold leading-relaxed">
              We couldn't find items matching "{searchTerm}". Try general categories or clear filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
