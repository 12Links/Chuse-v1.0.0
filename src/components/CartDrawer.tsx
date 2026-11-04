import React, { useState } from 'react';
import { Product, BasketItem, StoreId, ChuseReceipt } from '../types';
import { STORES } from '../data/catalog';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Share2, 
  TrendingDown,
  FileText,
  Copy,
  Check,
  ArrowRight,
  Store,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateReceiptFromBasket } from '../lib/receiptStorage';
import { shareReceiptViaWhatsApp } from '../lib/receiptWhatsApp';
import { RETAILER_THEMES } from '../lib/retailerTokens';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  basket: BasketItem[];
  products: Product[];
  province?: string;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromBasket: (productId: string) => void;
  clearBasket: () => void;
  onSwapItem?: (oldProductId: string, newProductId: string) => void;
  onOpenReceiptModal?: (receipt: ChuseReceipt) => void;
}

// Smart house-brand staple swap mapping
const HOUSE_BRAND_SWAPS: Record<string, { targetId: string; reason: string }> = {
  'prod-milk-clover-2l': {
    targetId: 'prod-milk-parmalat-1l',
    reason: 'Swap to EverFresh 1L (x2) or store brand for daily savings'
  },
  'prod-rice-tastic-2kg': {
    targetId: 'prod-rice-spekko-2kg',
    reason: 'Spekko Long Grain 2kg is currently R8.70 cheaper than Tastic'
  },
  'prod-oil-sunfoil-2l': {
    targetId: 'prod-oil-dlite-2l',
    reason: 'D\'lite Pure Cooking Oil saves ~R13.70 per 2L bottle'
  },
  'prod-bread-sasko-white': {
    targetId: 'prod-bread-albany-brown',
    reason: 'Albany special price is currently lower by ~R2.75'
  },
  'prod-sugar-huletts-25kg': {
    targetId: 'prod-sugar-selati-25kg',
    reason: 'Selati White Sugar 2.5kg is currently lower priced'
  },
  'prod-flour-snowflake-25kg': {
    targetId: 'prod-flour-goldencloud-25kg',
    reason: 'Golden Cloud Cake Wheat Flour saves ~R2.00 per pack'
  }
};

export default function CartDrawer({
  isOpen,
  onClose,
  basket,
  products,
  province = 'Gauteng',
  updateQuantity,
  removeFromBasket,
  clearBasket,
  onSwapItem,
  onOpenReceiptModal
}: CartDrawerProps) {
  // Toggle: Optimized Split Basket vs Cheapest Single Store
  const [basketViewMode, setBasketViewMode] = useState<'split' | 'singleStore'>('split');
  const [copiedChecklist, setCopiedChecklist] = useState(false);

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
  const storeTotals: Record<StoreId, { total: number; count: number; name: string; items: any[] }> = {
    checkers: { total: 0, count: 0, name: 'Checkers', items: [] },
    pnp: { total: 0, count: 0, name: 'Pick n Pay', items: [] },
    woolworths: { total: 0, count: 0, name: 'Woolworths', items: [] },
    shoprite: { total: 0, count: 0, name: 'Shoprite', items: [] },
    spar: { total: 0, count: 0, name: 'SPAR', items: [] },
    boxer: { total: 0, count: 0, name: 'Boxer', items: [] },
    foodlovers: { total: 0, count: 0, name: "Food Lover's Market", items: [] },
  };

  basketDetails.forEach(item => {
    if (!item) return;
    const { product, quantity } = item;
    product.prices.forEach(pr => {
      if (pr.inStock && pr.price > 0 && storeTotals[pr.storeId]) {
        storeTotals[pr.storeId].total += pr.price * quantity;
        storeTotals[pr.storeId].count += 1;
        storeTotals[pr.storeId].items.push({
          product,
          price: pr.price,
          quantity,
          lineTotal: pr.price * quantity
        });
      }
    });
  });

  const validSingleStores = Object.entries(storeTotals)
    .filter(([_, data]) => data.count >= basket.length && data.total > 0)
    .sort((a, b) => a[1].total - b[1].total);

  const bestSingleStore = validSingleStores[0];
  const singleStoreDifference = bestSingleStore ? Math.max(0, bestSingleStore[1].total - totalBestPrice) : 0;

  // Group items by winning store for the split breakdown
  const splitStoreGroups = React.useMemo(() => {
    const groups: Record<string, { storeId: StoreId; items: typeof basketDetails; subtotal: number }> = {};
    basketDetails.forEach(item => {
      if (!item || !item.bestStoreId) return;
      if (!groups[item.bestStoreId]) {
        groups[item.bestStoreId] = {
          storeId: item.bestStoreId,
          items: [],
          subtotal: 0
        };
      }
      groups[item.bestStoreId].items.push(item);
      groups[item.bestStoreId].subtotal += item.lineTotal;
    });
    return Object.values(groups).sort((a, b) => b.subtotal - a.subtotal);
  }, [basketDetails]);

  // Discover smart house-brand swaps available for current items
  const availableSwaps = basketDetails
    .map(item => {
      if (!item) return null;
      const swapInfo = HOUSE_BRAND_SWAPS[item.product.id];
      if (!swapInfo) return null;
      const targetProd = products.find(p => p.id === swapInfo.targetId);
      if (!targetProd) return null;

      const targetCheapest = Math.min(
        ...targetProd.prices.filter(p => p.inStock && p.price > 0).map(p => p.price)
      );
      if (targetCheapest >= item.bestPrice) return null;

      const diff = (item.bestPrice - targetCheapest) * item.quantity;
      return {
        currentProduct: item.product,
        targetProduct: targetProd,
        quantity: item.quantity,
        savings: diff,
        reason: swapInfo.reason
      };
    })
    .filter(Boolean);

  // Generate receipt and trigger the receipt modal
  const handleGenerateAndOpenReceipt = () => {
    if (basket.length === 0) return;
    const receipt = generateReceiptFromBasket(basket, products, province);
    if (onOpenReceiptModal) {
      onOpenReceiptModal(receipt);
    }
  };

  // Direct WhatsApp share
  const handleQuickWhatsAppShare = () => {
    if (basket.length === 0) return;
    const receipt = generateReceiptFromBasket(basket, products, province);
    shareReceiptViaWhatsApp(receipt);
  };

  // Copy Checklist by Store to Clipboard
  const handleCopyChecklist = () => {
    if (basketDetails.length === 0) return;

    let text = `🛒 CHUSE STORE CHECKLIST • ${province.toUpperCase()}\n`;
    text += `════════════════════════════════════\n\n`;

    if (basketViewMode === 'split') {
      splitStoreGroups.forEach(group => {
        const retailer = RETAILER_THEMES[group.storeId];
        text += `🏪 ${retailer?.name.toUpperCase() || group.storeId.toUpperCase()} (${group.items.length} items • R${group.subtotal.toFixed(2)})\n`;
        group.items.forEach(item => {
          if (!item) return;
          text += `  [ ] ${item.quantity}x ${item.product.name} (${item.product.unit || 'unit'}) — R${item.lineTotal.toFixed(2)}\n`;
        });
        text += `\n`;
      });

      text += `════════════════════════════════════\n`;
      text += `💰 Split Basket Total: R${totalBestPrice.toFixed(2)}\n`;
      if (totalPotentialSavings > 0) {
        text += `🎉 You saved R${totalPotentialSavings.toFixed(2)} vs highest retailer!\n`;
      }
    } else if (bestSingleStore) {
      text += `🏪 CHEAPEST SINGLE SUPERMARKET: ${bestSingleStore[1].name.toUpperCase()}\n`;
      text += `Items: ${totalItemsCount} • Total: R${bestSingleStore[1].total.toFixed(2)}\n\n`;
      bestSingleStore[1].items.forEach(item => {
        text += `  [ ] ${item.quantity}x ${item.product.name} — R${item.lineTotal.toFixed(2)}\n`;
      });
      text += `\n════════════════════════════════════\n`;
      text += `💡 Tip: A split basket across stores would cost R${totalBestPrice.toFixed(2)} (Save R${singleStoreDifference.toFixed(2)})\n`;
    }

    text += `\n⚡ Compared live on chuse. (https://chuse-chi.vercel.app)`;

    navigator.clipboard.writeText(text);
    setCopiedChecklist(true);
    setTimeout(() => setCopiedChecklist(false), 2500);
  };

  const vat15 = totalBestPrice * 0.15 / 1.15;

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

          {/* Drawer Panel - Pure White, 1px Border, Thermal Receipt Aesthetic */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed inset-y-0 right-0 w-full max-w-full sm:max-w-xl bg-white shadow-2xl z-55 flex flex-col border-l border-slate-200 font-sans"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FFE600] flex items-center justify-center text-slate-950 font-black shadow-xs">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950 uppercase font-display flex items-center gap-2 tracking-tight">
                    My Basket Optimizer
                    <span className="text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full font-mono font-bold">
                      {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-500 font-sans">
                    Multi-retailer price audit • {province}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-black cursor-pointer transition-colors"
                aria-label="Close Basket"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Split Basket vs Single Store Mode Toggle */}
            {basketDetails.length > 0 && (
              <div className="p-3 bg-slate-100 border-b border-slate-200">
                <div className="grid grid-cols-2 p-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setBasketViewMode('split')}
                    className={`py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      basketViewMode === 'split'
                        ? 'bg-slate-950 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Split Basket (Lowest)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBasketViewMode('singleStore')}
                    className={`py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      basketViewMode === 'singleStore'
                        ? 'bg-slate-950 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Single Store Trip</span>
                  </button>
                </div>

                {/* Mode description callout */}
                <div className="mt-2 text-[11px] text-slate-600 font-sans flex items-center justify-between px-1">
                  {basketViewMode === 'split' ? (
                    <span className="text-emerald-800 font-bold flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                      Splits across stores to save ~R{totalPotentialSavings.toFixed(2)} vs highest
                    </span>
                  ) : (
                    <span>
                      {bestSingleStore ? (
                        <>
                          Cheapest single stop:{' '}
                          <strong className="text-slate-900">{bestSingleStore[1].name}</strong> (R{bestSingleStore[1].total.toFixed(2)})
                        </>
                      ) : (
                        'Compare total if bought at one supermarket'
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
              {basketDetails.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 font-sans">
                    Your basket is empty
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Add groceries from the catalog to see real-time price comparisons across Checkers, Pick n Pay, Woolies, and Shoprite.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 px-5 py-2.5 rounded-lg bg-[#FFE600] text-slate-950 font-bold text-xs uppercase font-mono cursor-pointer shadow-xs hover:bg-yellow-400 transition-colors"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <>
                  {/* Mode 1: Split Basket View (Grouped by Store) */}
                  {basketViewMode === 'split' ? (
                    <div className="space-y-4">
                      {splitStoreGroups.map((group) => {
                        const retailer = RETAILER_THEMES[group.storeId];
                        return (
                          <div
                            key={group.storeId}
                            className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs"
                          >
                            {/* Store Header Bar */}
                            <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded shadow-2xs ${retailer?.badgeBg || 'bg-slate-950'} ${retailer?.badgeText || 'text-white'}`}>
                                  {retailer?.shortName || group.storeId}
                                </span>
                                <span className="text-xs font-bold text-slate-700">
                                  {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                                </span>
                              </div>
                              <span className="font-mono font-black text-xs sm:text-sm text-slate-950">
                                Subtotal: R{group.subtotal.toFixed(2)}
                              </span>
                            </div>

                            {/* Items within this store */}
                            <div className="divide-y divide-slate-100 p-2 space-y-1">
                              {group.items.map((item) => {
                                if (!item) return null;
                                return (
                                  <div
                                    key={item.product.id}
                                    className="p-2 flex items-center justify-between gap-3 hover:bg-slate-50/60 rounded-lg transition-colors"
                                  >
                                    <img
                                      src={item.product.imageUrl || 'https://placehold.co/80x80'}
                                      alt={item.product.name}
                                      className="w-11 h-11 object-contain bg-slate-50 p-1 rounded border border-slate-200 shrink-0"
                                    />

                                    <div className="flex-1 min-w-0">
                                      <h5 className="text-xs font-bold text-slate-900 truncate font-sans">
                                        {item.product.name}
                                      </h5>
                                      <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono">
                                        <span className="font-black text-slate-950">
                                          R{item.bestPrice.toFixed(2)}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          • {item.product.unit}
                                        </span>
                                        {item.savingsTotal > 0 && (
                                          <span className="text-[10px] text-emerald-700 font-bold">
                                            (Save R{item.savingsTotal.toFixed(2)})
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Stepper + Delete */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                                        <button
                                          type="button"
                                          onClick={() => updateQuantity(item.product.id, -1)}
                                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-black cursor-pointer"
                                        >
                                          <Minus className="w-3 h-3 stroke-[2.5]" />
                                        </button>
                                        <span className="px-2 font-mono text-xs font-bold text-slate-900">
                                          {item.quantity}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateQuantity(item.product.id, 1)}
                                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-black cursor-pointer"
                                        >
                                          <Plus className="w-3 h-3 stroke-[2.5]" />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => removeFromBasket(item.product.id)}
                                        className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                                        title="Remove item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Mode 2: Single Store Trip View */
                    <div className="space-y-3">
                      {bestSingleStore ? (
                        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                                Recommended Single Store
                              </span>
                              <h4 className="text-base font-black text-slate-950 font-sans">
                                {bestSingleStore[1].name}
                              </h4>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-black font-mono text-slate-950">
                                R{bestSingleStore[1].total.toFixed(2)}
                              </span>
                              <span className="block text-[10px] font-mono text-slate-500">
                                All {totalItemsCount} items
                              </span>
                            </div>
                          </div>

                          {singleStoreDifference > 0 && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-sans text-amber-900">
                              Shopping only at {bestSingleStore[1].name} costs{' '}
                              <strong>+R{singleStoreDifference.toFixed(2)} more</strong> than splitting between supermarkets.
                            </div>
                          )}

                          {/* Item list under single store */}
                          <div className="divide-y divide-slate-100 pt-1">
                            {bestSingleStore[1].items.map((it: any) => (
                              <div key={it.product.id} className="py-2 flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-800 truncate max-w-[240px]">
                                  {it.quantity}x {it.product.name}
                                </span>
                                <span className="font-mono font-bold text-slate-950">
                                  R{it.lineTotal.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-600">
                          Not all basket items are in stock at a single supermarket. Use split basket mode for complete coverage.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Embedded Smart House-Brand Swaps */}
                  {availableSwaps.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-[#FFD200]" />
                        <span>Smart Staple Swaps</span>
                      </div>
                      <div className="space-y-2">
                        {availableSwaps.map(swap => {
                          if (!swap) return null;
                          return (
                            <div
                              key={swap.targetProduct.id}
                              className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs shadow-2xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-900 block font-sans">
                                  {swap.targetProduct.name}
                                </span>
                                <span className="text-[11px] text-emerald-700 font-mono block whitespace-normal break-words leading-snug mt-0.5">
                                  Save ~R{swap.savings.toFixed(2)} total ({swap.reason})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  removeFromBasket(swap.currentProduct.id);
                                  for (let i = 0; i < swap.quantity; i++) {
                                    updateQuantity(swap.targetProduct.id, 1);
                                  }
                                  onSwapItem?.(swap.currentProduct.id, swap.targetProduct.id);
                                }}
                                className="px-3 py-1.5 rounded-md bg-[#FFE600] hover:bg-yellow-400 text-slate-950 font-bold text-[10.5px] uppercase font-mono cursor-pointer shrink-0 shadow-2xs transition-colors"
                              >
                                Swap
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Thermal Till Slip Visualization Box */}
                  <div className="rounded-xl border border-slate-300 bg-white p-4 font-mono text-xs shadow-sm space-y-2.5 relative">
                    <div className="text-center border-b border-dashed border-slate-300 pb-2">
                      <span className="font-black text-xs uppercase tracking-widest text-slate-900 block font-display">
                        CHUSE RETAIL AUDIT SLIP
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Mzansi Multi-Supermarket Index • {province}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Items in Basket:</span>
                        <span className="font-bold text-slate-950">{totalItemsCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Includes 15% VAT:</span>
                        <span className="font-bold text-slate-950">R{vat15.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-1.5 text-xs font-bold text-slate-950">
                        <span>Optimized Basket Total:</span>
                        <span className="text-sm font-black font-mono text-slate-950">
                          R{totalBestPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {totalPotentialSavings > 0 && (
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-center">
                        <span className="text-[11px] font-black font-mono text-emerald-800 uppercase tracking-tight block">
                          TOTAL SAVINGS: R{totalPotentialSavings.toFixed(2)}
                        </span>
                        <span className="text-[9.5px] font-mono text-emerald-700">
                          Calculated against highest competitor shelf price
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer Actions */}
            {basketDetails.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 font-sans">
                
                {/* Primary Action: View & Download Till Slip Receipt */}
                <button
                  type="button"
                  onClick={handleGenerateAndOpenReceipt}
                  className="w-full py-2.5 rounded-lg bg-[#FFE600] hover:bg-yellow-400 text-slate-950 font-bold text-xs uppercase font-mono flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors border border-yellow-400"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Full Till Slip & PDF</span>
                </button>

                {/* Secondary Actions: Copy Checklist & WhatsApp Share */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyChecklist}
                    className="py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs transition-colors"
                  >
                    {copiedChecklist ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedChecklist ? 'Copied!' : 'Copy Checklist'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickWhatsAppShare}
                    className="py-2 px-3 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp Share</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={clearBasket}
                    className="text-slate-400 hover:text-rose-600 underline cursor-pointer"
                  >
                    Clear basket
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-slate-800 font-bold hover:underline cursor-pointer"
                  >
                    Continue shopping →
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
