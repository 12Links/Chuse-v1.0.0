import React from 'react';
import { StoreId } from '../types';

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
  activeBorder: string;
}> = [
  { id: 'all', name: 'All 7 Stores', dotColor: 'bg-slate-900', activeBg: 'bg-slate-950 text-white', activeBorder: 'border-slate-950' },
  { id: 'checkers', name: 'Checkers', dotColor: 'bg-[#008374]', activeBg: 'bg-[#008374] text-white', activeBorder: 'border-[#008374]' },
  { id: 'pnp', name: 'Pick n Pay', dotColor: 'bg-[#002B49]', activeBg: 'bg-[#002B49] text-white', activeBorder: 'border-[#002B49]' },
  { id: 'woolworths', name: 'Woolworths', dotColor: 'bg-black', activeBg: 'bg-black text-white', activeBorder: 'border-black' },
  { id: 'shoprite', name: 'Shoprite', dotColor: 'bg-[#D61B28]', activeBg: 'bg-[#D61B28] text-white', activeBorder: 'border-[#D61B28]' },
  { id: 'spar', name: 'SPAR', dotColor: 'bg-[#007A3D]', activeBg: 'bg-[#007A3D] text-white', activeBorder: 'border-[#007A3D]' },
  { id: 'boxer', name: 'Boxer', dotColor: 'bg-[#FF6A13]', activeBg: 'bg-[#FF6A13] text-white', activeBorder: 'border-[#FF6A13]' },
  { id: 'foodlovers', name: "Food Lover's", dotColor: 'bg-[#557A18]', activeBg: 'bg-[#557A18] text-white', activeBorder: 'border-[#557A18]' },
];

export default function HeroPromos({
  selectedStore,
  onSelectStore,
  onOpenSpecials
}: HeroPromosProps) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E2E0D8] rounded-[6px] px-3.5 py-2 sm:py-2.5 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Compare Stores label + Branded Retailer Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 shrink-0 font-mono flex items-center gap-1.5 mr-1 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Compare Stores:
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {STORE_PILLS.map((st) => {
              const isSelected = selectedStore === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => onSelectStore(st.id)}
                  className={`px-2.5 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 font-sans ${
                    isSelected
                      ? `${st.activeBg} font-black shadow-2xs`
                      : 'bg-[#F7F6F0] text-slate-700 border border-[#E2E0D8] hover:border-slate-400 hover:text-black'
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
            onClick={onOpenSpecials}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 hover:text-black shrink-0 px-3 py-1.5 rounded-[4px] bg-[#FFE600] hover:bg-yellow-400 border border-black/10 transition-colors cursor-pointer font-sans shadow-2xs"
          >
            <span>Active Specials</span>
            <span className="font-mono">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
