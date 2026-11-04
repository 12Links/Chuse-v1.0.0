import React from 'react';
import { 
  LayoutGrid, 
  Tag, 
  ScanBarcode, 
  TrendingUp, 
  ShoppingBag 
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'catalog' | 'specials' | 'lists' | 'stats' | 'settings';
  onSelectTab: (tab: 'catalog' | 'specials' | 'lists' | 'stats' | 'settings') => void;
  onOpenCart: () => void;
  onOpenBarcodeScan: () => void;
  basketCount: number;
  basketTotal: number;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenCart,
  onOpenBarcodeScan,
  basketCount,
  basketTotal
}: MobileBottomNavProps) {
  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid grid-cols-5 items-center justify-around gap-1 max-w-md mx-auto">
        {/* 1. Aisles (Catalog) */}
        <button
          type="button"
          onClick={() => {
            onSelectTab('catalog');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all cursor-pointer ${
            activeTab === 'catalog'
              ? 'text-slate-950 font-black'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <LayoutGrid className={`w-5 h-5 ${activeTab === 'catalog' ? 'stroke-[2.5] text-slate-950' : 'text-slate-500'}`} />
            {activeTab === 'catalog' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FFE600]" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Aisles</span>
        </button>

        {/* 2. Specials */}
        <button
          type="button"
          onClick={() => onSelectTab('specials')}
          className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all cursor-pointer ${
            activeTab === 'specials'
              ? 'text-slate-950 font-black'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <Tag className={`w-5 h-5 ${activeTab === 'specials' ? 'stroke-[2.5] text-slate-950' : 'text-slate-500'}`} />
            {activeTab === 'specials' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FFE600]" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Specials</span>
        </button>

        {/* 3. Barcode Scanner Center Action */}
        <button
          type="button"
          onClick={onOpenBarcodeScan}
          className="flex flex-col items-center justify-center py-1 rounded-lg transition-all cursor-pointer group"
          title="Scan barcode"
        >
          <div className="w-8 h-8 rounded-full bg-slate-950 text-[#FFE600] flex items-center justify-center shadow-xs group-active:scale-95 transition-transform">
            <ScanBarcode className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-[9.5px] mt-0.5 font-bold tracking-tight text-slate-800 font-sans">Scan</span>
        </button>

        {/* 4. Compare / Inflation */}
        <button
          type="button"
          onClick={() => onSelectTab('stats')}
          className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all cursor-pointer ${
            activeTab === 'stats'
              ? 'text-slate-950 font-black'
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <div className="relative">
            <TrendingUp className={`w-5 h-5 ${activeTab === 'stats' ? 'stroke-[2.5] text-slate-950' : 'text-slate-500'}`} />
            {activeTab === 'stats' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FFE600]" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-sans">Index</span>
        </button>

        {/* 5. Basket Pill */}
        <button
          type="button"
          onClick={onOpenCart}
          className="flex flex-col items-center justify-center py-1 rounded-lg transition-all cursor-pointer relative"
          aria-label="Open Basket"
        >
          <div className="relative">
            <div className={`p-1 rounded-md ${basketCount > 0 ? 'bg-[#FFE600] text-black shadow-2xs' : 'text-slate-500'}`}>
              <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
            </div>
            {basketCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-slate-950 text-white text-[9px] font-mono font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-xs">
                {basketCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-mono font-bold text-slate-900 tracking-tight">
            {basketCount === 0 ? 'Basket' : `R${Math.round(basketTotal)}`}
          </span>
        </button>
      </div>
    </nav>
  );
}
