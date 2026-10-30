import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import { Product, BasketItem, UserProfile, StoreId } from './types';
import { STORES } from './data/catalog';
import InteractiveSpecialDeals from './components/InteractiveSpecialDeals';
import ProductCatalog from './components/ProductCatalog';
import BasketOptimizer from './components/BasketOptimizer';
import StatsDashboard from './components/StatsDashboard';
import AddCustomProduct from './components/AddCustomProduct';
import BarcodeScanner from './components/BarcodeScanner';
import { AuthenticationPage } from './components/AuthenticationPage';
import SettingsPage from './components/SettingsPage';
import AISavingsWizard from './components/AISavingsWizard';
import ShoppingListsManager from './components/ShoppingListsManager';
import PriceDiscrepancyReporter from './components/PriceDiscrepancyReporter';
import CartDrawer from './components/CartDrawer';
import HeroPromos from './components/HeroPromos';
import { supabase } from './lib/supabase';
import { getCurrentUserProfile, loginUser, syncBasket } from './lib/api';
import { 
  Sparkles, 
  ShoppingBag, 
  Search, 
  TrendingUp, 
  Plus, 
  HelpCircle, 
  Percent, 
  ChevronRight,
  ChevronDown,
  Compass, 
  MapPin, 
  Scan, 
  User, 
  ClipboardList, 
  Camera, 
  X,
  Moon,
  Sun,
  Check,
  Zap,
  Store as StoreIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SA_PROVINCES = [
  { name: 'Gauteng', hub: 'Johannesburg & Pretoria' },
  { name: 'Western Cape', hub: 'Cape Town & Winelands' },
  { name: 'KwaZulu-Natal', hub: 'Durban & Pietermaritzburg' },
  { name: 'Eastern Cape', hub: 'Gqeberha & East London' },
  { name: 'Free State', hub: 'Bloemfontein & Welkom' },
  { name: 'Mpumalanga', hub: 'Mbombela & Witbank' },
  { name: 'Limpopo', hub: 'Polokwane & Tzaneen' },
  { name: 'North West', hub: 'Rustenburg & Potchefstroom' },
  { name: 'Northern Cape', hub: 'Kimberley & Upington' }
];

const QUICK_SEARCH_STAPLES = [
  'Milk',
  'Eggs',
  'Bread',
  'Chicken',
  'Sunflower Oil',
  'Coffee',
  'Cheese',
  'Rice',
  'Sugar'
];

function ProtectedRoute({ user }: { user: UserProfile | null | undefined }) {
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-mono text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#FFE600] border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Chuse retail engine...</span>
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return <Outlet />;
}

interface MainPageProps {
  user: UserProfile | null | undefined;
  setUser: (user: UserProfile | null) => void;
  isDarkMode: boolean;
  onToggleDarkMode: (isDark: boolean) => void;
}

function MainPage({ user, setUser, isDarkMode, onToggleDarkMode }: MainPageProps) {
  // Main view navigation: 'catalog' is the primary supermarket shopping experience
  const [activeTab, setActiveTab] = useState<'catalog' | 'specials' | 'basket' | 'stats' | 'custom' | 'scan' | 'settings' | 'ai' | 'lists' | 'reports'>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [showPromoBanner, setShowPromoBanner] = useState(true);

  // Cart Drawer & Filtering state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<StoreId | 'all'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Province / Region selector modal
  const [selectedProvince, setSelectedProvince] = useState<string>(() => {
    return user?.preferredStoreLocation || localStorage.getItem('sa_preferred_province') || 'Gauteng';
  });
  const [isProvinceModalOpen, setIsProvinceModalOpen] = useState(false);
  
  const [isSearchingRealTime, setIsSearchingRealTime] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchRealStorePricing = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingRealTime(true);
    setSearchError(null);
    try {
      const res = await fetch("/api/products/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query })
      });
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
      console.error(err);
      setSearchError(err.message || "Could not connect to live retail database indices.");
    } finally {
      setIsSearchingRealTime(false);
    }
  };
  
  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem('sa_price_compare_products');
      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      }
    } catch {
      setProducts([]);
    }

    fetch("/api/products")
      .then(res => {
        if (!res.ok) throw new Error("Status code " + res.status);
        return res.json();
      })
      .then((serverProds: Product[]) => {
        if (serverProds && serverProds.length > 0) {
          setProducts(serverProds);
          localStorage.setItem('sa_price_compare_products', JSON.stringify(serverProds));
        }
      })
      .catch(err => {
        console.warn("[Auto-sync] Background prices re-alignment bypassed:", err.message);
      });

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

  const handleAddFieldCustomProduct = (newProduct: Product) => {
    const updated = [newProduct, ...products];
    saveProducts(updated);
  };
  
  const handleAddLiveProducts = (newProducts: Product[]) => {
    if (newProducts && newProducts.length > 0) {
      const newIds = new Set(newProducts.map(p => p.id));
      const filteredExisting = products.filter(p => !newIds.has(p.id));
      saveProducts([...newProducts, ...filteredExisting]);
    }
  };

  // Compute live basket metrics for the omnipresent header cart pill
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

  const handleSelectProvince = (prov: string) => {
    setSelectedProvince(prov);
    localStorage.setItem('sa_preferred_province', prov);
    if (user) {
      const updatedUser = { ...user, preferredStoreLocation: prov };
      setUser(updatedUser);
      localStorage.setItem('sa_user_profile', JSON.stringify(updatedUser));
    }
    setIsProvinceModalOpen(false);
  };

  return (
    <div id="chuse-container" className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-[#FFE600] selection:text-black relative overflow-hidden transition-colors duration-300">
      {/* Background ambient lighting */}
      <div className="ambient-blur-1 top-[5%] left-[2%] pointer-events-none"></div>
      <div className="ambient-blur-2 top-[35%] right-[2%] pointer-events-none"></div>
      <div className="ambient-blur-1 top-[75%] left-[20%] pointer-events-none"></div>

      {/* Top Banner: Trending retail notice */}
      {showPromoBanner && (
        <div id="promo-notice-banner" className="bg-slate-950 dark:bg-black border-b border-slate-900 dark:border-slate-950 text-white text-[10px] sm:text-[11px] font-bold tracking-wider py-2.5 px-4 sm:px-6 flex items-center justify-between uppercase relative z-40">
          <div className="flex-1 flex justify-center items-center gap-2 flex-wrap text-slate-200">
            <span className="bg-[#FFE600] text-black font-extrabold px-2 py-0.5 rounded text-[8.5px] tracking-wider shadow-xs animate-pulse">TRENDING MZANSI</span>
            <span>Checkers Xtra Savings vs Pick n Pay Smart Shopper vs Woolies: 171+ staples indexed across SA</span>
          </div>
          <button 
            id="close-promo-banner"
            onClick={() => setShowPromoBanner(false)} 
            className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
            aria-label="Close Announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Omnipresent Top Supermarket Header */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-300">
        
        {/* Top utility sub-bar: Location selector + Live status indicator */}
        <div className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-950/40 text-[11px] py-1.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setIsProvinceModalOpen(true)}
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold hover:text-slate-950 dark:hover:text-[#FFE600] transition-colors cursor-pointer group"
              title="Change Delivery / Pricing Region"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
              <span>Comparing stores in:</span>
              <span className="font-extrabold underline decoration-[#FFE600] decoration-2 underline-offset-2">{selectedProvince}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-medium">
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono text-[10.5px]">171+ live verified supermarket prices</span>
              </div>
              <button
                onClick={() => onToggleDarkMode(!isDarkMode)}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Main Supermarket Header Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            
            {/* Logo */}
            <div className="flex items-center justify-between">
              <Link 
                to="/" 
                onClick={() => { setActiveTab('catalog'); setSelectedStoreFilter('all'); setSelectedCategoryFilter('All'); }}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <div className="relative w-10 h-10 shrink-0">
                  <img 
                    src="/icons/ic_launcher.png" 
                    alt="Chuse Logo" 
                    className="w-10 h-10 object-contain rounded-xl shadow-xs border border-slate-800/10 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                      const fallback = document.getElementById('chuse-header-logo-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <div 
                    id="chuse-header-logo-fallback"
                    style={{ display: 'none' }}
                    className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-[#FFE600] font-black text-lg shadow-sm border border-slate-800"
                  >
                    <ShoppingBag className="w-5 h-5 text-[#FFE600]" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white lowercase flex items-center font-mono leading-none">
                    chuse<span className="text-[#FFE600] font-black text-3xl">.</span>
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider font-mono">
                    SA Supermarket Compare
                  </span>
                </div>
              </Link>

              {/* Mobile cart button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="md:hidden flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FFE600] text-black font-extrabold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{basketItemCount}</span>
                {basketItemCount > 0 && <span>• R{basketLowestTotal.toFixed(2)}</span>}
              </button>
            </div>

            {/* Omnipresent Global Search Bar (Checkers / PnP style) */}
            <div className="flex-1 max-w-2xl mx-0 md:mx-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={globalSearchTerm}
                  onChange={(e) => {
                    setGlobalSearchTerm(e.target.value);
                    if (activeTab !== 'catalog') setActiveTab('catalog');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && globalSearchTerm.trim()) {
                      searchRealStorePricing(globalSearchTerm.trim());
                    }
                  }}
                  placeholder="Search 170+ groceries across Checkers, Pick n Pay, Woolies, Shoprite..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#FFE600] focus:border-transparent transition-all shadow-inner"
                />
                {globalSearchTerm && (
                  <button
                    onClick={() => setGlobalSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Search Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 text-[11px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Popular:</span>
                {QUICK_SEARCH_STAPLES.map(staple => (
                  <button
                    key={staple}
                    onClick={() => {
                      setGlobalSearchTerm(staple);
                      if (activeTab !== 'catalog') setActiveTab('catalog');
                    }}
                    className={`px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                      globalSearchTerm.toLowerCase() === staple.toLowerCase()
                        ? 'bg-[#FFE600] text-black shadow-xs font-black'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {staple}
                  </button>
                ))}
              </div>
            </div>

            {/* Right actions: Profile + Desktop Cart Pill */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <button
                  id="header-user-settings-capsule"
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-yellow-50 dark:bg-[#FFE600]/10 border-[#FFE600] ring-3 ring-[#FFE600]/20'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  <img 
                    src={user.avatarUrl} 
                    alt="User Profile" 
                    className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 object-cover"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.displayName}</span>
                </button>
              ) : (
                <Link
                  to="/auth"
                  id="header-signin-cta"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-950 hover:bg-[#FFE600] hover:text-black text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              )}

              {/* Omnipresent Cart Button Pill (Checkers Sixty60 / PnP style) */}
              <button
                id="header-cart-drawer-trigger"
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#FFE600] hover:bg-yellow-400 text-black font-black text-xs shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer border border-yellow-300"
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 text-black" strokeWidth={2.5} />
                  {basketItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-slate-950 text-white font-extrabold text-[8px] rounded-full w-4 h-4 flex items-center justify-center">
                      {basketItemCount}
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs">
                  {basketItemCount === 0 ? 'Cart' : `R${basketLowestTotal.toFixed(2)}`}
                </span>
              </button>
            </div>
          </div>

          {/* Supermarket Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 dark:border-slate-800/80 mt-3 pt-3 no-scrollbar">
            <button 
              id="tab-catalog-trigger" 
              onClick={() => setActiveTab('catalog')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'catalog' 
                  ? 'bg-slate-950 text-white dark:bg-[#FFE600] dark:text-black border-transparent shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-500" />
              <span>Supermarket Catalog</span>
            </button>

            <button 
              id="tab-specials-trigger" 
              onClick={() => setActiveTab('specials')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'specials' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-rose-500" /> 
              <span>Active Specials</span>
            </button>

            <button 
              id="tab-ai-trigger" 
              onClick={() => setActiveTab('ai')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border relative ${ 
                activeTab === 'ai' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-amber-50/40 dark:bg-slate-900 border-amber-200/50 dark:border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-300" /> 
              <span>AI Savings Wizard</span>
              <span className="bg-amber-500 text-[6.5px] font-black tracking-widest px-1 py-0.2 rounded-full uppercase text-white">AI</span>
            </button>

            <button 
              id="tab-basket-trigger" 
              onClick={() => setActiveTab('basket')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border relative ${ 
                activeTab === 'basket' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" /> 
              <span>Basket Optimizer</span>
              {basketItemCount > 0 && (
                <span className="bg-rose-500 text-white font-extrabold text-[9px] rounded-full px-1.5 py-0.2">
                  {basketItemCount}
                </span>
              )}
            </button>

            <button 
              id="tab-lists-trigger" 
              onClick={() => setActiveTab('lists')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'lists' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-indigo-500" /> 
              <span>Shopping Lists</span>
            </button>

            <button 
              id="tab-scan-trigger" 
              onClick={() => setActiveTab('scan')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'scan' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Scan className="w-3.5 h-3.5 text-rose-500" /> 
              <span>Scan Barcode</span>
            </button>

            <button 
              id="tab-stats-trigger" 
              onClick={() => setActiveTab('stats')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'stats' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-violet-500" /> 
              <span>Inflation Indices</span>
            </button>

            <button 
              id="tab-reports-trigger" 
              onClick={() => setActiveTab('reports')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'reports' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" /> 
              <span>Price Verification</span>
            </button>

            <button 
              id="tab-custom-trigger" 
              onClick={() => setActiveTab('custom')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'custom' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-teal-500" /> 
              <span>Log Price</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Shopping Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-40">
        
        {/* Render Retail Hero Promo Slides + Store Brand Bar on Catalog and Specials */}
        {(activeTab === 'catalog' || activeTab === 'specials') && (
          <div className="mb-6">
            <HeroPromos 
              selectedStore={selectedStoreFilter}
              onSelectStore={(st) => {
                setSelectedStoreFilter(st);
                if (activeTab !== 'catalog') setActiveTab('catalog');
              }}
              onOpenAiWizard={() => setActiveTab('ai')}
              onOpenSpecials={() => setActiveTab('specials')}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
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

            {activeTab === 'basket' && (
              <BasketOptimizer 
                products={products} 
                basket={basket} 
                updateQuantity={updateQuantity} 
                removeFromBasket={removeFromBasket} 
                clearBasket={clearBasket} 
              />
            )}

            {activeTab === 'stats' && (<StatsDashboard products={products} />)}
            
            {activeTab === 'ai' && (
              <AISavingsWizard 
                products={products} 
                basket={basket} 
                user={user} 
                onAuthRequest={() => {return;}} 
              />
            )}

            {activeTab === 'custom' && (<AddCustomProduct onAddProduct={handleAddFieldCustomProduct} />)}
            
            {activeTab === 'scan' && (<BarcodeScanner products={products} onAddToBasket={addToBasket} />)}
            
            {activeTab === 'lists' && (<ShoppingListsManager products={products} onAddToBasket={addToBasket} currentBasket={basket} />)}
            
            {activeTab === 'reports' && (<PriceDiscrepancyReporter products={products} />)}
            
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
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Retail-grade Footer */}
        <footer className="mt-20 py-10 border-t border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 dark:text-white">chuse.</span>
            <span>© {new Date().getFullYear()} 12 Links Retail Intelligence.</span>
          </div>
          <div className="flex gap-x-6 gap-y-2 flex-wrap justify-center md:justify-end">
            <span>Checkers Xtra Savings • PnP Smart Shopper • Woolies W-Rewards</span>
            <span>Store API Status: <span className="text-emerald-500 font-extrabold">Online</span></span>
            <span className="text-slate-900 dark:text-slate-200 underline decoration-[#FFE600] decoration-2">Indices updated today</span>
          </div>
        </footer>
      </main>

      {/* Slide-over Cart Drawer (Checkers Sixty60 & PnP ASAP style) */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        basket={basket}
        products={products}
        updateQuantity={updateQuantity}
        removeFromBasket={removeFromBasket}
        clearBasket={clearBasket}
        onOpenOptimizer={() => {
          setIsCartOpen(false);
          setActiveTab('basket');
        }}
        onOpenAiWizard={() => {
          setIsCartOpen(false);
          setActiveTab('ai');
        }}
      />

      {/* South African Province / Region Selector Modal */}
      {isProvinceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">Select Your Province</h3>
                  <p className="text-[11px] text-slate-400">Stores and prices are optimized for your local province</p>
                </div>
              </div>
              <button
                onClick={() => setIsProvinceModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-4 max-h-80 overflow-y-auto pr-1">
              {SA_PROVINCES.map((prov) => {
                const isSelected = selectedProvince === prov.name;
                return (
                  <button
                    key={prov.name}
                    onClick={() => handleSelectProvince(prov.name)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-yellow-50 dark:bg-[#FFE600]/15 border-[#FFE600] text-slate-950 dark:text-white font-extrabold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">{prov.name}</span>
                      <span className="text-[10.5px] text-slate-400 font-medium">{prov.hub}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#FFE600] text-black flex items-center justify-center font-black">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsProvinceModalOpen(false)}
                className="px-5 py-2.5 rounded-full bg-slate-950 dark:bg-white text-white dark:text-black font-black text-xs hover:bg-[#FFE600] hover:text-black transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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
              // fall through to null state
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
        <Route path="/auth" element={<AuthenticationPage setUser={setUser} />} />
        <Route element={<ProtectedRoute user={user} />}>
          <Route path="/" element={<MainPage user={user} setUser={setUser} isDarkMode={isDarkMode} onToggleDarkMode={setIsDarkMode} />} />
        </Route>
      </Routes>
    </Router>
  );
}
