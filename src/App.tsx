import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Product, BasketItem, UserProfile, StoreId } from './types';
import InteractiveSpecialDeals from './components/InteractiveSpecialDeals';
import ProductCatalog from './components/ProductCatalog';
import StatsDashboard from './components/StatsDashboard';
import BarcodeScanner from './components/BarcodeScanner';
import { AuthenticationPage } from './components/AuthenticationPage';
import SettingsPage from './components/SettingsPage';
import ShoppingListsManager from './components/ShoppingListsManager';
import PriceDiscrepancyReporter from './components/PriceDiscrepancyReporter';
import CartDrawer from './components/CartDrawer';
import HeroPromos from './components/HeroPromos';
import { ReceiptModal } from './components/ReceiptModal';
import { getCurrentReceipt } from './lib/receiptStorage';
import { ChuseReceipt } from './types';
import { supabase } from './lib/supabase';
import { getCurrentUserProfile, loginUser, syncBasket } from './lib/api';
import { FulfillmentModal, FulfillmentSettings } from './components/FulfillmentModal';
import { NearbyStoresModal } from './components/NearbyStoresModal';
import { SearchOmnibar } from './components/SearchOmnibar';
import { MobileBottomNav } from './components/MobileBottomNav';
import initialProductsData from './data/initialProducts.json';
import { 
  ShoppingBag, 
  MapPin, 
  ChevronDown, 
  Scan, 
  X, 
  Truck,
  Store,
  Sparkles,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MainPageProps {
  user: UserProfile | null | undefined;
  setUser: (user: UserProfile | null) => void;
}

function MainPage({ user, setUser }: MainPageProps) {
  // 4 clean core views: Groceries, Specials, Shopping List, Inflation Index
  const [activeTab, setActiveTab] = useState<'catalog' | 'specials' | 'lists' | 'stats' | 'settings'>('catalog');
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const savedProducts = localStorage.getItem('sa_price_compare_products');
      if (savedProducts) {
        const parsed = JSON.parse(savedProducts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return (initialProductsData as Product[]) || [];
  });
  const [basket, setBasket] = useState<BasketItem[]>([]);

  // Cart Drawer & Filter state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<StoreId | 'all'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Modal triggers
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportProduct, setSelectedReportProduct] = useState<Product | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ChuseReceipt | null>(() => getCurrentReceipt());
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Suburb & Fulfillment selector
  const [fulfillmentSettings, setFulfillmentSettings] = useState<FulfillmentSettings>(() => {
    try {
      const stored = localStorage.getItem('sa_fulfillment_settings');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      suburb: 'Sandton City',
      postalCode: '2196',
      province: user?.preferredStoreLocation || localStorage.getItem('sa_preferred_province') || 'Gauteng',
      hub: 'Johannesburg',
      mode: 'deliveryApp'
    };
  });
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false);
  const [isNearbyStoresModalOpen, setIsNearbyStoresModalOpen] = useState(false);
  
  const [isSearchingRealTime, setIsSearchingRealTime] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchRealStorePricing = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingRealTime(true);
    setSearchError(null);
    try {
      let res = await fetch("/api/products/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      // Fallback to production endpoint if local returns non-JSON or fails
      if (!res.ok || res.headers.get("content-type")?.includes("text/html")) {
        res = await fetch("https://chuse-chi.vercel.app/api/products/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query })
        });
      }
      if (!res.ok) {
        throw new Error("Server failed to query live South African retail indexes.");
      }
      const newProducts: Product[] = await res.json();
      if (newProducts && newProducts.length > 0) {
        const newIds = new Set(newProducts.map(p => p.id));
        const filteredExisting = products.filter(p => !newIds.has(p.id));
        saveProducts([...newProducts, ...filteredExisting]);
      } else {
        setSearchError("No products indexed for this term. Try staples like coffee, milk, or bread.");
      }
    } catch (err: any) {
      console.warn("Remote search failed, filtering bundled catalog:", err);
      // Seamless offline fallback
      const q = query.trim().toLowerCase();
      const localMatches = (initialProductsData as Product[]).filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
      if (localMatches.length > 0) {
        const newIds = new Set(localMatches.map(p => p.id));
        const filteredExisting = products.filter(p => !newIds.has(p.id));
        saveProducts([...localMatches, ...filteredExisting]);
      } else {
        setSearchError(err.message || "Could not connect to live retail database indices.");
      }
    } finally {
      setIsSearchingRealTime(false);
    }
  };
  
  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem('sa_price_compare_products');
      if (savedProducts) {
        const parsed = JSON.parse(savedProducts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
        }
      }
    } catch {
      setProducts((initialProductsData as Product[]) || []);
    }

    const fetchLiveProducts = async () => {
      try {
        let res = await fetch("/api/products");
        if (!res.ok || res.headers.get("content-type")?.includes("text/html")) {
          res = await fetch("https://chuse-chi.vercel.app/api/products");
        }
        if (res.ok) {
          const serverProds: Product[] = await res.json();
          if (Array.isArray(serverProds) && serverProds.length > 0) {
            setProducts(serverProds);
            localStorage.setItem('sa_price_compare_products', JSON.stringify(serverProds));
          }
        }
      } catch (err: any) {
        console.warn("[Auto-sync] Background prices re-alignment bypassed:", err.message);
      }
    };
    fetchLiveProducts();

    try {
      const savedBasket = localStorage.getItem('sa_price_compare_basket');
      if (savedBasket) {
        setBasket(JSON.parse(savedBasket));
      }
    } catch (e) {
      console.error("Failed to load saved basket", e);
    }
  }, []);

  const saveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem('sa_price_compare_products', JSON.stringify(updatedProducts));
  };

  const saveBasket = async (updatedBasket: BasketItem[]) => {
    setBasket(updatedBasket);
    localStorage.setItem('sa_price_compare_basket', JSON.stringify(updatedBasket));

    try {
      await syncBasket(updatedBasket);
    } catch (err) {
      console.warn('Backend basket sync failed, keeping local basket:', err);
    }
  };

  const addToBasket = (productId: string) => {
    const existing = basket.find(item => item.productId === productId);
    let updated: BasketItem[];
    if (existing) {
      updated = basket.map(item => 
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updated = [...basket, { productId, quantity: 1 }];
    }
    saveBasket(updated);
  };

  const updateQuantity = (productId: string, delta: number) => {
    const updated = basket.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta;
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    });
    saveBasket(updated);
  };

  const removeFromBasket = (productId: string) => {
    const updated = basket.filter(item => item.productId !== productId);
    saveBasket(updated);
  };

  const clearBasket = () => {
    saveBasket([]);
  };

  const handleSwapItem = (oldProductId: string, newProductId: string) => {
    const targetItem = basket.find(b => b.productId === oldProductId);
    const qty = targetItem ? targetItem.quantity : 1;
    const withoutOld = basket.filter(b => b.productId !== oldProductId);
    const existingNew = withoutOld.find(b => b.productId === newProductId);

    let updated: BasketItem[];
    if (existingNew) {
      updated = withoutOld.map(b => b.productId === newProductId ? { ...b, quantity: b.quantity + qty } : b);
    } else {
      updated = [...withoutOld, { productId: newProductId, quantity: qty }];
    }
    saveBasket(updated);
  };

  const handleAddLiveProducts = (newProducts: Product[]) => {
    if (newProducts && newProducts.length > 0) {
      const newIds = new Set(newProducts.map(p => p.id));
      const filteredExisting = products.filter(p => !newIds.has(p.id));
      saveProducts([...newProducts, ...filteredExisting]);
    }
  };

  // Live basket metrics
  const basketItemCount = useMemo(() => {
    return basket.reduce((acc, item) => acc + item.quantity, 0);
  }, [basket]);

  const basketLowestTotal = useMemo(() => {
    if (basket.length === 0) return 0;
    let sum = 0;
    basket.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return;
      const validPrices = prod.prices.filter(p => p.inStock && p.price > 0);
      if (validPrices.length > 0) {
        const minPrice = Math.min(...validPrices.map(p => p.price));
        sum += minPrice * item.quantity;
      }
    });
    return sum;
  }, [basket, products]);

  const basketTotalSavings = useMemo(() => {
    if (basket.length === 0) return 0;
    let savings = 0;
    basket.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return;
      const validPrices = prod.prices.filter(p => p.inStock && p.price > 0).map(p => p.price);
      if (validPrices.length > 1) {
        savings += (Math.max(...validPrices) - Math.min(...validPrices)) * item.quantity;
      }
    });
    return savings;
  }, [basket, products]);

  const handleSaveFulfillment = (newSettings: FulfillmentSettings) => {
    setFulfillmentSettings(newSettings);
    localStorage.setItem('sa_fulfillment_settings', JSON.stringify(newSettings));
    localStorage.setItem('sa_preferred_province', newSettings.province);
    if (user) {
      const updatedUser = { ...user, preferredStoreLocation: newSettings.province };
      setUser(updatedUser);
      localStorage.setItem('sa_user_profile', JSON.stringify(updatedUser));
    }
  };

  return (
    <div id="chuse-container" className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#FFE600] selection:text-black overflow-x-hidden w-full max-w-full">
      
      {/* Sticky Checkers/PnP Style Utility Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 w-full overflow-hidden shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          
          {/* Main Header Container: 2-row on mobile, 1-row on tablet/desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-6">
            
            {/* Top Row on Mobile: Logo & Suburb Selector on Left, User & Cart on Right */}
            <div className="flex items-center justify-between w-full sm:w-auto shrink-0">
              
              {/* Logo & Suburb Selector */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Link 
                  to="/" 
                  onClick={() => { setActiveTab('catalog'); setSelectedStoreFilter('all'); setSelectedCategoryFilter('All'); }}
                  className="flex items-center gap-1 cursor-pointer group"
                >
                  <span className="text-xl sm:text-2xl font-black font-display lowercase tracking-tight text-slate-950 leading-none">
                    chuse<span className="text-[#FFE600] text-2xl sm:text-3xl font-black">.</span>
                  </span>
                </Link>

                {/* Checkers/PnP Style Fulfillment & Suburb Selector Trigger */}
                <button
                  type="button"
                  onClick={() => setIsFulfillmentModalOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-800 hover:text-black px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs"
                  title="Change delivery suburb or store pricing mode"
                >
                  {fulfillmentSettings.mode === 'deliveryApp' ? (
                    <Truck className="w-3.5 h-3.5 text-[#008374] shrink-0" />
                  ) : (
                    <Store className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  )}
                  <span className="truncate max-w-[95px] sm:max-w-[130px]">
                    {fulfillmentSettings.activeStoreBranchName || fulfillmentSettings.suburb}
                  </span>
                  {fulfillmentSettings.distanceFormatted ? (
                    <span className="hidden sm:inline-block text-[9.5px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                      {fulfillmentSettings.distanceFormatted}
                    </span>
                  ) : (
                    <span className="hidden md:inline text-[10px] font-mono font-normal text-slate-400">
                      ({fulfillmentSettings.postalCode})
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {/* Nearby Stores Radar Quick Button */}
                <button
                  type="button"
                  onClick={() => setIsNearbyStoresModalOpen(true)}
                  className="hidden lg:flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-black px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs shrink-0"
                  title="Find closest supermarkets by GPS distance"
                >
                  <Navigation className="w-3.5 h-3.5 text-slate-900" />
                  <span>Nearby Stores</span>
                </button>
              </div>

              {/* Mobile Right Actions: Sign In + Dynamic Cart Pill (Hidden on Desktop) */}
              <div className="flex sm:hidden items-center gap-2 shrink-0">
                {user ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="flex items-center cursor-pointer"
                  >
                    <img 
                      src={user.avatarUrl} 
                      alt="User" 
                      className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 object-cover"
                    />
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    className="text-xs font-bold text-slate-700 hover:text-black underline decoration-slate-300 cursor-pointer px-1"
                  >
                    Sign In
                  </Link>
                )}

                {/* Mobile Cart Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FFE600] hover:bg-yellow-400 text-slate-950 font-black text-xs cursor-pointer transition-colors border border-yellow-400 shadow-xs"
                  aria-label="Open Cart"
                >
                  <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="font-mono">
                    {basketItemCount === 0 ? 'Cart' : `R${Math.round(basketLowestTotal)} (${basketItemCount})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Predictive Search Omnibar with Instant Typeahead */}
            <div className="w-full sm:flex-1 sm:max-w-xl">
              <SearchOmnibar
                value={globalSearchTerm}
                onChange={(val) => {
                  setGlobalSearchTerm(val);
                  if (activeTab !== 'catalog') setActiveTab('catalog');
                }}
                onSearchSubmit={(query) => {
                  searchRealStorePricing(query);
                }}
                products={products}
                onSelectProduct={(p) => {
                  // Focus onto product or inspect
                  setGlobalSearchTerm(p.name);
                }}
                onAddToBasket={(id) => {
                  addToBasket(id);
                }}
                onOpenBarcodeScanner={() => setIsBarcodeModalOpen(true)}
                isSearchingRealTime={isSearchingRealTime}
              />
            </div>

            {/* Desktop Right Utility Actions: User Profile + Dynamic Cart Button */}
            <div className="hidden sm:flex items-center gap-2.5 sm:gap-3 shrink-0">
              {user ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-black hover:underline cursor-pointer"
                >
                  <img 
                    src={user.avatarUrl} 
                    alt="User" 
                    className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 object-cover"
                  />
                  <span className="hidden md:inline">{user.displayName}</span>
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="text-xs font-bold text-slate-700 hover:text-black underline decoration-slate-300 cursor-pointer px-1.5"
                >
                  Sign In
                </Link>
              )}

              {/* Dynamic Cart Pill with Rand Total and Savings Badge */}
              <button
                id="header-cart-button"
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#FFE600] hover:bg-yellow-400 text-slate-950 font-black text-xs cursor-pointer transition-all border border-yellow-400 shadow-xs hover:shadow-sm"
              >
                <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                <span className="font-mono">
                  {basketItemCount === 0 ? 'Basket (0)' : `R${basketLowestTotal.toFixed(2)} (${basketItemCount})`}
                </span>
                {basketTotalSavings > 0 && (
                  <span className="hidden lg:inline-flex bg-emerald-800 text-[#FFE600] text-[10px] font-mono px-1.5 py-0.5 rounded font-black tracking-tight">
                    Save R{basketTotalSavings.toFixed(0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 4 Clean Text-Only Navigation Links */}
          <nav className="flex items-center gap-6 sm:gap-8 border-t border-slate-200 mt-2.5 sm:mt-3 pt-2 text-xs sm:text-sm font-semibold tracking-wide overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`py-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'catalog'
                  ? 'text-slate-950 border-b-2 border-slate-950 font-black'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Groceries
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('specials')}
              className={`py-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'specials'
                  ? 'text-slate-950 border-b-2 border-slate-950 font-black'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Specials
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lists')}
              className={`py-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'lists'
                  ? 'text-slate-950 border-b-2 border-slate-950 font-black'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Shopping List
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={`py-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'stats'
                  ? 'text-slate-950 border-b-2 border-slate-950 font-black'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Inflation Index
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-32 sm:pb-24">
        
        {/* Retailer Brand Filter Strip */}
        {(activeTab === 'catalog' || activeTab === 'specials') && (
          <div className="mb-3">
            <HeroPromos 
              selectedStore={selectedStoreFilter}
              onSelectStore={(st) => {
                setSelectedStoreFilter(st);
                if (activeTab !== 'catalog') setActiveTab('catalog');
              }}
              onOpenSpecials={() => setActiveTab('specials')}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'catalog' && (
              <ProductCatalog 
                products={products} 
                basket={basket} 
                addToBasket={addToBasket} 
                updateQuantity={updateQuantity} 
                removeFromBasket={removeFromBasket} 
                onSearchRealTime={searchRealStorePricing} 
                isSearchingRealTime={isSearchingRealTime} 
                searchError={searchError}
                externalSearchTerm={globalSearchTerm}
                onClearSearch={() => setGlobalSearchTerm('')}
                selectedStoreFilter={selectedStoreFilter}
                onSelectStoreFilter={setSelectedStoreFilter}
                selectedCategoryFilter={selectedCategoryFilter}
                onSelectCategoryFilter={setSelectedCategoryFilter}
                onOpenCart={() => setIsCartOpen(true)}
                onReportDiscrepancy={(prod) => {
                  setSelectedReportProduct(prod);
                  setIsReportModalOpen(true);
                }}
                onOpenNearbyStores={() => setIsNearbyStoresModalOpen(true)}
              />
            )}
            
            {activeTab === 'specials' && (
              <InteractiveSpecialDeals 
                products={products} 
                addToBasket={addToBasket} 
                basket={basket} 
                onAddLiveProducts={handleAddLiveProducts}
              />
            )}

            {activeTab === 'lists' && (
              <ShoppingListsManager 
                products={products} 
                onAddToBasket={addToBasket} 
                currentBasket={basket} 
              />
            )}

            {activeTab === 'stats' && (
              <StatsDashboard products={products} />
            )}
            
            {activeTab === 'settings' && (
              <SettingsPage 
                user={user} 
                onUpdateUser={(updated) => setUser(updated)} 
                onLogout={async () => { 
                  try { 
                    await supabase.auth.signOut(); 
                  } catch (e) { 
                    console.error("Supabase signOut failed", e); 
                  } 
                  setUser(null); 
                  localStorage.removeItem('sa_user_profile'); 
                  localStorage.removeItem('supabase_token');
                  setActiveTab('catalog'); 
                }} 
                onClearBasket={clearBasket} 
                products={products} 
                onUpdateProducts={saveProducts}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Tactile Supermarket Retail Footer */}
        <footer className="mt-16 py-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-3 text-xs text-slate-500">
          <div>
            <span className="font-bold font-display text-slate-900 text-sm">chuse.</span> — South African Multi-Supermarket Price Comparison
          </div>
          <div className="flex gap-4 flex-wrap justify-center text-xs">
            <span>Checkers Sixty60</span>
            <span>•</span>
            <span>Pick n Pay ASAP!</span>
            <span>•</span>
            <span>Woolworths</span>
            <span>•</span>
            <span>Shoprite</span>
            <span>•</span>
            <span>SPAR</span>
            <span>•</span>
            <span>Boxer</span>
            <span>•</span>
            <span>Food Lover's</span>
          </div>
        </footer>
      </main>

      {/* Slide-over Cart Drawer with Embedded Housebrand Swaps */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        basket={basket}
        products={products}
        province={fulfillmentSettings.suburb}
        updateQuantity={updateQuantity}
        removeFromBasket={removeFromBasket}
        clearBasket={clearBasket}
        onSwapItem={handleSwapItem}
        onOpenReceiptModal={(receipt) => {
          setActiveReceipt(receipt);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* Till Slip Receipt & PDF / WhatsApp Modal */}
      <ReceiptModal
        receipt={activeReceipt}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />

      {/* Barcode Scanner & Real-Time Price Matcher Modal */}
      {isBarcodeModalOpen && (
        <BarcodeScanner 
          products={products}
          isOpen={isBarcodeModalOpen}
          onClose={() => setIsBarcodeModalOpen(false)}
          onAddToBasket={(id) => {
            addToBasket(id);
          }} 
        />
      )}

      {/* Embedded Price Discrepancy Reporter Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-sm uppercase font-display">Report Price Discrepancy</h3>
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-black cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <PriceDiscrepancyReporter products={products} />
          </div>
        </div>
      )}

      {/* Checkers/PnP Style Suburb & Fulfillment Selector Modal */}
      <FulfillmentModal
        isOpen={isFulfillmentModalOpen}
        onClose={() => setIsFulfillmentModalOpen(false)}
        settings={fulfillmentSettings}
        onSave={handleSaveFulfillment}
        onOpenNearbyStores={() => setIsNearbyStoresModalOpen(true)}
      />

      {/* Supermarkets Close to You (GPS Location Service Modal) */}
      <NearbyStoresModal
        isOpen={isNearbyStoresModalOpen}
        onClose={() => setIsNearbyStoresModalOpen(false)}
        currentSelectedBranchId={fulfillmentSettings.activeStoreBranchId}
        onSelectStoreBranch={(branch) => {
          const updated: FulfillmentSettings = {
            ...fulfillmentSettings,
            suburb: branch.suburb,
            postalCode: branch.postalCode,
            province: branch.province,
            hub: branch.city,
            activeStoreBranchId: branch.id,
            activeStoreBranchName: branch.name,
            distanceFormatted: branch.distanceFormatted
          };
          handleSaveFulfillment(updated);
        }}
      />

      {/* Mobile-First Fixed Bottom Navigation Bar (md:hidden) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'catalog') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenBarcodeScan={() => setIsBarcodeModalOpen(true)}
        basketCount={basketItemCount}
        basketTotal={basketLowestTotal}
      />
    </div>
  );
}

export default function App() {
  // Permanently clear dark mode class from html and localStorage
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user;
      if (currentUser) {
        try {
          if (session?.access_token) {
            localStorage.setItem('supabase_token', session.access_token);
          }
          await loginUser(currentUser.id, currentUser.email || '');
          const backendProfile = await getCurrentUserProfile();
          const cachedProfile = localStorage.getItem('sa_user_profile');
          const cachedData = cachedProfile ? JSON.parse(cachedProfile) : null;
          const meta = currentUser.user_metadata || {};
          const userProfile: UserProfile = {
            displayName: backendProfile?.displayName || cachedData?.displayName || meta.displayName || meta.full_name || currentUser.email?.split('@')[0] || 'Member',
            email: backendProfile?.email || cachedData?.email || currentUser.email || '',
            avatarUrl: backendProfile?.avatarUrl || cachedData?.avatarUrl || meta.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(currentUser.email || '')}`,
            loyaltyCards: backendProfile?.loyaltyCards || cachedData?.loyaltyCards || { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
            preferredStoreLocation: backendProfile?.preferredStoreLocation || cachedData?.preferredStoreLocation || meta.province || 'Gauteng'
          };
          setUser(userProfile);
          localStorage.setItem('sa_user_profile', JSON.stringify(userProfile));
        } catch (err) {
          console.error("Auth state change error:", err);
          const cachedProfile = localStorage.getItem('sa_user_profile');
          if (cachedProfile) {
            try {
              setUser(JSON.parse(cachedProfile));
              return;
            } catch {
              // fall through
            }
          }
          setUser(null);
          localStorage.removeItem('sa_user_profile');
        }
      } else {
        const cachedProfile = localStorage.getItem('sa_user_profile');
        if (cachedProfile) {
          try {
            const cachedData = JSON.parse(cachedProfile);
            if (cachedData && (cachedData.isGuest || cachedData.email === 'guest@chuse.co.za')) {
              setUser(cachedData);
              return;
            }
          } catch (e) {
            // fallback
          }
        }
        setUser(null);
        localStorage.removeItem('sa_user_profile');
        localStorage.removeItem('supabase_token');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Open live catalog with professional typography and clean retail theme */}
        <Route path="/" element={<MainPage user={user} setUser={setUser} />} />
        <Route path="/auth" element={<AuthenticationPage setUser={setUser} />} />
      </Routes>
    </Router>
  );
}
