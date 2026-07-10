import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  MapPin, 
  CreditCard, 
  Bell, 
  Sliders, 
  RotateCcw, 
  LogOut, 
  Check, 
  Lock, 
  Save, 
  Trash2, 
  Briefcase,
  AlertTriangle,
  Sun,
  Moon
} from 'lucide-react';
import { UserProfile, Product } from '../types';
import { updateUserProfile } from '../lib/api';

interface SettingsPageProps {
  user: UserProfile | null | undefined;
  onUpdateUser: (updated: UserProfile) => void;
  onLogout: () => void;
  onClearBasket: () => void;
  products: Product[];
  onUpdateProducts: (updatedProducts: Product[]) => void;
  isDarkMode: boolean;
  onToggleDarkMode: (isDark: boolean) => void;
}

export default function SettingsPage({ 
  user, 
  onUpdateUser, 
  onLogout, 
  onClearBasket, 
  products, 
  onUpdateProducts,
  isDarkMode,
  onToggleDarkMode
}: SettingsPageProps) {
  const [displayName, setDisplayName] = useState(user?.displayName || 'Guest User');
  const [email, setEmail] = useState(user?.email || 'guest@chuse.co.za');
  const [preferredStoreLocation, setPreferredStoreLocation] = useState(user?.preferredStoreLocation || 'Gauteng');

  const [loyaltyCards, setLoyaltyCards] = useState(user?.loyaltyCards || {
    checkers: false,
    pnp: false,
    woolworths: false,
    shoprite: false,
    spar: false
  });

  const [preferredStores, setPreferredStores] = useState({
    woolworths: true,
    checkers: true,
    pnp: true,
    shoprite: true,
    foodlovers: true,
    boxer: true,
    spar: true
  });

  const [notifications, setNotifications] = useState(true);
  const [showSavingSpecials, setShowSavingSpecials] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');

    const updatedProfile: UserProfile = {
      displayName,
      email,
      avatarUrl: user?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(displayName)}`,
      loyaltyCards,
      preferredStoreLocation,
      isGuest: user?.isGuest
    };

    if (user?.isGuest) {
      onUpdateUser(updatedProfile);
      localStorage.setItem('sa_user_profile', JSON.stringify(updatedProfile));
      setSuccessMsg('Guest settings updated locally!');
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
      return;
    }

    try {
      const backendProfile = await updateUserProfile({
        displayName: updatedProfile.displayName,
        avatarUrl: updatedProfile.avatarUrl,
        loyaltyCards: updatedProfile.loyaltyCards,
        preferredStoreLocation: updatedProfile.preferredStoreLocation
      });

      const mergedProfile: UserProfile = {
        displayName: backendProfile.displayName || updatedProfile.displayName,
        email: backendProfile.email || updatedProfile.email,
        avatarUrl: backendProfile.avatarUrl || updatedProfile.avatarUrl,
        loyaltyCards: backendProfile.loyaltyCards || updatedProfile.loyaltyCards,
        preferredStoreLocation: backendProfile.preferredStoreLocation || updatedProfile.preferredStoreLocation
      };

      onUpdateUser(mergedProfile);
      localStorage.setItem('sa_user_profile', JSON.stringify(mergedProfile));
    } catch (error) {
      console.warn('Backend profile update failed, saving locally:', error);
      onUpdateUser(updatedProfile);
      localStorage.setItem('sa_user_profile', JSON.stringify(updatedProfile));
    }

    setSuccessMsg('Settings saved successfully!');
    
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const handleToggleCard = (card: 'checkers' | 'pnp' | 'woolworths' | 'shoprite' | 'spar') => {
    setLoyaltyCards(prev => ({
      ...prev,
      [card]: !prev[card]
    }));
  };

  const handleToggleStore = (store: keyof typeof preferredStores) => {
    setPreferredStores(prev => ({
      ...prev,
      [store]: !prev[store]
    }));
  };

  const handleResetApp = () => {
    if (confirm('Are you sure you want to restore default products, clear your current basket comparisons, and reset all app configurations?')) {
      localStorage.removeItem('sa_price_compare_products');
      localStorage.removeItem('sa_price_compare_basket');
      onClearBasket();
      alert('Application comparison registers restored to factory settings. Refresh the page to load full catalog defaults.');
      window.location.reload();
    }
  };

  return (
    <div id="settings-view" className="max-w-3xl mx-auto space-y-8">
      {/* Settings Grid Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase">Chuse User Hub & Settings</h2>
          <p className="text-xs text-slate-500 dark:text-slate-450 font-medium mt-1">Manage loyalty card integrations, provinces, matching rules and profiles</p>
        </div>
        
        {user && (
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/15 border border-rose-200 dark:border-rose-900/30 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Profile</span>
          </button>
        )}
      </div>

      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs p-4 rounded-2xl flex items-center gap-2.5 font-bold"
        >
          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card Sidebar */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 space-y-6 shadow-xs flex flex-col items-center text-center transition-colors duration-200">
          <div className="relative group">
            <img 
              src={user?.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=guest`} 
              alt="Avatar" 
              className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-800 object-cover bg-amber-50 dark:bg-slate-950"
            />
            <span className="absolute bottom-0 right-1 bg-[#FFE600] border border-white dark:border-slate-800 text-black px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow-xs">
              {user ? 'PRO' : 'GUEST'}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">{displayName}</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-bold block">{email}</span>
          </div>

          <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-3.5 space-y-2.5 text-left">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Current Status</span>
            
            <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-350">
              <div className="flex items-center justify-between">
                <span>Loyalty Link:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {Object.values(loyaltyCards).filter(Boolean).length} / 5 Cards Linked
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Region:</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                  {preferredStoreLocation}
                </span>
              </div>
            </div>
          </div>

          {!user && (
            <div className="w-full border-t border-slate-150 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Sign in to gain centralized multi-device list comparisons and advanced pricing options.
            </div>
          )}
        </div>

        {/* Main Settings Panel */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 sm:p-8 shadow-xs space-y-6 text-left transition-colors duration-200">
          <form onSubmit={handleSave} className="space-y-8">
            
            {/* Theme Preference Toggle */}
            <div className="space-y-4">
              <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                Theme Preference
              </h3>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl">
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-white block uppercase tracking-wider">Low-Light Dark Mode</span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">High-contrast visual design optimized for low-light readability</span>
                </div>
                
                <button
                  type="button"
                  id="settings-theme-toggle"
                  onClick={() => onToggleDarkMode(!isDarkMode)}
                  className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FFE600] focus:ring-offset-2 ${
                    isDarkMode ? 'bg-[#FFE600]' : 'bg-slate-300 dark:bg-slate-850'
                  }`}
                  role="switch"
                  aria-checked={isDarkMode}
                >
                  <span className="sr-only">Toggle Dark Mode</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white dark:bg-slate-950 shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isDarkMode ? 'translate-x-[22px]' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Profile Inputs */}
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                <User className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                Profile Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Your Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    disabled={!user}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] font-bold text-slate-800 dark:text-slate-100 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={!user}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] font-bold text-slate-800 dark:text-slate-100 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Province Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-500 w-4 h-4" />
                  <select 
                    value={preferredStoreLocation}
                    onChange={e => setPreferredStoreLocation(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="Gauteng">Gauteng</option>
                    <option value="Western Cape">Western Cape</option>
                    <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                    <option value="Eastern Cape">Eastern Cape</option>
                    <option value="Free State">Free State</option>
                    <option value="Mpumalanga">Mpumalanga</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">Staple baseline prices differ slightly due to regional freight/distribution margins</p>
              </div>
            </div>

            {/* Loyalty Cards */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                Loyalty Card Discount Integrations
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">Activated cards automatically subtract 10% - 20% loyalty discounts on eligible items in catalogs.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleCard('checkers')}
                  className={`flex items-center gap-2.5 p-4 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                    loyaltyCards.checkers 
                      ? 'bg-teal-500/10 border-teal-600 dark:border-teal-500 text-teal-900 dark:text-teal-300' 
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    loyaltyCards.checkers ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}>
                    {loyaltyCards.checkers && <span className="text-[9px] font-black">✓</span>}
                  </div>
                  <img 
                    src="/icons/checkers.png" 
                    alt="Checkers" 
                    referrerPolicy="no-referrer"
                    className="h-5 w-auto object-contain max-w-[40px] mix-blend-multiply dark:mix-blend-normal dark:bg-white dark:p-0.5 dark:rounded shrink-0"
                  />
                  <span className="truncate">Xtra Savings</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleCard('pnp')}
                  className={`flex items-center gap-2.5 p-4 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                    loyaltyCards.pnp 
                      ? 'bg-zinc-100 dark:bg-slate-800 border-zinc-950 dark:border-white/40 text-zinc-950 dark:text-white' 
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    loyaltyCards.pnp ? 'bg-zinc-950 dark:bg-slate-100 border-zinc-950 dark:border-slate-100 text-white dark:text-black' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}>
                    {loyaltyCards.pnp && <span className="text-[9px] font-black">✓</span>}
                  </div>
                  <img 
                    src="/icons/pnp.svg" 
                    alt="Pick n Pay" 
                    referrerPolicy="no-referrer"
                    className="h-5 w-auto object-contain max-w-[40px] mix-blend-multiply dark:mix-blend-normal dark:bg-white dark:p-0.5 dark:rounded shrink-0"
                  />
                  <span className="truncate">Smart Shopper</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleCard('woolworths')}
                  className={`flex items-center gap-2.5 p-4 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                    loyaltyCards.woolworths 
                      ? 'bg-black/5 dark:bg-slate-800 border-black dark:border-white text-black dark:text-white' 
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    loyaltyCards.woolworths ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}>
                    {loyaltyCards.woolworths && <span className="text-[9px] font-black">✓</span>}
                  </div>
                  <img 
                    src="/icons/woolworths.svg" 
                    alt="Woolworths" 
                    referrerPolicy="no-referrer"
                    className="h-5 w-auto object-contain max-w-[40px] mix-blend-multiply dark:mix-blend-normal dark:bg-white dark:p-0.5 dark:rounded shrink-0"
                  />
                  <span className="truncate">W-Rewards</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleCard('shoprite')}
                  className={`flex items-center gap-2.5 p-4 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                    loyaltyCards.shoprite 
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-500 dark:border-red-500 text-red-700 dark:text-red-300' 
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    loyaltyCards.shoprite ? 'bg-red-600 border-red-600 text-white' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}>
                    {loyaltyCards.shoprite && <span className="text-[9px] font-black">✓</span>}
                  </div>
                  <img 
                    src="/icons/shoprite.png" 
                    alt="Shoprite" 
                    referrerPolicy="no-referrer"
                    className="h-4 w-auto object-contain max-w-[40px] mix-blend-multiply dark:mix-blend-normal dark:bg-white dark:p-0.5 dark:rounded shrink-0"
                  />
                  <span className="truncate">Shoprite Xtra Savings</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleCard('spar')}
                  className={`flex items-center gap-2.5 p-4 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                    loyaltyCards.spar 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500 text-emerald-800 dark:text-emerald-300' 
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    loyaltyCards.spar ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}>
                    {loyaltyCards.spar && <span className="text-[9px] font-black">✓</span>}
                  </div>
                  <img 
                    src="/icons/spar.jpg" 
                    alt="SPAR" 
                    referrerPolicy="no-referrer"
                    className="h-4 w-auto object-contain max-w-[40px] mix-blend-multiply dark:mix-blend-normal dark:bg-white dark:p-0.5 dark:rounded shrink-0"
                  />
                  <span className="truncate">SPAR Rewards</span>
                </button>
              </div>
            </div>

            {/* Preferred Supermarkets toggles */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                Deselect Supermarkets from Comparisons
              </h3>
              
              <div className="flex flex-wrap gap-2.5">
                {(Object.keys(preferredStores) as Array<keyof typeof preferredStores>).map(storeId => (
                  <button
                    key={storeId}
                    type="button"
                    onClick={() => handleToggleStore(storeId)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border cursor-pointer uppercase tracking-wider transition-all duration-150 ${
                      preferredStores[storeId] 
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 border-transparent' 
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-550 border-slate-200 dark:border-slate-850'
                    }`}
                  >
                    {storeId} {preferredStores[storeId] ? '✓' : '✖'}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification and layout preferences */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <h3 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                App Preferences
              </h3>
              
              <div className="space-y-3 font-semibold text-xs text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={notifications} 
                    onChange={e => setNotifications(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 accent-amber-500 dark:bg-slate-950 cursor-pointer"
                  />
                  <span>Send email alerts when Checkers or PnP log major staples drop</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showSavingSpecials} 
                    onChange={e => setShowSavingSpecials(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 accent-amber-500 dark:bg-slate-950 cursor-pointer"
                  />
                  <span>Prioritize showing South African Xtra Savings pricing over standard shelf prices</span>
                </label>
              </div>
            </div>

            {/* Submit settings button */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-full text-xs font-black text-black bg-[#FFE600] speed-hover shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-4.5 h-4.5 text-black" />
                <span>Save Setup Preferences</span>
              </button>
              
              <button
                type="button"
                onClick={handleResetApp}
                className="inline-flex items-center justify-center gap-1.5 px-6 py-3.5 rounded-full text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 border border-transparent dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 active:scale-[0.98] transition-all cursor-pointer"
              >
                <RotateCcw className="w-4.5 h-4.5" />
                <span>Reset Local Registers</span>
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* Security alert box */}
      <div className="bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/20 rounded-[24px] p-5.5 flex gap-4 text-left transition-colors duration-200">
        <AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Offline Storage Isolation</h4>
          <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed font-semibold">
            chuse. operates on strict sandboxed browser isolation. None of your grocery lists, pricing edits, and linked cards details ever leave this portal. All credentials reside only in your localized cookie/storage indexes.
          </p>
        </div>
      </div>
    </div>
  );
}
