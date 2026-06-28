import React, { useState, useEffect } from 'react';
import { Product, Store, StoreId, BasketItem } from '../types';
import { STORES } from '../data/catalog';
import { 
  Sparkles, 
  Calendar, 
  ShoppingCart, 
  Percent, 
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { PriceHistoryChart } from './PriceHistoryChart';

interface InteractiveSpecialDealsProps {
  products: Product[];
  addToBasket: (productId: string) => void;
  basket: BasketItem[];
  onAddLiveProducts: (newProducts: Product[]) => void;
}

export default function InteractiveSpecialDeals({ 
  products, 
  addToBasket, 
  basket,
  onAddLiveProducts
}: InteractiveSpecialDealsProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 42, seconds: 19 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 }; // Reset
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  // Filter products for active specials
  const specials = products.flatMap(p => 
    p.prices
      .filter(pr => pr.onSpecial)
      .map(pr => ({
        product: p,
        store: STORES.find(s => s.id === pr.storeId)!,
        priceInfo: pr
      }))
  );

  const getBasketQty = (productId: string) => {
    return basket.find(item => item.productId === productId)?.quantity || 0;
  };

  return (
    <div id="specials-section" className="space-y-6">
      {/* Specials Cards styled like Bento Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {specials.map((special, index) => {
          const qtyInBasket = getBasketQty(special.product.id);
          // Find normal price to show discount
          const otherStorePrices = special.product.prices
            .filter(pr => pr.inStock && pr.storeId !== special.store.id)
            .map(pr => pr.price);
          const avgOtherPrice = otherStorePrices.length > 0 
            ? otherStorePrices.reduce((a, b) => a + b, 0) / otherStorePrices.length 
            : special.priceInfo.price * 1.25;
          const diffPct = Math.max(5, Math.round(((avgOtherPrice - special.priceInfo.price) / avgOtherPrice) * 105));

          return (
            <motion.div
              key={`${special.product.id}-${special.store.id}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all relative overflow-hidden group"
              id={`special-card-${special.product.id}`}
            >
              {/* Corner Ribbon for discount % */}
              <div className="absolute top-0 right-0 bg-[#FFE600] text-black text-xs font-black px-4.5 py-2 rounded-tr-3xl shadow-xs flex items-center gap-1 border-l border-b border-yellow-300">
                <Percent className="w-3.5 h-3.5 stroke-[2.5]" />
                {diffPct}% CHEAPER
              </div>

              <div className="pt-2">
                {/* Store badge */}
                <div className="flex items-center gap-2 mb-4">
                  {special.store.logoUrl ? (
                    <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200/50 rounded-full py-0.5 pl-1.5 pr-3 shadow-2xs">
                      <img 
                        src={special.store.logoUrl} 
                        alt={special.store.name} 
                        referrerPolicy="no-referrer"
                        className="h-5 w-auto object-contain shrink-0 max-w-[60px] mix-blend-multiply"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="text-[10px] text-neutral-700 font-extrabold uppercase tracking-wider">
                        {special.store.name}
                      </span>
                    </div>
                  ) : (
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                      special.store.id === 'checkers' ? 'bg-[#006A4E] text-white' :
                      special.store.id === 'woolworths' ? 'bg-black text-white' :
                      special.store.id === 'pnp' ? 'bg-zinc-950 text-white' :
                      special.store.logoColor
                    }`}>
                      {special.store.name}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-bold font-mono">{special.product.category}</span>
                </div>

                {/* Product details side-by-side with Image Thumbnail (User Request feature) */}
                <div className="flex items-center gap-4 mb-4">
                  {special.product.imageUrl ? (
                    <img 
                      src={special.product.imageUrl} 
                      alt={special.product.name} 
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-2xl object-cover shrink-0 bg-slate-50 border border-slate-150 shadow-xs"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/100x100?text=${encodeURIComponent(special.product.name.charAt(0))}`;
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-amber-50/50 flex items-center justify-center text-amber-600 border border-amber-200/30 shrink-0 font-extrabold text-lg font-mono uppercase">
                      {special.product.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-slate-800 text-lg line-clamp-2 leading-snug group-hover:text-amber-650 transition-colors">
                      {special.product.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      Unit Pack: <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm">{special.product.unit}</span>
                    </p>
                  </div>
                </div>

                {/* Promo detail popup styled as clean modern block */}
                <div className="bg-amber-100/15 rounded-2xl p-3.5 mb-5 border border-amber-200 flex items-start gap-2.5">
                  <div className="bg-[#FFE600] text-black rounded-full p-1 shrink-0 mt-0.5 border border-yellow-300">
                    <Percent className="w-3 h-3 text-black" />
                  </div>
                  <div className="text-xs text-amber-950 font-bold leading-normal">
                    {special.priceInfo.specialDetail}
                  </div>
                </div>
              </div>

              {/* Price fluctuations over the last 30 days */}
              <div className="px-1.5 pb-2">
                <PriceHistoryChart product={special.product} />
              </div>

              {/* Pricing & CTA */}
              <div className="flex items-center justify-between pt-4 border-t border-dashed border-slate-150 mt-auto">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Special Price</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-black text-slate-900 text-2xl font-mono">
                      R {special.priceInfo.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 line-through font-semibold font-mono">
                      R {avgOtherPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  id={`add-special-${special.product.id}`}
                  onClick={() => addToBasket(special.product.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-extrabold text-black bg-[#FFE600] hover:bg-yellow-400 active:scale-95 transition-all shadow-sm cursor-pointer font-black"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {qtyInBasket > 0 ? `Selected (${qtyInBasket})` : 'Compare'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
