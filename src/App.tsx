import React, { useState, useEffect } from 'react';
import { Product, BasketItem, UserProfile } from './types';
import { STORES } from './data/catalog';
import InteractiveSpecialDeals from './components/InteractiveSpecialDeals';
import ProductCatalog from './components/ProductCatalog';
import BasketOptimizer from './components/BasketOptimizer';
import StatsDashboard from './components/StatsDashboard';
import AddCustomProduct from './components/AddCustomProduct';
import BarcodeScanner from './components/BarcodeScanner';
import AuthPage from './components/AuthPage';
import SettingsPage from './components/SettingsPage';
import AISavingsWizard from './components/AISavingsWizard';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
  X,
  Scan,
  User,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'specials' | 'catalog' | 'basket' | 'stats' | 'custom' | 'scan' | 'settings' | 'ai'>('specials');
  const [products, setProducts] = useState<Product[]>([]);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  
  // Real-time live store search engine
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

  // User Profiling state registers
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Initialize and load persistent data
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('sa_user_profile');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error("Failed to load user profile session", e);
    }

    try {
      const savedProducts = localStorage.getItem('sa_price_compare_products');
      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      }
    } catch {
      // If parsing fails, start with an empty list.
      setProducts([]);
    }

    // Auto-sync store prices with backend server catalog on boot
    fetch("/api/products")
      .then(res => {
        if (!res.ok) throw new Error("Status code " + res.status);
        return res.json();
      })
      .then((serverProds: Product[]) => {
        if (serverProds && serverProds.length > 0) {
          setProducts(prevProducts => { // Use a function to get the latest state
            const currentList = prevProducts.length > 0 ? prevProducts : [];
            const serverMap = new Map(serverProds.map(p => [p.id, p]));
            
            const merged = currentList.map(localProd => {
              const serverProd = serverMap.get(localProd.id);
              if (serverProd) {
                return {
                  ...localProd,
                  prices: serverProd.prices
                };
              }
              return localProd;
            });

            const localIds = new Set(currentList.map(p => p.id));
            const brandNew = serverProds.filter(p => !localIds.has(p.id));
            const finalProducts = [...merged, ...brandNew];
            
            localStorage.setItem('sa_price_compare_products', JSON.stringify(finalProducts));
            return finalProducts;
          });
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

  // Synchronize dynamic Auth state & cloud-stored baskets from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Restore loyalty cards & region profile details
            const userProfile: UserProfile = {
              name: data.name || currentUser.displayName || currentUser.email?.split('@')[0] || 'Member',
              email: currentUser.email || data.email || '',
              avatarUrl: currentUser.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(currentUser.email || '')}`,
              loyaltyCards: data.loyaltyCards || { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
              region: data.region || 'Gauteng'
            };
            setUser(userProfile);
            localStorage.setItem('sa_user_profile', JSON.stringify(userProfile));

            // Restore basket
            if (data.basket) {
              setBasket(data.basket);
              localStorage.setItem('sa_price_compare_basket', JSON.stringify(data.basket));
            }
          }
        } catch (err) {
          console.error("Cloud Firestore session restoration failed", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Save changes to localStorage & Cloud Database
  const saveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem('sa_price_compare_products', JSON.stringify(updatedProducts));
  };

  const saveBasket = async (updatedBasket: BasketItem[]) => {
    setBasket(updatedBasket);
    localStorage.setItem('sa_price_compare_basket', JSON.stringify(updatedBasket));

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid), {
          basket: updatedBasket,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Could not sync basket with Firestore", err);
      }
    }
  };

  // Basket logic helper functions
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

  // Compute best store basket overview for Floating Panel
  const getFloatingBasketSummary = () => {
    if (basket.length === 0) return null;
    
    const storeSummaries = STORES.map(store => {
      let total = 0;
      let filled = 0;
      basket.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const priceInfo = product?.prices.find(pr => pr.storeId === store.id);
        if (priceInfo && priceInfo.inStock && priceInfo.price > 0) {
          total += priceInfo.price * item.quantity;
          filled++;
        }
      });
      return { store, total, filled };
    });

    // filter only fully filled stores or highest fill count
    const sorted = [...storeSummaries].sort((a, b) => b.filled - a.filled || a.total - b.total);
    return sorted[0];
  };

  const currentBest = getFloatingBasketSummary();

  const handleAddLiveProducts = (newProducts: Product[]) => {
    if (newProducts && newProducts.length > 0) {
      const newIds = new Set(newProducts.map(p => p.id));
      const filteredExisting = products.filter(p => !newIds.has(p.id));
      saveProducts([...newProducts, ...filteredExisting]);
    }
  };

  return (
    <div id="chuse-container" className="min-h-screen bg-[#f8fafc] text-slate-905 font-sans selection:bg-[#FFE600] selection:text-black pb-24">
      
      {/* Visual Top Notice Bar */}
      {showPromoBanner && (
        <div id="promo-notice-banner" className="bg-slate-900 border-b border-slate-800 text-white text-[11px] font-bold tracking-wider text-center py-2.5 px-6 flex items-center justify-between uppercase relative z-40">
          <div className="flex-1 flex justify-center items-center gap-2 flex-wrap text-slate-200">
            <span className="bg-[#FFE600] text-black font-black px-2.5 py-0.5 rounded text-[9px] tracking-wider">TRENDING SA</span>
            <span>Checkers Xtra Savings vs Woolworths W-Rewards indices: basic staples basket fluctuates 3.2% vs last week</span>
          </div>
          <button 
            id="close-promo-banner"
            onClick={() => setShowPromoBanner(false)} 
            className="text-slate-400 hover:text-white absolute right-4 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header Area */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-5 gap-4">
            
            {/* BRAND TITLE / LOGO: chuse */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#FFE600] rounded-full flex items-center justify-center text-black font-black text-xl shadow-md border border-yellow-300">
                <ShoppingBag className="w-5 h-5 text-black" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 lowercase flex items-center">
                    chuse<span className="text-[#FFE600] font-black">.</span>
                  </h1>
                  <span className="bg-[#FFE600] text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-black/5 animate-pulse">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  South African multi-supermarket bento price comparison engine
                </p>
              </div>
            </div>

            {/* User Account Capsule / Sign In Controls and Province Indicators */}
            <div className="flex items-center justify-between md:justify-end gap-3.5 w-full md:w-auto">
              {user ? (
                <button
                  id="header-user-settings-capsule"
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-yellow-50 border-[#FFE600] ring-2 ring-[#FFE600]/10'
                      : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
                  }`}
                >
                  <img 
                    src={user.avatarUrl} 
                    alt="User Profile" 
                    className="w-6.5 h-6.5 rounded-full bg-slate-100 border border-slate-200"
                  />
                  <div className="text-left leading-none">
                    <span className="text-xs font-black text-slate-800 block">{user.name}</span>
                    <span className="text-[9px] font-black text-[#FFE600] bg-black px-1.5 py-0.5 rounded-sm block uppercase tracking-wider mt-0.5">Edit Profile</span>
                  </div>
                </button>
              ) : (
                <button
                  id="header-signin-cta"
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-full bg-slate-900 hover:bg-[#FFE600] hover:text-black text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span>Sign In / Profile</span>
                </button>
              )}

              {/* Dynamic Province Location Index Indicator */}
              <div className="hidden sm:inline-flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-full border border-slate-200/80 shadow-xs">
                <MapPin className="text-amber-500 w-4 h-4 shrink-0" />
                <span className="text-xs text-slate-600 font-bold">
                  Index: {user ? `${user.region} Province` : 'SA National Average'}
                </span>
              </div>
            </div>

          </div>

          {/* Navigation Tab selection row inside bento header */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 py-2 no-scrollbar">
            <button
              id="tab-specials-trigger"
              onClick={() => setActiveTab('specials')}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                activeTab === 'specials'
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Percent className="w-4 h-4" /> Active Specials
            </button>

            <button
              id="tab-ai-trigger"
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer relative ${
                activeTab === 'ai'
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm'
                  : 'text-slate-550 hover:text-slate-900 bg-amber-50/40 hover:bg-amber-100/60 border border-amber-200/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-300" /> 
              <span>AI Savings Wizard</span>
              <span className="absolute -top-1 right-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-[6.5px] font-black tracking-widest px-1.5 py-0.2 rounded-full uppercase text-white border border-amber-305">
                AI
              </span>
            </button>

            <button
              id="tab-catalog-trigger"
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Compass className="w-4 h-4" /> Product Directory
            </button>

            {/* BARCODE SCANNER TRIGGER - NEW! */}
            <button
              id="tab-scan-trigger"
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer relative ${
                activeTab === 'scan'
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm'
                  : 'text-slate-550 hover:text-slate-900 bg-amber-50/40 hover:bg-amber-100/60 border border-amber-200/50'
              }`}
            >
              <Scan className="w-4 h-4 text-black" /> 
              <span>Scan Barcode</span>
              <span className="absolute -top-1 right-2 bg-red-500 text-[6.5px] font-black tracking-widest px-1.5 py-0.2 rounded-full uppercase text-white animate-pulse">
                New
              </span>
            </button>

            <button
              id="tab-basket-trigger"
              onClick={() => setActiveTab('basket')}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer relative ${
                activeTab === 'basket'
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" /> Basket Optimizer
              {basket.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[9px] rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-sm">
                  {basket.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>

            <button
              id="tab-stats-trigger"
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Inflation Indices
            </button>

            <button
              id="tab-custom-trigger"
              onClick={() => setActiveTab('custom')}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" /> Log Custom Price
            </button>

            {/* USER SETTINGS HUB */}
            <button
              id="tab-settings-trigger"
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                } else {
                  setActiveTab('settings');
                }
              }}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#FFE600] text-black border-transparent shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <User className="w-4 h-4" /> <span>{user ? 'My Hub' : 'Sign In'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main active layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'specials' && (
          <InteractiveSpecialDeals 
            products={products} 
            addToBasket={addToBasket} 
            basket={basket} 
            onAddLiveProducts={handleAddLiveProducts}
          />
        )}

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

        {activeTab === 'stats' && (
          <StatsDashboard products={products} />
        )}

        {activeTab === 'ai' && (
          <AISavingsWizard 
            products={products} 
            basket={basket} 
            user={user}
          />
        )}

        {activeTab === 'custom' && (
          <AddCustomProduct onAddProduct={handleAddFieldCustomProduct} />
        )}

        {activeTab === 'scan' && (
          <BarcodeScanner 
            products={products} 
            onAddToBasket={addToBasket} 
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage 
            user={user} 
            onUpdateUser={(updated) => setUser(updated)} 
            onLogout={async () => {
              try {
                await auth.signOut();
              } catch (e) {
                console.error("Firebase signOut failed", e);
              }
              setUser(null);
              localStorage.removeItem('sa_user_profile');
              setActiveTab('specials');
            }} 
            onClearBasket={clearBasket} 
            products={products}
            onUpdateProducts={saveProducts}
          />
        )}

      </main>

      {/* Auth Modal Overlay portal */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthPage 
            onAuthSuccess={(userProfile) => {
              setUser(userProfile);
              setShowAuthModal(false);
              setActiveTab('settings');
            }}
            onClose={() => setShowAuthModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating dynamic optimizer summary capsule */}
      {basket.length > 0 && activeTab !== 'basket' && currentBest && (
        <div id="floating-basket-capsule" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl px-5 py-4 shadow-xl border border-slate-800 flex items-center gap-4 hover:scale-[1.02] cursor-pointer transition-all max-w-[92%] sm:max-w-md">
          <div className="bg-[#FFE600] rounded-xl p-2.5 text-black shadow-md shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          
          <div className="flex-1 text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider leading-none">Smart Basket Estimate</span>
            <div className="text-xs font-black mt-1 leading-snug text-white flex items-center gap-1.5">
              Compare Basket ({basket.reduce((a, b) => a + b.quantity, 0)} Items)
            </div>
            {currentBest.total > 0 && (
              <p className="text-[11px] text-[#FFE600] font-bold mt-0.5">
                Cheapest: R {currentBest.total.toFixed(2)} at {currentBest.store.name}
              </p>
            )}
          </div>

          <button
            id="floating-basket-optimise-cta"
            onClick={() => setActiveTab('basket')}
            className="bg-[#FFE600] hover:bg-yellow-400 font-extrabold text-[11px] text-black rounded-xl px-4 py-2.5 leading-none shrink-0 cursor-pointer shadow-sm transition-all"
          >
            Optimize Cost
          </button>
        </div>
      )}

      {/* Mini layout footer to match Bento Design pattern */}
      <footer className="mt-12 py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest gap-4">
        <div>chuse - South Africa's #1 Bento Comparison Engine</div>
        <div className="flex gap-6 flex-wrap justify-center">
          <span>Smart Shopper & Xtra Savings Integrated</span>
          <span>Store API Status: Optimal</span>
          <span className="text-slate-900 underline decoration-[#FFE600] decoration-2">Updates every 15 mins</span>
        </div>
      </footer>

    </div>
  );
}
