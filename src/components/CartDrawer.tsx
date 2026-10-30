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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateReceiptFromBasket } from '../lib/receiptStorage';
import { shareReceiptViaWhatsApp } from '../lib/receiptWhatsApp';

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
    reason: 'Swap Tastic for Spekko 2kg to save ~R8.70'
  },
  'prod-oil-sunfoil-2l': {
    targetId: 'prod-oil-dlite-2l',
    reason: 'Swap Sunfoil to D\'lite Pure Oil to save ~R13.70'
  },
  'prod-bread-sasko-white': {
    targetId: 'prod-bread-albany-brown',
    reason: 'Albany special price is currently cheaper by ~R2.75'
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

  const validSingleStores = Object.entries(storeTotals)
    .filter(([_, data]) => data.count >= basket.length && data.total > 0)
    .sort((a, b) => a[1].total - b[1].total);

  const bestSingleStore = validSingleStores[0];

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
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity"
          />

          {/* Drawer Panel - Sharp 4px borders, tactile receipt feel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-[#FFFFFF] shadow-2xl z-55 flex flex-col border-l border-[#E2E0D8]"
          >
            {/* Header */}
            <div className="p-4 border-b border-[#E2E0D8] flex items-center justify-between bg-[#F7F6F0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[4px] bg-[#FFE600] flex items-center justify-center text-black font-black">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase font-display flex items-center gap-2">
                    My Basket
                    <span className="text-[11px] bg-slate-200 px-1.5 py-0.2 rounded font-mono">
                      {totalItemsCount} items
                    </span>
                  </h3>
                  <span className="text-[10px] text-slate-500 font-sans">
                    Real-time multi-retailer optimizer • {province}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-[4px] bg-white border border-[#E2E0D8] flex items-center justify-center text-slate-500 hover:text-black cursor-pointer"
                aria-label="Close Basket"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Split Savings Banner */}
            {basketDetails.length > 0 && totalPotentialSavings > 0 && (
              <div className="bg-[#F0FDF4] border-b border-emerald-200 p-3 px-4 flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-emerald-800">
                    Split basket saves R{totalPotentialSavings.toFixed(2)} vs highest
                  </span>
                </div>
              </div>
            )}

            {/* Scrollable Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans">
              {basketDetails.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#F7F6F0] flex items-center justify-center text-slate-400 mx-auto">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 font-sans">
                    Your basket is empty
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Add groceries from the catalog to compare store prices and see which supermarket is cheapest.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-2 px-4 py-2 rounded-[4px] bg-[#FFE600] text-black font-bold text-xs uppercase font-mono cursor-pointer"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-2">
                    {basketDetails.map((item) => {
                      if (!item) return null;
                      return (
                        <div
                          key={item.product.id}
                          className="p-3 rounded-[4px] border border-[#E2E0D8] bg-[#FFFFFF] flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <img
                            src={item.product.imageUrl || 'https://placehold.co/80x80'}
                            alt={item.product.name}
                            className="w-12 h-12 object-contain bg-[#F7F6F0] p-1.5 rounded-[2px] border border-[#E2E0D8] shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate font-sans">
                              {item.product.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono">
                              <span className="font-extrabold text-slate-900">
                                R{item.bestPrice.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase">
                                at {item.bestStoreId}
                              </span>
                            </div>
                          </div>

                          {/* Stepper + Delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="flex items-center border border-[#E2E0D8] rounded-[3px] bg-[#F7F6F0]">
                              <button
                                onClick={() => updateQuantity(item.product.id, -1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-black cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-1.5 font-mono text-xs font-bold text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.product.id, 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-black cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromBasket(item.product.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Embedded Smart Swaps */}
                  {availableSwaps.length > 0 && (
                    <div className="mt-4 p-3.5 rounded-[4px] bg-[#F7F6F0] border border-[#E2E0D8] space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                        <span>💡 Smart Staple Swaps</span>
                      </div>
                      <div className="space-y-2">
                        {availableSwaps.map(swap => {
                          if (!swap) return null;
                          return (
                            <div
                              key={swap.targetProduct.id}
                              className="p-2.5 bg-white rounded-[3px] border border-[#E2E0D8] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900 block font-sans">
                                  {swap.targetProduct.name}
                                </span>
                                <span className="text-[10.5px] text-emerald-700 font-mono">
                                  Save ~R{swap.savings.toFixed(2)} total ({swap.reason})
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  removeFromBasket(swap.currentProduct.id);
                                  for (let i = 0; i < swap.quantity; i++) {
                                    updateQuantity(swap.targetProduct.id, 1);
                                  }
                                  onSwapItem?.(swap.currentProduct.id, swap.targetProduct.id);
                                }}
                                className="px-2 py-1 rounded-[3px] bg-[#FFE600] hover:bg-yellow-400 text-black font-bold text-[10px] uppercase font-mono cursor-pointer shrink-0 ml-2"
                              >
                                Swap
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Checkout Split Comparison Card */}
                  <div className="p-3.5 rounded-[4px] border border-[#E2E0D8] bg-[#F7F6F0] space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Cheapest Single Store:</span>
                      <span className="font-bold text-slate-900">
                        {bestSingleStore ? `R${bestSingleStore[1].total.toFixed(2)} at ${bestSingleStore[1].name}` : 'Multi-Store Only'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#E2E0D8] pt-2">
                      <span className="font-extrabold text-slate-900 font-sans">
                        Optimized Split Basket:
                      </span>
                      <span className="text-base font-black text-emerald-700">
                        R{totalBestPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer Actions */}
            {basketDetails.length > 0 && (
              <div className="p-4 border-t border-[#E2E0D8] bg-[#F7F6F0] space-y-2 font-sans">
                
                {/* Primary Action: View & Download Till Slip Receipt */}
                <button
                  onClick={handleGenerateAndOpenReceipt}
                  className="w-full py-2.5 rounded-[4px] bg-[#FFE600] hover:bg-yellow-400 text-black font-bold text-xs uppercase font-mono flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors border border-yellow-400"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Till Slip & PDF</span>
                </button>

                {/* Secondary Action: Direct WhatsApp Share */}
                <button
                  onClick={handleQuickWhatsAppShare}
                  className="w-full py-2.5 rounded-[4px] bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs uppercase font-mono flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share to WhatsApp</span>
                </button>

                <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                  <button
                    onClick={clearBasket}
                    className="text-slate-500 hover:text-rose-600 underline cursor-pointer"
                  >
                    Clear basket
                  </button>
                  <button
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
