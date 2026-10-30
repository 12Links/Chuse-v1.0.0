import React from 'react';
import { StoreId } from '../types';

interface HeroPromosProps {
  selectedStore: StoreId | 'all';
  onSelectStore: (store: StoreId | 'all') => void;
  onOpenAiWizard?: () => void;
  onOpenSpecials?: () => void;
}

const STORE_PILLS: Array<{ id: StoreId | 'all'; name: string; bg: string; text: string; activeBorder: string }> = [
  { id: 'all', name: 'All 7 Supermarkets', bg: 'bg-slate-900 dark:bg-white text-white dark:text-black', text: '', activeBorder: 'ring-2 ring-black dark:ring-white' },
  { id: 'checkers', name: 'Checkers', bg: 'bg-[#008374] text-white', text: '', activeBorder: 'ring-2 ring-[#008374]' },
  { id: 'pnp', name: 'Pick n Pay', bg: 'bg-[#002B49] text-white', text: '', activeBorder: 'ring-2 ring-[#002B49]' },
  { id: 'woolworths', name: 'Woolworths', bg: 'bg-black text-white', text: '', activeBorder: 'ring-2 ring-black dark:ring-white' },
  { id: 'shoprite', name: 'Shoprite', bg: 'bg-[#D61B28] text-white', text: '', activeBorder: 'ring-2 ring-[#D61B28]' },
  { id: 'spar', name: 'SPAR', bg: 'bg-[#007A3D] text-white', text: '', activeBorder: 'ring-2 ring-[#007A3D]' },
  { id: 'boxer', name: 'Boxer', bg: 'bg-[#FF6A13] text-white', text: '', activeBorder: 'ring-2 ring-[#FF6A13]' },
  { id: 'foodlovers', name: "Food Lover's", bg: 'bg-[#557A18] text-white', text: '', activeBorder: 'ring-2 ring-[#557A18]' },
];

export default function HeroPromos({
  selectedStore,
  onSelectStore,
  onOpenSpecials
}: HeroPromosProps) {
  return (
    <div className="bg-[#F7F6F0] dark:bg-slate-900 border border-[#E2E0D8] dark:border-slate-800 rounded-md p-4 sm:p-5">
      {/* Top Editorial Dispatch Eyebrow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E0D8] dark:border-slate-800 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="bg-[#FFE600] text-black font-extrabold text-[10px] px-2 py-0.5 rounded-[3px] tracking-wider uppercase font-mono">
            WEEKLY DISPATCH
          </span>
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
            South Africa Retail Price Audit
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          Updated today • Mzansi Grocery Basket Index
        </div>
      </div>

      {/* Main Headline & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase font-mono leading-tight">
            Compare Before You Leave Home
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl font-sans leading-relaxed">
            Real shelf prices across Checkers, Pick n Pay, Woolworths, Shoprite, SPAR, Boxer, and Food Lover's Market. 
            Select a retailer below or compare across all stores.
          </p>
        </div>

        {onOpenSpecials && (
          <button
            onClick={onOpenSpecials}
            className="self-start md:self-auto text-xs font-bold text-slate-900 dark:text-slate-100 underline decoration-[#FFE600] decoration-2 underline-offset-4 hover:text-amber-600 dark:hover:text-[#FFE600] transition-colors cursor-pointer shrink-0"
          >
            Browse This Week's Active Specials →
          </button>
        )}
      </div>

      {/* Retailer Store Quick Selector Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 font-mono">
          Filter Store:
        </span>
        {STORE_PILLS.map((st) => {
          const isSelected = selectedStore === st.id;
          return (
            <button
              key={st.id}
              onClick={() => onSelectStore(st.id)}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? `${st.bg} ${st.activeBorder} shadow-xs font-black`
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-[#E2E0D8] dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              {st.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
