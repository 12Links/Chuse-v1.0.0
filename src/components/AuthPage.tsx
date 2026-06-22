import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  ShieldCheck, 
  CreditCard, 
  ArrowRight, 
  Sparkles,
  CheckCircle,
  X,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { auth, googleProvider, db, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, doc, setDoc, getDoc } from '../lib/firebase';

interface AuthPageProps {
  onAuthSuccess: (user: UserProfile) => void;
  onClose?: () => void;
}

export default function AuthPage({ onAuthSuccess, onClose }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Loyalty Cards Integration
  const [loyaltyCards, setLoyaltyCards] = useState({
    checkers: false,
    pnp: false,
    woolworths: false,
    shoprite: false,
    spar: false
  });
  
  const [region, setRegion] = useState('Gauteng');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleCard = (card: 'checkers' | 'pnp' | 'woolworths' | 'shoprite' | 'spar') => {
    setLoyaltyCards(prev => ({ ...prev, [card]: !prev[card] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in email and password.');
      return;
    }
    
    if (isSignUp && !name) {
      setError('Please enter your name.');
      return;
    }

    setIsLoading(true);

    try {
      let userCred;
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        userCred = credential.user;
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        userCred = credential.user;
      }

      let currentName = name;
      let currentCards = loyaltyCards;
      let currentRegion = region;

      if (!isSignUp) {
        try {
          const userDoc = await getDoc(doc(db, "users", userCred.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name) currentName = data.name;
            if (data.loyaltyCards) currentCards = data.loyaltyCards;
            if (data.region) currentRegion = data.region;
          }
        } catch (dbErr) {
          console.warn("Could not retrieve user settings from Firestore", dbErr);
        }
      } else {
        try {
          await setDoc(doc(db, "users", userCred.uid), {
            uid: userCred.uid,
            name: currentName,
            email: email,
            loyaltyCards: currentCards,
            region: currentRegion,
            updatedAt: new Date().toISOString()
          });
        } catch (dbErr) {
          console.warn("Could not save new user settings to Firestore", dbErr);
        }
      }

      const userProfile: UserProfile = {
        name: currentName || userCred.email?.split('@')[0] || 'Member',
        email: userCred.email || email,
        avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(currentName || email)}`,
        loyaltyCards: currentCards,
        region: currentRegion
      };

      localStorage.setItem('sa_user_profile', JSON.stringify(userProfile));
      onAuthSuccess(userProfile);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userCred = result.user;
      
      let currentCards = loyaltyCards;
      let currentRegion = region;

      try {
        const userDoc = await getDoc(doc(db, "users", userCred.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.loyaltyCards) currentCards = data.loyaltyCards;
          if (data.region) currentRegion = data.region;
        } else {
          await setDoc(doc(db, "users", userCred.uid), {
            uid: userCred.uid,
            name: userCred.displayName || userCred.email?.split('@')[0] || 'Member',
            email: userCred.email,
            loyaltyCards: currentCards,
            region: currentRegion,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (dbErr) {
        console.warn("Could not sync user profile with Firestore", dbErr);
      }

      const userProfile: UserProfile = {
        name: userCred.displayName || userCred.email?.split('@')[0] || 'Member',
        email: userCred.email || '',
        avatarUrl: userCred.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userCred.email || '')}`,
        loyaltyCards: currentCards,
        region: currentRegion
      };

      localStorage.setItem('sa_user_profile', JSON.stringify(userProfile));
      onAuthSuccess(userProfile);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-white rounded-[32px] shadow-2xl border border-slate-250 w-full max-w-lg overflow-hidden relative"
      >
        {/* Close Button */}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Top Branding Bar */}
        <div className="bg-slate-900 text-white p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFE600]/10 rounded-full blur-3xl" />
          
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#FFE600] text-black text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
              chuse.
            </span>
          </div>
          
          <h2 className="text-2xl font-black tracking-tight mt-1">
            {isSignUp ? 'Join chuse. Saving Hub' : 'Welcome back to chuse.'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
            {isSignUp 
              ? 'Unlock customized supermarket matches, loyalty discounts, and real-time barcode scanning.' 
              : 'Sign in to access your synchronized lists and compare loyalty card specials across South Africa.'
            }
          </p>
        </div>

        {/* Main Form content */}
        <div className="p-8 space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-4 rounded-2xl flex items-center gap-2.5 font-semibold"
            >
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Your Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="e.g. Sipho Ndlovu"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] font-semibold text-slate-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="email" 
                  placeholder="name@domain.co.za"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] font-semibold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] font-semibold text-slate-800"
                />
              </div>
            </div>

            {/* Loyalty cards selection during Sign Up */}
            {isSignUp && (
              <div className="space-y-2.5 pt-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                  Select Your Supermarket Loyalty Cards
                </label>
                <p className="text-[11px] text-slate-450 leading-none">
                  Check the cards you hold for instant special adjustments!
                </p>
                
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => toggleCard('checkers')}
                    className={`flex items-center gap-2 p-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                      loyaltyCards.checkers 
                        ? 'bg-[#006A4E]/10 border-[#006A4E] text-[#006A4E]' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      loyaltyCards.checkers ? 'bg-[#006A4E] border-[#006A4E] text-white' : 'border-slate-350 bg-white'
                    }`}>
                      {loyaltyCards.checkers && <span className="text-[9px] font-black">✓</span>}
                    </div>
                    <span>Xtra Savings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCard('pnp')}
                    className={`flex items-center gap-2 p-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                      loyaltyCards.pnp 
                        ? 'bg-[#E11B22]/10 border-[#E11B22] text-[#E11B22]' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      loyaltyCards.pnp ? 'bg-[#E11B22] border-[#E11B22] text-white' : 'border-slate-350 bg-white'
                    }`}>
                      {loyaltyCards.pnp && <span className="text-[9px] font-black">✓</span>}
                    </div>
                    <span>Smart Shopper</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCard('woolworths')}
                    className={`flex items-center gap-2 p-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                      loyaltyCards.woolworths 
                        ? 'bg-black/5 border-black text-black' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      loyaltyCards.woolworths ? 'bg-black border-black text-white' : 'border-slate-350 bg-white'
                    }`}>
                      {loyaltyCards.woolworths && <span className="text-[9px] font-black">✓</span>}
                    </div>
                    <span>W-Rewards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCard('shoprite')}
                    className={`flex items-center gap-2 p-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                      loyaltyCards.shoprite 
                        ? 'bg-red-50 border-red-500 text-red-650' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      loyaltyCards.shoprite ? 'bg-red-600 border-red-600 text-white' : 'border-slate-350 bg-white'
                    }`}>
                      {loyaltyCards.shoprite && <span className="text-[9px] font-black">✓</span>}
                    </div>
                    <span>Shoprite Xtra Savings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCard('spar')}
                    className={`flex items-center gap-2 p-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                      loyaltyCards.spar 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      loyaltyCards.spar ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-350 bg-white'
                    }`}>
                      {loyaltyCards.spar && <span className="text-[9px] font-black">✓</span>}
                    </div>
                    <span>SPAR Rewards</span>
                  </button>
                </div>
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">Shopping Province</label>
                <select 
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#FFE600] font-bold text-slate-705 cursor-pointer"
                >
                  <option value="Gauteng">Gauteng</option>
                  <option value="Western Cape">Western Cape</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-black text-black bg-[#FFE600] hover:bg-yellow-400 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer shadow-sm mt-3"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Saving Profile' : 'Access Account'}</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </>
              )}
            </button>
          </form>

          {/* Continue with Google */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">or connect instantly</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full inline-flex items-center justify-center gap-2.5 py-3 rounded-full text-xs font-black text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shadow-xs font-sans mb-1"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-bold text-amber-600 hover:text-amber-800 hover:underline cursor-pointer bg-transparent border-none outline-none"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
