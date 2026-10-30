import React from 'react';
import { Product, BasketItem, StoreId } from '../types';
import { STORES } from '../data/catalog';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  CheckCircle2, 
  TrendingDown, 
  Share2, 
  Sparkles,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  basket: BasketItem[];
  products: Product[];
  updateQuantity: (productId: string, delta: number) => void;
  removeFromBasket: (productId: string) => void;
  clearBasket: () => void;
  onOpenOptimizer: () => void;
  onOpenAiWizard?: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  basket,
  products,
  updateQuantity,
  removeFromBasket,
  clearBasket,
  onOpenOptimizer,
  onOpenAiWizard
}: CartDrawerProps) {
  // Map basket items to product data
  const basketDetails = basket.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return null;

    // Find cheapest store for this item
    const validPrices = product.prices.filter(pr => pr.inStock && pr.price > 0);
    const sortedPrices = [...validPrices].sort((a, b) => a.price - b.price);
    const bestPrice = sortedPrices[0]?.price || 0;
    const bestStoreId = sortedPrices[0]?.storeId;
    const highestPrice = sortedPrices[sortedPrices.length - 1]?.price || bestPrice;
    const savingsPerUnit = Math.max(0, highestPrice - bestPrice);

    return {
      product,
      quantity: item.quantity,
      bestPrice,
      bestStoreId,
      highestPrice,
      savingsTotal: savingsPerUnit * item.quantity,
      lineTotal: bestPrice * item.quantity
    };
  }).filter(Boolean);

  const totalItemsCount = basket.reduce((acc, item) => acc + item.quantity, 0);
  const totalBestPrice = basketDetails.reduce((acc, item) => acc + (item?.lineTotal || 0), 0);
  const totalPotentialSavings = basketDetails.reduce((acc, item) => acc + (item?.savingsTotal || 0), 0);

  // Calculate cheapest single store total
  const storeTotals: Record<StoreId, { total: number; count: number; name: string }> = {
    checkers: { total: 0, count: 0, name: 'Checkers' },
    pnp: { total: 0, count: 0, name: 'Pick n Pay' },
    woolworths: { total: 0, count: 0, name: 'Woolworths' },
    shoprite: { total: 0, count: 0, name: 'Shoprite' },
    spar: { total: 0, count: 0, name: 'SPAR' },
    boxer: { total: 0, count: 0, name: 'Boxer' },
    foodlovers: { total: 0, count: 0, name: "Food Lover's" },
  };

  basketDetails.forEach(item => {
    if (!item) return;
    const { product, quantity } = item;
    product.prices.forEach(pr => {
      if (pr.inStock && pr.price > 0 && storeTotals[pr.storeId]) {
        storeTotals[pr.storeId].total += pr.price * quantity;
        storeTotals[pr.storeId].count += 1;
      }
    });
  });

  // Find lowest single store that has most items
  const validSingleStores = Object.entries(storeTotals)
    .filter(([_, data]) => data.count >= basket.length && data.total > 0)
    .sort((a, b) => a[1].total - b[1].total);

  const bestSingleStore = validSingleStores[0];

  // Copy grocery list to clipboard
  const handleCopyList = () => {
    const text = basketDetails
      .map(item => `${item?.quantity}x ${item?.product.name} (${item?.product.unit}) - Best: R${item?.bestPrice.toFixed(2)} at ${item?.bestStoreId}`)
      .join('\n');
    const summary = `🛒 My Chuse Shopping Basket (${totalItemsCount} items):\n\n${text}\n\nTotal Best Price: R${totalBestPrice.toFixed(2)}\nSaved vs High: R${totalPotentialSavings.toFixed(2)}\n\nOptimized via chuse. (https://chuse-chi.vercel.app)`;
    navigator.clipboard.writeText(summary);
    alert('✓ Shopping list copied to clipboard!');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
          />

          {/* Drawer content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-55 flex flex-col border-l border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFE600] flex items-center justify-center text-black font-black shadow-xs">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Shopping Basket
                    <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono text-slate-700 dark:text-slate-300">
                      {totalItemsCount}
                    </span>
                  </h3>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    Live Multi-Store Price Comparison
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                aria-label="Close Basket"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Savings Strategy Banner */}
            {basketDetails.length > 0 && totalPotentialSavings > 0 && (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-3.5 px-5 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-extrabold opacity-90 block">
                      Estimated Multi-Store Savings
                    </span>
                    <span className="text-sm font-black">
                      Save R{totalPotentialSavings.toFixed(2)} on this basket!
                    </span>
                  </div>
                </div>
                {onOpenAiWizard && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAiWizard();
                    }}
                    className="px-2.5 py-1.5 rounded-full bg-white text-emerald-800 text-[10px] font-black hover:bg-yellow-300 hover:text-black transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>AI Coach</span>
                  </button>
                )}
              </div>
            )}

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {basketDetails.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-slate-800 flex items-center justify-center text-amber-500 mx-auto">
                    <ShoppingBag className="w-8 h-8 opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-800 dark:text-slate-200 text-base">Your Basket is Empty</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Search staples like Clover Milk, Sasko Bread, or Tastic Rice to start comparing store prices.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-full bg-[#FFE600] text-black font-black text-xs hover:bg-yellow-400 transition-all cursor-pointer shadow-xs"
                  >
                    Browse Supermarket Catalog
                  </button>
                </div>
              ) : (
                basketDetails.map(item => {
                  if (!item) return null;
                  const { product, quantity, bestPrice, bestStoreId, lineTotal } = item;
                  const storeInfo = STORES.find(s => s.id === bestStoreId);

                  return (
                    <div key={product.id} className="pt-3.5 first:pt-0 flex items-center gap-3.5 group">
                      {/* Product Image */}
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200/60 dark:border-slate-700 shrink-0 overflow-hidden flex items-center justify-center">
                        <img
                          src={product.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}
                          alt={product.name}
                          className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {product.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {product.unit} • {product.category}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                            R{lineTotal.toFixed(2)}
                          </span>
                          <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200/50 dark:border-amber-800/40">
                            Best at {storeInfo?.name || bestStoreId}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 shrink-0 border border-slate-200/60 dark:border-slate-700">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-6 h-6 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-200 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-black font-mono text-slate-800 dark:text-slate-200">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-6 h-6 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-200 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromBasket(product.id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors cursor-pointer shrink-0"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {basketDetails.length > 0 && (
              <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md space-y-4">
                {/* Store Split Optimization Insight */}
                {bestSingleStore && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-[11px] space-y-1 shadow-xs">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Cheapest Single Store:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {bestSingleStore[1].name} (R{bestSingleStore[1].total.toFixed(2)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Optimized Multi-Store Split:</span>
                      <span className="font-black text-xs font-mono">
                        R{totalBestPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                      Optimized Basket Total
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                      R{totalBestPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyList}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
                      title="Copy List for WhatsApp"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={clearBasket}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all cursor-pointer shadow-2xs"
                      title="Clear Basket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenOptimizer();
                  }}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#FFE600] hover:bg-yellow-400 active:scale-98 text-black font-black text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <span>View Full Store Optimization Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
