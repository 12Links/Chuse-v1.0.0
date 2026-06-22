import React, { useState } from 'react';
import { Product, Store, StoreId, BasketItem } from '../types';
import { STORES } from '../data/catalog';
import { 
  ShoppingBag, 
  TrendingDown, 
  Trash2, 
  Plus, 
  Minus, 
  Store as StoreIcon, 
  PiggyBank, 
  CheckCircle, 
  Split, 
  ChevronRight, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BasketOptimizerProps {
  products: Product[];
  basket: BasketItem[];
  updateQuantity: (productId: string, delta: number) => void;
  removeFromBasket: (productId: string) => void;
  clearBasket: () => void;
}

export default function BasketOptimizer({
  products,
  basket,
  updateQuantity,
  removeFromBasket,
  clearBasket
}: BasketOptimizerProps) {
  const [useSplitShopping, setUseSplitShopping] = useState<boolean>(false);

  // Parse items in current basket
  const basketDetails = basket.map(item => {
    const product = products.find(p => p.id === item.productId);
    return {
      productId: item.productId,
      quantity: item.quantity,
      product: product
    };
  }).filter(item => item.product !== undefined) as Array<{
    productId: string;
    quantity: number;
    product: Product;
  }>;

  // Calculate totals per store
  const storeTotals = STORES.map(store => {
    let total = 0;
    let availableCount = 0;
    const itemsList = basketDetails.map(item => {
      const storePriceInfo = item.product.prices.find(p => p.storeId === store.id);
      const isAvailable = storePriceInfo && storePriceInfo.inStock && storePriceInfo.price > 0;
      if (isAvailable && storePriceInfo) {
        total += storePriceInfo.price * item.quantity;
        availableCount++;
      }
      return {
        product: item.product,
        quantity: item.quantity,
        price: isAvailable && storePriceInfo ? storePriceInfo.price : null,
        totalItemCost: isAvailable && storePriceInfo ? storePriceInfo.price * item.quantity : 0,
        isAvailable
      };
    });

    const totalQty = basket.reduce((sum, item) => sum + item.quantity, 0);

    return {
      store,
      total,
      itemsList,
      fillRate: totalQty > 0 ? (availableCount / basketDetails.length) * 100 : 0,
      availableCount,
      missingCount: basketDetails.length - availableCount
    };
  });

  // Ideal Split shopping calculations
  let idealSplitTotal = 0;
  const splitShoppingList = basketDetails.map(item => {
    // Find absolute cheapest store pricing
    const availablePrices = item.product.prices.filter(p => p.inStock && p.price > 0);
    const sortedPrices = [...availablePrices].sort((a, b) => a.price - b.price);
    const cheapestPriceInfo = sortedPrices[0];
    const cheapestStore = cheapestPriceInfo ? STORES.find(s => s.id === cheapestPriceInfo.storeId) : null;
    
    if (cheapestPriceInfo && cheapestStore) {
      idealSplitTotal += cheapestPriceInfo.price * item.quantity;
    }

    return {
      product: item.product,
      quantity: item.quantity,
      bestPrice: cheapestPriceInfo ? cheapestPriceInfo.price : 0,
      bestStore: cheapestStore,
      alternatives: sortedPrices
    };
  });

  // Filter stores which have at least one item available
  const activeStoreTotals = storeTotals.filter(st => st.availableCount > 0);
  
  // Sort stores to find cheapest active
  // Filter stores that have 100% of items to find the absolute cheapest single store for the exact full basket
  const fullyStockedStores = activeStoreTotals.filter(st => st.missingCount === 0);
  const cheapestSingleStore = [...fullyStockedStores].sort((a, b) => a.total - b.total)[0] || [...activeStoreTotals].sort((a, b) => a.total - b.total)[0];

  const highestSingleStore = [...activeStoreTotals].sort((a, b) => b.total - a.total)[0];
  const maxSavings = highestSingleStore && cheapestSingleStore ? (highestSingleStore.total - cheapestSingleStore.total) : 0;
  
  // Additional savings if split shopping
  const splitSavings = cheapestSingleStore ? (cheapestSingleStore.total - idealSplitTotal) : 0;

  if (basket.length === 0) {
    return (
      <div id="basket-empty" className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs max-w-lg mx-auto">
        <div className="bg-amber-100 text-amber-805 rounded-full p-6 mb-4">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-1">Your Basket is Empty</h3>
        <p className="text-sm text-slate-500 max-w-sm mb-6 font-semibold">
          Start browsing the SA Catalog or specials to add items and compare checkout totals in real-time.
        </p>
      </div>
    );
  }

  return (
    <div id="basket-optimizer-view" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* List layout */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="bg-[#FFE600] rounded-xl p-2.5 text-black shadow-md border border-yellow-300">
                <ShoppingBag className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-850">Your Shopping List</h2>
                <p className="text-xs text-slate-400 font-bold">{basket.length} items to compare</p>
              </div>
            </div>
            
            <button 
              id="clear-basket"
              onClick={clearBasket}
              className="text-xs font-black text-rose-500 inline-flex items-center gap-1.5 hover:bg-rose-50 px-3.5 py-2 rounded-full cursor-pointer transition-all"
            >
              <Trash2 className="w-4 h-4" /> Clear Basket
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-2 space-y-3">
            {basketDetails.map((item, index) => {
              // Find cheapest store for this item
              const activePrices = item.product.prices.filter(p => p.inStock && p.price > 0);
              const cheapest = [...activePrices].sort((a, b) => a.price - b.price)[0];
              const bestStore = cheapest ? STORES.find(s => s.id === cheapest.storeId) : null;

              return (
                <div 
                  key={item.product.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0"
                  id={`basket-item-${item.product.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-100 rounded-2xl w-14 h-14 flex items-center justify-center font-black text-slate-600 font-mono text-sm shrink-0 uppercase border border-slate-200">
                      {item.product.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-base leading-snug">{item.product.name}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs bg-slate-105 text-slate-600 rounded-full px-2.5 py-0.5 font-bold font-mono border border-slate-200">
                          {item.product.unit}
                        </span>
                        <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">{item.product.category}</span>
                      </div>
                      
                      {bestStore && cheapest && (
                        <div className="flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Cheapest at {bestStore.name} (R{cheapest.price.toFixed(2)})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    {/* Quantity selectors */}
                    <div className="flex items-center bg-slate-50 p-1 rounded-full border border-slate-200">
                      <button 
                        id={`minus-qty-${item.product.id}`}
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1.5 hover:bg-white rounded-full active:scale-95 transition-all text-slate-500 cursor-pointer"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      
                      <span className="w-8 text-center font-bold text-slate-800 font-mono text-sm leading-none">
                        {item.quantity}
                      </span>
                      
                      <button 
                        id={`plus-qty-${item.product.id}`}
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1.5 hover:bg-white rounded-full active:scale-95 transition-all text-slate-500 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col items-end min-w-[80px]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. Cost</span>
                      <span className="font-black text-slate-800 text-base font-mono leading-tight mt-0.5">
                        R {(cheapest ? cheapest.price * item.quantity : 0).toFixed(2)}
                      </span>
                      
                      <button
                        id={`remove-${item.product.id}`}
                        onClick={() => removeFromBasket(item.product.id)}
                        className="text-[10px] text-slate-400 font-bold uppercase hover:text-rose-500 mt-1 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison grid */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-black text-slate-800 text-lg">Store-By-Store Item Comparison</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <th className="pb-3">Product Name</th>
                  {STORES.map(s => (
                    <th key={s.id} className="pb-3 text-center">{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {basketDetails.map(item => (
                  <tr key={item.product.id} className="text-sm">
                    <td className="py-4 font-bold text-slate-800">
                      <div>{item.product.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Qty: {item.quantity}</span>
                    </td>
                    
                    {STORES.map(s => {
                      const priceInfo = item.product.prices.find(pr => pr.storeId === s.id);
                      const isCheapest = priceInfo && priceInfo.inStock && priceInfo.price > 0 &&
                        !item.product.prices.some(otherPr => otherPr.inStock && otherPr.storeId !== s.id && otherPr.price > 0 && otherPr.price < priceInfo.price);

                      return (
                        <td key={s.id} className="py-4 text-center">
                          {priceInfo && priceInfo.inStock && priceInfo.price > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className={`font-mono text-sm font-bold ${isCheapest ? 'text-emerald-600 font-black' : 'text-slate-650'}`}>
                                R {(priceInfo.price * item.quantity).toFixed(2)}
                              </span>
                              {priceInfo.onSpecial && (
                                <span className="text-[9px] bg-amber-100/50 text-amber-800 rounded px-1.5 py-0.5 mt-1 font-bold">
                                  SPECIAL
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 font-semibold font-mono">Out of Stock</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Checkout comparison side card */}
      <div className="space-y-6">
        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between border border-slate-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFE600]/10 rounded-full blur-2xl" />
          
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-100 text-lg flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-[#FFE600]" />
              Comparison Center
            </h3>

            {/* Price Optimizer card list */}
            <div className="space-y-3">
              {activeStoreTotals.map(item => {
                const isCheapestSingle = cheapestSingleStore && cheapestSingleStore.store.id === item.store.id;
                
                return (
                  <div 
                    key={item.store.id} 
                    className={`p-4 rounded-2xl flex items-center justify-between border ${
                      isCheapestSingle 
                        ? 'bg-slate-850 border-emerald-500/40' 
                        : 'bg-slate-800/45 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-white text-sm">
                          {item.store.name}
                        </span>
                        {isCheapestSingle && (
                          <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Best Single Store
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-bold">
                        {item.availableCount} / {basketDetails.length} Items Filled
                        {item.missingCount > 0 && (
                          <span className="text-amber-400 font-mono ml-1">
                            ({item.missingCount} OOS)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Total</span>
                      <span className={`font-mono font-extrabold text-base ${isCheapestSingle ? 'text-emerald-400 text-lg' : 'text-slate-100'}`}>
                        R {item.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {cheapestSingleStore && maxSavings > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-850 text-slate-350 text-sm space-y-4">
              <div className="flex items-center justify-between font-bold">
                <span className="inline-flex items-center gap-1">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  Maximum Potential Savings:
                </span>
                <span className="text-emerald-400 font-extrabold font-mono text-lg">
                  R {maxSavings.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                By shopping at <span className="text-white font-bold">{cheapestSingleStore.store.name}</span> instead of the most expensive retailer for this exact list, you pocket R {maxSavings.toFixed(2)}!
              </p>
            </div>
          )}
        </div>

        {/* Split Shopping Innovative Prompt card */}
        <div className="bg-amber-100/20 border border-amber-200/30 rounded-3xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-[#FFE600] rounded-2xl p-2.5 text-black border border-yellow-300 shadow-sm shrink-0">
              <Split className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                SA Smart Feature
              </span>
              <h4 className="font-bold text-slate-800 text-base mt-2">Split-Store Shopping Trip</h4>
              <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
                Save an extra R {splitSavings.toFixed(2)} by visiting different stores for their specific cheapest items.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 divide-y divide-slate-100 shadow-sm border border-amber-200/40">
            <div className="flex justify-between py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Smart Split Total:</span>
              <span className="font-mono text-amber-700 text-sm font-extrabold">R {idealSplitTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Single Store Best:</span>
              <span className="font-mono text-slate-650">R {cheapestSingleStore ? cheapestSingleStore.total.toFixed(2) : '0.00'}</span>
            </div>
            <div className="flex justify-between py-2.5 pt-3 text-xs font-black text-amber-950 bg-amber-100/40 px-2 rounded-xl mt-2 select-none font-bold">
              <span className="flex items-center gap-1 text-[11px]">
                <PiggyBank className="w-4 h-4 text-amber-600 animate-bounce" /> Additional Cash Saved:
              </span>
              <span className="font-mono text-sm leading-none text-amber-700">R {splitSavings.toFixed(2)}</span>
            </div>
          </div>

          <button
            id="toggle-split-breakdown"
            onClick={() => setUseSplitShopping(!useSplitShopping)}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-extrabold text-black bg-[#FFE600] speed-hover active:scale-[0.98] transition-all py-3.5 rounded-full shadow-xs cursor-pointer font-black"
          >
            {useSplitShopping ? 'Hide Split Shopping Map' : 'Show Smart Split Shopping Map'}
            <ChevronRight className={`w-4 h-4 transition-transform ${useSplitShopping ? 'rotate-90' : ''}`} />
          </button>

          {/* Expanded Split Shopping map breakdown */}
          <AnimatePresence>
            {useSplitShopping && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-3"
              >
                <div className="bg-amber-100/30 rounded-2xl p-3.5 text-[11px] text-amber-900 font-semibold leading-relaxed flex items-start gap-1.5 border border-amber-200/40">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  Below is your optimal multi-stop shopping route to maximize physical cash flow.
                </div>

                <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto pr-1">
                  {splitShoppingList.map((item, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs flex justify-between items-center shadow-xs">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-805">{item.product.name}</span>
                        <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-0.5">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-black shrink-0 font-mono">
                            R {item.bestPrice.toFixed(2)} each
                          </span>
                        </div>
                      </div>

                      {item.bestStore ? (
                        item.bestStore.logoUrl ? (
                          <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200/50 rounded-full py-0.5 pl-1.5 pr-2.5 shadow-2xs">
                            <img 
                              src={item.bestStore.logoUrl} 
                              alt={item.bestStore.name} 
                              referrerPolicy="no-referrer"
                              className="h-4.5 w-auto object-contain shrink-0 max-w-[50px] mix-blend-multiply"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span className="text-[9px] text-neutral-700 font-extrabold uppercase tracking-wider">
                              {item.bestStore.name}
                            </span>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            item.bestStore.id === 'checkers' ? 'bg-[#006A4E] text-white' :
                            item.bestStore.id === 'woolworths' ? 'bg-black text-white' :
                            item.bestStore.id === 'pnp' ? 'bg-[#E11B22] text-white' :
                            item.bestStore.logoColor
                          }`}>
                            {item.bestStore.name}
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-slate-400">OOS</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}
