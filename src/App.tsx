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
import { 
  Search, 
  ShoppingBag, 
  MapPin, 
  ChevronDown, 
  Scan, 
  X, 
  Check 
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

interface MainPageProps {
  user: UserProfile | null | undefined;
  setUser: (user: UserProfile | null) => void;
}

function MainPage({ user, setUser }: MainPageProps) {
  // 4 clean core views: Groceries, Specials, Shopping List, Inflation Index
  const [activeTab, setActiveTab] = useState<'catalog' | 'specials' | 'lists' | 'stats' | 'settings'>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
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

  // Province selector
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
    <div id="chuse-container" className="min-h-screen bg-[#F7F6F0] text-slate-900 font-sans selection:bg-[#FFE600] selection:text-black">
      
      {/* Clean Utility Header */}
      <header className="bg-[#FFFFFF] border-b border-[#E2E0D8] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3 sm:gap-6">
            
            {/* Logo & Province Selector */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <Link 
                to="/" 
                onClick={() => { setActiveTab('catalog'); setSelectedStoreFilter('all'); setSelectedCategoryFilter('All'); }}
                className="flex items-center gap-1.5 cursor-pointer group"
              >
                <span className="text-2xl font-black font-display lowercase tracking-tight text-slate-950 leading-none">
                  chuse<span className="text-[#FFE600] text-3xl font-black">.</span>
                </span>
              </Link>

              {/* Province Dropdown Trigger */}
              <button
                onClick={() => setIsProvinceModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-black px-2.5 py-1 rounded-[4px] border border-[#E2E0D8] bg-[#F7F6F0] cursor-pointer"
                title="Change shopping province"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                <span>{selectedProvince}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {/* Clean Omnipresent Search Input with Embedded Barcode Scan Icon */}
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
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
                placeholder="Search groceries across Checkers, Pick n Pay, Woolies..."
                className="w-full pl-9 pr-16 py-2 rounded-[4px] bg-[#F7F6F0] border border-[#E2E0D8] text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {globalSearchTerm && (
                  <button
                    onClick={() => setGlobalSearchTerm('')}
                    className="p-1 text-slate-400 hover:text-black cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Embedded Barcode Scan Button */}
                <button
                  onClick={() => setIsBarcodeModalOpen(true)}
                  className="p-1 text-slate-500 hover:text-black transition-colors cursor-pointer"
                  title="Scan barcode with camera"
                >
                  <Scan className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Utility Actions: User + Cart Drawer Button */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {user ? (
                <button
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:underline cursor-pointer"
                >
                  <img 
                    src={user.avatarUrl} 
                    alt="User" 
                    className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300 object-cover"
                  />
                  <span className="hidden md:inline">{user.displayName}</span>
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="text-xs font-bold text-slate-700 hover:text-black underline decoration-slate-300 cursor-pointer px-1"
                >
                  Sign In
                </Link>
              )}

              {/* Cart Drawer Trigger Button */}
              <button
                id="header-cart-button"
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] bg-[#FFE600] hover:bg-yellow-400 text-black font-extrabold text-xs cursor-pointer transition-colors border border-yellow-400 shadow-2xs"
              >
                <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                <span className="font-mono">
                  {basketItemCount === 0 ? 'Cart' : `R${basketLowestTotal.toFixed(2)} (${basketItemCount})`}
                </span>
              </button>
            </div>
          </div>

          {/* 4 Clean Text-Only Navigation Links - NO ICONS */}
          <nav className="flex items-center gap-8 border-t border-[#E2E0D8] mt-3 pt-2 text-xs sm:text-sm font-semibold tracking-wide overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`py-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'catalog'
                  ? 'text-black border-b-2 border-black font-bold'
                  : 'text-slate-500 hover:text-black'
              }`}
            >
              Groceries
            </button>

            <button
              onClick={() => setActiveTab('specials')}
              className={`py-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'specials'
                  ? 'text-black border-b-2 border-black font-bold'
                  : 'text-slate-500 hover:text-black'
              }`}
            >
              Specials
            </button>

            <button
              onClick={() => setActiveTab('lists')}
              className={`py-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'lists'
                  ? 'text-black border-b-2 border-black font-bold'
                  : 'text-slate-500 hover:text-black'
              }`}
            >
              Shopping List
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`py-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'stats'
                  ? 'text-black border-b-2 border-black font-bold'
                  : 'text-slate-500 hover:text-black'
              }`}
            >
              Inflation Index
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-32">
        
        {/* Slim Single-Line Retailer Strip */}
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

        {/* Tactile Newspaper / Retail Footer */}
        <footer className="mt-16 py-8 border-t border-[#E2E0D8] flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-3 text-xs text-slate-500">
          <div>
            <span className="font-bold font-display text-slate-900 text-sm">chuse.</span> — South African Supermarket Price Comparison
          </div>
          <div className="flex gap-4 flex-wrap justify-center text-xs">
            <span>Checkers</span>
            <span>•</span>
            <span>Pick n Pay</span>
            <span>•</span>
            <span>Woolworths</span>
            <span>•</span>
            <span>Shoprite</span>
            <span>•</span>
            <span>SPAR</span>
            <span>•</span>
            <span>Boxer</span>
          </div>
        </footer>
      </main>

      {/* Slide-over Cart Drawer with Embedded Housebrand Swaps */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        basket={basket}
        products={products}
        province={selectedProvince}
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

      {/* Embedded Barcode Scanner Modal */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[6px] max-w-lg w-full p-5 shadow-2xl border border-[#E2E0D8] relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E0D8] mb-4">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-slate-900" />
                <h3 className="font-bold text-sm uppercase font-display">Scan Grocery Barcode</h3>
              </div>
              <button
                onClick={() => setIsBarcodeModalOpen(false)}
                className="w-7 h-7 rounded-[4px] bg-[#F7F6F0] flex items-center justify-center text-slate-500 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <BarcodeScanner 
              products={products} 
              onAddToBasket={(id) => {
                addToBasket(id);
                setIsBarcodeModalOpen(false);
              }} 
            />
          </div>
        </div>
      )}

      {/* Embedded Price Discrepancy Reporter Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[6px] max-w-lg w-full p-5 shadow-2xl border border-[#E2E0D8] relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E0D8] mb-4">
              <h3 className="font-bold text-sm uppercase font-display">Report Price Discrepancy</h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-7 h-7 rounded-[4px] bg-[#F7F6F0] flex items-center justify-center text-slate-500 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <PriceDiscrepancyReporter products={products} />
          </div>
        </div>
      )}

      {/* South African Province Selector Modal */}
      {isProvinceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[6px] max-w-md w-full p-5 shadow-2xl border border-[#E2E0D8]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E0D8]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-sm uppercase font-display">Select Your Province</h3>
              </div>
              <button
                onClick={() => setIsProvinceModalOpen(false)}
                className="w-7 h-7 rounded-[4px] bg-[#F7F6F0] flex items-center justify-center text-slate-500 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5 mt-3 max-h-72 overflow-y-auto pr-1">
              {SA_PROVINCES.map((prov) => {
                const isSelected = selectedProvince === prov.name;
                return (
                  <button
                    key={prov.name}
                    onClick={() => handleSelectProvince(prov.name)}
                    className={`flex items-center justify-between p-2.5 rounded-[4px] text-left transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-[#FFE600] border-yellow-400 text-black font-extrabold'
                        : 'bg-[#F7F6F0] border-[#E2E0D8] text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-bold">{prov.name}</span>
                      <span className="text-[10px] text-slate-500">{prov.hub}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-black stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E0D8] flex justify-end">
              <button
                onClick={() => setIsProvinceModalOpen(false)}
                className="px-4 py-1.5 rounded-[4px] bg-slate-900 text-white font-bold text-xs uppercase cursor-pointer"
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
