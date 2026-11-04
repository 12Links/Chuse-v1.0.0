import React, { useState, useEffect } from 'react';
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
  X,
  Truck,
  Store,
  Navigation,
  RefreshCw,
  Smartphone,
  Cloud,
  BellRing,
  ArrowRight
} from 'lucide-react';
import { UserProfile, Product } from '../types';
import { updateUserProfile } from '../lib/api';
import { FulfillmentSettings } from './FulfillmentModal';
import { 
  sendTestNotification, 
  getNotificationStatus, 
  setNotificationPreference,
  requestNotificationPermission 
} from '../lib/notificationService';

interface SettingsPageProps {
  user: UserProfile | null | undefined;
  onUpdateUser: (updated: UserProfile) => void;
  onLogout: () => void;
  onClearBasket: () => void;
  products: Product[];
  onUpdateProducts: (updatedProducts: Product[]) => void;
  fulfillmentSettings: FulfillmentSettings;
  onOpenFulfillmentModal: () => void;
  onOpenNearbyStoresModal: () => void;
  onManualSyncCart?: () => Promise<void> | void;
}

export default function SettingsPage({ 
  user, 
  onUpdateUser, 
  onLogout, 
  onClearBasket, 
  products, 
  onUpdateProducts,
  fulfillmentSettings,
  onOpenFulfillmentModal,
  onOpenNearbyStoresModal,
  onManualSyncCart
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

  // Push notifications state
  const [pushAlertsEnabled, setPushAlertsEnabled] = useState(true);
  const [isSendingTestNotif, setIsSendingTestNotif] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState('');

  // Cloud sync state
  const [isSyncingCart, setIsSyncingCart] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState('');

  useEffect(() => {
    getNotificationStatus().then(status => {
      setPushAlertsEnabled(status.enabledByUser);
    });
  }, []);

  const handleTogglePushAlerts = async (enabled: boolean) => {
    setPushAlertsEnabled(enabled);
    setNotificationPreference(enabled);
    if (enabled) {
      await requestNotificationPermission();
    }
  };

  const handleTestNotification = async () => {
    setIsSendingTestNotif(true);
    setNotifFeedback('');
    try {
      const sent = await sendTestNotification();
      if (sent) {
        setNotifFeedback('Test alert dispatched! Check your notification bar.');
      } else {
        setNotifFeedback('Please grant notification permission in system settings.');
      }
    } catch (err: any) {
      setNotifFeedback('Notification failed: ' + (err.message || 'error'));
    } finally {
      setIsSendingTestNotif(false);
      setTimeout(() => setNotifFeedback(''), 5000);
    }
  };

  const handleTriggerManualSync = async () => {
    if (!onManualSyncCart) return;
    setIsSyncingCart(true);
    setSyncFeedback('');
    try {
      await onManualSyncCart();
      setSyncFeedback('Cart synchronized with cloud successfully!');
    } catch (err: any) {
      setSyncFeedback('Sync error: ' + (err.message || 'Could not connect to cloud'));
    } finally {
      setIsSyncingCart(false);
      setTimeout(() => setSyncFeedback(''), 4000);
    }
  };

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

            {/* 1. Location & Delivery Mode Settings (Moved from Header to Settings) */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Delivery Location & Store Pricing</h3>
                    <p className="text-xs text-slate-500 font-medium">Set your active suburb and switch between Sixty60/ASAP delivery vs. in-store prices</p>
                  </div>
                </div>
              </div>

              {/* Current active location details */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-semibold">Active Suburb:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    {fulfillmentSettings.suburb}, {fulfillmentSettings.province} ({fulfillmentSettings.postalCode})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                  <span className="text-slate-500 font-semibold">Pricing Model:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    {fulfillmentSettings.mode === 'deliveryApp' ? (
                      <>
                        <Truck className="w-3.5 h-3.5 text-[#008374]" />
                        <span>Delivery Apps (Checkers Sixty60 & PnP ASAP!)</span>
                      </>
                    ) : (
                      <>
                        <Store className="w-3.5 h-3.5 text-slate-700" />
                        <span>In-Store Walk-in Shelf Pricing</span>
                      </>
                    )}
                  </span>
                </div>
                {fulfillmentSettings.activeStoreBranchName && (
                  <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                    <span className="text-slate-500 font-semibold">Closest Branch:</span>
                    <span className="font-bold text-slate-900">
                      {fulfillmentSettings.activeStoreBranchName}{' '}
                      {fulfillmentSettings.distanceFormatted && (
                        <span className="text-emerald-700 font-bold">({fulfillmentSettings.distanceFormatted})</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onOpenFulfillmentModal}
                  className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#FFE600]" />
                  <span>Change Suburb & Pricing</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenNearbyStoresModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-slate-700" />
                  <span>Find Stores on GPS Radar</span>
                </button>
              </div>
            </div>

            {/* 2. Multi-Device Cloud Cart Sync */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-700">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Multi-Device Cart Cloud Sync</h3>
                    <p className="text-xs text-slate-500 font-medium">Keep your shopping basket and price comparisons in sync between Web and Mobile</p>
                  </div>
                </div>

                {user && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Live Sync Active
                  </span>
                )}
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Account Status:</span>
                  <span className="font-bold text-slate-900">
                    {user ? `Connected (${user.email})` : 'Guest Mode (Local Storage)'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-500 font-semibold">Real-Time Sync:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Active via Supabase Cloud
                  </span>
                </div>
              </div>

              {syncFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncFeedback}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTriggerManualSync}
                  disabled={isSyncingCart}
                  className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-colors shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#FFE600] ${isSyncingCart ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCart ? 'Syncing...' : 'Sync Cart Now'}</span>
                </button>
                <span className="text-[11px] text-slate-500">
                  Any basket created on the web app will immediately reflect on your phone.
                </span>
              </div>
            </div>

            {/* 3. Push Notifications & Price Alerts */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Push Notifications & Price Alerts</h3>
                    <p className="text-xs text-slate-500 font-medium">Get phone alerts when prices drop on your basket items or staple specials appear</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushAlertsEnabled}
                    onChange={(e) => handleTogglePushAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FFE600]"></div>
                </label>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Device Notifications:</span>
                  <span className={`font-bold ${pushAlertsEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {pushAlertsEnabled ? 'Enabled on this phone' : 'Muted'}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed border-t border-slate-100 pt-2">
                  The app automatically checks prices across Woolies, Checkers, PnP, Shoprite, and SPAR and sends a push banner if items in your basket drop in price.
                </p>
              </div>

              {notifFeedback && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{notifFeedback}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={isSendingTestNotif}
                  className="px-4 py-2.5 rounded-xl bg-[#FFE600] hover:bg-yellow-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-colors border border-yellow-400 shrink-0"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isSendingTestNotif ? 'Dispatching...' : 'Send Test Alert to Phone'}</span>
                </button>
                <span className="text-[11px] text-slate-500">
                  Tap to verify notifications ring your phone's status bar.
                </span>
              </div>
            </div>

            {/* Profile Inputs */}
            <div className="space-y-4">
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
                    {loyaltyCards.checkers && <Check className="w-2.5 h-2.5 stroke-[3]" />}
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
                    {loyaltyCards.pnp && <Check className="w-2.5 h-2.5 stroke-[3]" />}
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
                    {loyaltyCards.woolworths && <Check className="w-2.5 h-2.5 stroke-[3]" />}
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
                    {loyaltyCards.shoprite && <Check className="w-2.5 h-2.5 stroke-[3]" />}
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
                    {loyaltyCards.spar && <Check className="w-2.5 h-2.5 stroke-[3]" />}
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
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer uppercase transition-all duration-150 flex items-center gap-1.5 font-sans ${
                      preferredStores[storeId] 
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 border-transparent' 
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-550 border-slate-200 dark:border-slate-850'
                    }`}
                  >
                    <span>{storeId}</span>
                    {preferredStores[storeId] ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <X className="w-3 h-3 text-slate-400" />
                    )}
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
