import React from 'react';
import { StoreId } from '../types';
import { RETAILER_THEMES } from '../lib/retailerTokens';
import { Sparkles, ArrowRight } from 'lucide-react';

interface HeroPromosProps {
  selectedStore: StoreId | 'all';
  onSelectStore: (store: StoreId | 'all') => void;
  onOpenAiWizard?: () => void;
  onOpenSpecials?: () => void;
}

const STORE_PILLS: Array<{ 
  id: StoreId | 'all'; 
  name: string; 
  dotColor: string; 
  activeBg: string; 
}> = [
  { id: 'all', name: 'All 7 Supermarkets', dotColor: 'bg-slate-900', activeBg: 'bg-slate-950 text-white' },
  { id: 'checkers', name: 'Checkers', dotColor: 'bg-[#004D40]', activeBg: 'bg-[#004D40] text-[#FFE600]' },
  { id: 'pnp', name: 'Pick n Pay', dotColor: 'bg-[#0B2B6B]', activeBg: 'bg-[#0B2B6B] text-white' },
  { id: 'woolworths', name: 'Woolworths', dotColor: 'bg-black', activeBg: 'bg-black text-white' },
  { id: 'shoprite', name: 'Shoprite', dotColor: 'bg-[#DC2626]', activeBg: 'bg-[#DC2626] text-white' },
  { id: 'spar', name: 'SPAR', dotColor: 'bg-[#15803D]', activeBg: 'bg-[#15803D] text-white' },
  { id: 'boxer', name: 'Boxer', dotColor: 'bg-[#EA580C]', activeBg: 'bg-[#EA580C] text-white' },
  { id: 'foodlovers', name: "Food Lover's", dotColor: 'bg-[#365314]', activeBg: 'bg-[#365314] text-white' },
];

export default function HeroPromos({
  selectedStore,
  onSelectStore,
  onOpenSpecials
}: HeroPromosProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-2xs w-full max-w-full overflow-hidden font-sans">
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0">
        {/* Left: Compare Stores label + Branded Retailer Chips */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          <span className="text-xs font-bold text-slate-600 shrink-0 font-sans flex items-center gap-1.5 mr-0.5 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Compare:
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {STORE_PILLS.map((st) => {
              const isSelected = selectedStore === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onSelectStore(st.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 font-sans ${
                    isSelected
                      ? `${st.activeBg} font-black shadow-xs ring-1 ring-black/10`
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 hover:text-black hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dotColor} ${
                      isSelected && st.id !== 'all' ? 'ring-1 ring-white' : ''
                    }`}
                  />
                  <span>{st.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Specials link */}
        {onOpenSpecials && (
          <button
            type="button"
            onClick={onOpenSpecials}
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-slate-950 hover:text-black shrink-0 px-3 py-1.5 rounded-lg bg-[#FFE600] hover:bg-yellow-400 border border-yellow-400 transition-colors cursor-pointer font-sans shadow-2xs"
          >
            <span>Active Specials</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
