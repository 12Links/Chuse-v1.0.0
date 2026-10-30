import React, { useState, useEffect } from 'react';
import { StoreId } from '../types';
import { 
  Sparkles, 
  TrendingDown, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Percent, 
  Store as StoreIcon, 
  Zap, 
  ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeroPromosProps {
  selectedStore: StoreId | 'all';
  onSelectStore: (store: StoreId | 'all') => void;
  onOpenAiWizard: () => void;
  onOpenSpecials: () => void;
}

const PROMO_SLIDES = [
  {
    id: 1,
    tag: 'RETAIL BENCHMARK 2026',
    title: 'Checkers vs Pick n Pay vs Woolworths',
    subtitle: 'Live basket indices across 170+ South African supermarket staples updated daily.',
    badge: 'Save up to 18% on Split Baskets',
    cta: 'Explore Active Specials',
    action: 'specials',
    bgGradient: 'from-slate-950 via-slate-900 to-teal-950',
    accentColor: '#FFE600'
  },
  {
    id: 2,
    tag: 'SMART SPLIT STRATEGY',
    title: 'Split Your Grocery Trip & Pocket the Difference',
    subtitle: 'Buy milk & bread at Shoprite, staples at Checkers, and organics at Woolworths.',
    badge: 'Average ZAR 420/month Saved',
    cta: 'Optimize Your Basket',
    action: 'basket',
    bgGradient: 'from-emerald-950 via-slate-900 to-slate-950',
    accentColor: '#10b981'
  },
  {
    id: 3,
    tag: 'GEMINI 2.5 AI COACH',
    title: 'Meet the chuse. Grocery Savings Wizard',
    subtitle: 'Get instant house-brand swap suggestions and budget-friendly Mzansi meal plans.',
    badge: 'Powered by Gemini AI',
    cta: 'Launch AI Savings Coach',
    action: 'ai',
    bgGradient: 'from-amber-950 via-slate-900 to-indigo-950',
    accentColor: '#f59e0b'
  }
];

const STORE_PILLS: Array<{ id: StoreId | 'all'; name: string; bg: string; text: string; border: string }> = [
  { id: 'all', name: 'All 7 Supermarkets', bg: 'bg-[#FFE600]', text: 'text-black', border: 'border-yellow-400' },
  { id: 'checkers', name: 'Checkers', bg: 'bg-teal-700', text: 'text-white', border: 'border-teal-600' },
  { id: 'pnp', name: 'Pick n Pay', bg: 'bg-[#8b0029]', text: 'text-white', border: 'border-rose-900' },
  { id: 'woolworths', name: 'Woolworths', bg: 'bg-black', text: 'text-white', border: 'border-neutral-800' },
  { id: 'shoprite', name: 'Shoprite', bg: 'bg-red-600', text: 'text-white', border: 'border-red-500' },
  { id: 'spar', name: 'SPAR', bg: 'bg-emerald-700', text: 'text-white', border: 'border-emerald-600' },
  { id: 'boxer', name: 'Boxer', bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-500' },
  { id: 'foodlovers', name: "Food Lover's", bg: 'bg-lime-800', text: 'text-white', border: 'border-lime-700' },
];

export default function HeroPromos({
  selectedStore,
  onSelectStore,
  onOpenAiWizard,
  onOpenSpecials
}: HeroPromosProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % PROMO_SLIDES.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const slide = PROMO_SLIDES[currentSlide];

  return (
    <div className="space-y-4">
      {/* High-Impact Retail Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-800/10 dark:border-slate-800">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4 }}
            className={`bg-gradient-to-r ${slide.bgGradient} p-6 sm:p-10 text-white min-h-[200px] sm:min-h-[220px] flex flex-col justify-between relative`}
          >
            {/* Background Decorative Graphic */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center overflow-hidden">
              <StoreIcon className="w-80 h-80 text-white transform rotate-12 translate-x-12" />
            </div>

            {/* Top Tag & Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FFE600] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {slide.tag}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-xs">
                <ShieldCheck className="w-3 h-3 text-[#FFE600]" />
                {slide.badge}
              </span>
            </div>

            {/* Main Content */}
            <div className="my-3 space-y-1.5 max-w-2xl relative z-10">
              <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                {slide.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xl">
                {slide.subtitle}
              </p>
            </div>

            {/* Action CTA & Slide Dots */}
            <div className="flex items-center justify-between pt-2 relative z-10">
              <button
                onClick={() => {
                  if (slide.action === 'ai') onOpenAiWizard();
                  else onOpenSpecials();
                }}
                className="px-5 py-2.5 rounded-full bg-[#FFE600] hover:bg-yellow-400 active:scale-95 text-black font-black text-xs transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <span>{slide.cta}</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>

              <div className="flex items-center gap-2">
                {PROMO_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentSlide === idx ? 'w-6 bg-[#FFE600]' : 'w-2 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Supermarket Brand Filter Strip */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 shrink-0 hidden md:inline">
            Retailer Filter:
          </span>
          {STORE_PILLS.map((pill) => {
            const isSelected = selectedStore === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => onSelectStore(pill.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? `${pill.bg} ${pill.text} shadow-sm ring-2 ring-slate-950/20 dark:ring-white/20 scale-[1.02]`
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/60'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-400'}`}></span>
                <span>{pill.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
