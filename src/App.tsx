import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import { Product, BasketItem, UserProfile } from './types';
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
  Award,
  ChevronRight,
  Calculator,
  Compass,
  MapPin,
  Scan,
  User,
  Settings,
  ClipboardList,
  Camera,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function ProtectedRoute({ user }: { user: UserProfile | null | undefined }) {
  if (user === undefined) {
    return <div>Loading...</div>; // Or a spinner
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
  const [activeTab, setActiveTab] = useState<'specials' | 'catalog' | 'basket' | 'stats' | 'custom' | 'scan' | 'settings' | 'ai' | 'lists' | 'reports'>('specials');
  const [products, setProducts] = useState<Product[]>([]);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  
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
        setSearchError("No products could be indexed for this term. Try typing basic staples like coffee, milk, or sasko.");
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

  return (
    <div id="chuse-container" className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-[#FFE600] selection:text-black relative overflow-hidden transition-colors duration-300">
      {/* Editorial Floating Background Blurs */}
      <div className="ambient-blur-1 top-[5%] left-[2%]"></div>
      <div className="ambient-blur-2 top-[35%] right-[2%]"></div>
      <div className="ambient-blur-1 top-[75%] left-[20%]"></div>

      {showPromoBanner && (
        <div id="promo-notice-banner" className="bg-slate-950 dark:bg-black border-b border-slate-900 dark:border-slate-950 text-white text-[10px] sm:text-[11px] font-bold tracking-wider text-center py-3 px-6 flex items-center justify-between uppercase relative z-45">
          <div className="flex-1 flex justify-center items-center gap-2 flex-wrap text-slate-200">
            <span className="bg-[#FFE600] text-black font-extrabold px-2 py-0.5 rounded text-[8.5px] tracking-wider shadow-xs animate-pulse">TRENDING SA</span>
            <span>Checkers Xtra Savings vs Woolworths W-Rewards: basic staples basket fluctuates 3.2% vs last week</span>
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

      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 shrink-0">
                <img 
                  src="/icons/ic_launcher.png" 
                  alt="Chuse Logo" 
                  className="w-11 h-11 object-contain rounded-2xl shadow-sm border border-slate-800/10 transform hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = document.getElementById('chuse-header-logo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div 
                  id="chuse-header-logo-fallback"
                  style={{ display: 'none' }}
                  className="w-11 h-11 bg-slate-950 rounded-2xl flex items-center justify-center text-[#FFE600] font-black text-xl shadow-md border border-slate-800 transform hover:scale-105 transition-transform duration-300"
                >
                  <ShoppingBag className="w-5 h-5 text-[#FFE600]" strokeWidth={2.5} />
                </div>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white lowercase flex items-center font-mono leading-none mb-1">
                  chuse<span className="text-[#FFE600] font-black">.</span>
                </h1>
                <p className="text-[9.5px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest font-mono">
                  South African Multi-Supermarket Price Optimization Engine
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3.5 w-full md:w-auto">
              {user ? (
                <button
                  id="header-user-settings-capsule"
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-full border transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-yellow-50/50 dark:bg-[#FFE600]/10 border-[#FFE600] ring-4 ring-[#FFE600]/10'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <img 
                    src={user.avatarUrl} 
                    alt="User Profile" 
                    className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 object-cover"
                  />
                  <div className="text-left leading-none">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{user.displayName}</span>
                    <span className="text-[8.5px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block mt-0.5">My Profile</span>
                  </div>
                </button>
              ) : (
                <Link
                  to="/auth"
                  id="header-signin-cta"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-950 hover:bg-[#FFE600] hover:text-black text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 hover:shadow-md"
                >
                  <span>Sign In / Join Free</span>
                </Link>
              )}

              <div className="hidden sm:inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-full border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                <MapPin className="text-amber-500 w-4 h-4 shrink-0" />
                <span className="text-xs text-slate-600 dark:text-slate-350 font-bold">
                  Index: {user ? `${user.preferredStoreLocation} Province` : 'SA National Average'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto border-t border-slate-100/60 dark:border-slate-800/60 py-3 no-scrollbar">
            <button 
              id="tab-specials-trigger" 
              onClick={() => setActiveTab('specials')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'specials' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm ring-4 ring-[#FFE600]/15' 
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200/50 dark:border-slate-800'
              }`}
            >
              <Percent className="w-4 h-4 text-rose-500" /> Active Specials
            </button>

            <button 
              id="tab-ai-trigger" 
              onClick={() => setActiveTab('ai')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border relative ${ 
                activeTab === 'ai' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm ring-4 ring-[#FFE600]/15' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-amber-50/40 dark:bg-slate-900/40 hover:bg-amber-50/80 dark:hover:bg-slate-900 border-amber-200/40 dark:border-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-300" /> 
              <span>AI Savings Wizard</span>
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-[6.5px] font-black tracking-widest px-1.5 py-0.5 rounded-full uppercase text-white border border-white">AI</span>
            </button>

            <button 
              id="tab-catalog-trigger" 
              onClick={() => setActiveTab('catalog')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'catalog' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm ring-4 ring-[#FFE600]/15' 
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200/50 dark:border-slate-800'
              }`}
            >
              <Compass className="w-4 h-4 text-sky-500" /> Product Directory
            </button>

            <button 
              id="tab-lists-trigger" 
              onClick={() => setActiveTab('lists')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'lists' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm ring-4 ring-[#FFE600]/15' 
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200/50 dark:border-slate-800'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-indigo-500" /> Shopping Lists
            </button>

            <button 
              id="tab-reports-trigger" 
              onClick={() => setActiveTab('reports')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border relative ${ 
                activeTab === 'reports' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm ring-4 ring-[#FFE600]/15' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-emerald-50/40 dark:bg-slate-900/40 hover:bg-emerald-50/80 dark:hover:bg-slate-900 border-emerald-200/40 dark:border-slate-800'
              }`}
            >
              <Camera className="w-4 h-4 text-emerald-600" /> 
              <span>Verification Hub</span>
            </button>

            <button 
              id="tab-scan-trigger" 
              onClick={() => setActiveTab('scan')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border relative ${ 
                activeTab === 'scan' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm ring-4 ring-[#FFE600]/15' 
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-rose-50/40 dark:bg-slate-900/40 hover:bg-rose-50/80 dark:hover:bg-slate-900 border-rose-200/40 dark:border-slate-800'
              }`}
            >
              <Scan className="w-4 h-4 text-rose-500" /> 
              <span>Scan Barcode</span>
            </button>

            <button 
              id="tab-basket-trigger" 
              onClick={() => setActiveTab('basket')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border relative ${ 
                activeTab === 'basket' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm ring-4 ring-[#FFE600]/15' 
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200/50 dark:border-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-amber-500" /> Basket Optimizer
              {basket.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[9px] rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-xs">
                  {basket.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>

            <button 
              id="tab-stats-trigger" 
              onClick={() => setActiveTab('stats')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'stats' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm ring-4 ring-[#FFE600]/15' 
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200/50 dark:border-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-violet-500" /> Inflation Indices
            </button>

            <button 
              id="tab-custom-trigger" 
              onClick={() => setActiveTab('custom')} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'custom' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm ring-4 ring-[#FFE600]/15' 
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200/50 dark:border-slate-800'
              }`}
            >
              <Plus className="w-4 h-4 text-teal-500" /> Log Custom Price
            </button>

            <button 
              id="tab-settings-trigger" 
              onClick={() => { if (!user) { window.location.href = '/auth'; } else { setActiveTab('settings'); } }} 
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer border ${ 
                activeTab === 'settings' 
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm ring-4 ring-[#FFE600]/15' 
                  : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200/50 dark:border-slate-800'
              }`}
            >
              <User className="w-4 h-4 text-slate-700" /> <span>{user ? 'My Hub' : 'Sign In'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {activeTab === 'specials' && (<InteractiveSpecialDeals products={products} addToBasket={addToBasket} basket={basket} onAddLiveProducts={handleAddLiveProducts}/>)}
            {activeTab === 'catalog' && (<ProductCatalog products={products} basket={basket} addToBasket={addToBasket} updateQuantity={updateQuantity} removeFromBasket={removeFromBasket} onSearchRealTime={searchRealStorePricing} isSearchingRealTime={isSearchingRealTime} searchError={searchError}/>)}
            {activeTab === 'basket' && (<BasketOptimizer products={products} basket={basket} updateQuantity={updateQuantity} removeFromBasket={removeFromBasket} clearBasket={clearBasket} />)}
            {activeTab === 'stats' && (<StatsDashboard products={products} />)}
            {activeTab === 'ai' && (<AISavingsWizard products={products} basket={basket} user={user} onAuthRequest={() => {return;}} />)}
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
                  setActiveTab('specials'); 
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
        
        <footer className="mt-20 py-10 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          <div className="mb-4 md:mb-0">
            © {new Date().getFullYear()} Chuse. A product of 12 Links.
          </div>
          <div className="flex gap-x-6 gap-y-2 flex-wrap justify-center md:justify-end">
            <span>Smart Shopper & Xtra Savings Integrated</span>
            <span>Store API Status: Optimal</span>
            <span className="text-slate-900 dark:text-slate-200 underline decoration-[#FFE600] decoration-2">Updates every 15 mins</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return false; // Default is light mode
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
