import { Product, BasketItem, ChuseReceipt, ReceiptItem, ReceiptStoreGroup, StoreId } from '../types';
import { STORES } from '../data/catalog';

const STORAGE_KEY_HISTORY = 'chuse_receipt_history';
const STORAGE_KEY_CURRENT = 'chuse_current_receipt';

// Build a structured ChuseReceipt from current basket and product catalog
export function generateReceiptFromBasket(
  basket: BasketItem[],
  products: Product[],
  province: string = 'Gauteng'
): ChuseReceipt {
  const receiptItems: ReceiptItem[] = [];
  const storeMap: Record<StoreId, ReceiptItem[]> = {
    checkers: [],
    pnp: [],
    woolworths: [],
    shoprite: [],
    spar: [],
    boxer: [],
    foodlovers: [],
  };

  let optimizedTotal = 0;
  let singleStoreBaselineTotal = 0;
  let totalItemCount = 0;

  basket.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return;

    const validPrices = product.prices.filter(pr => pr.inStock && pr.price > 0);
    if (validPrices.length === 0) return;

    const sortedPrices = [...validPrices].sort((a, b) => a.price - b.price);
    const cheapest = sortedPrices[0];
    const highest = sortedPrices[sortedPrices.length - 1];

    const storeInfo = STORES.find(s => s.id === cheapest.storeId);
    const bestStoreName = storeInfo ? storeInfo.name : cheapest.storeId;

    const lineTotal = cheapest.price * item.quantity;
    const savingsPerUnit = Math.max(0, highest.price - cheapest.price);
    const savingsTotal = savingsPerUnit * item.quantity;

    const receiptItem: ReceiptItem = {
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      quantity: item.quantity,
      bestPrice: cheapest.price,
      bestStoreId: cheapest.storeId,
      bestStoreName,
      highestPrice: highest.price,
      lineTotal,
      savingsTotal
    };

    receiptItems.push(receiptItem);
    if (storeMap[cheapest.storeId]) {
      storeMap[cheapest.storeId].push(receiptItem);
    }

    optimizedTotal += lineTotal;
    singleStoreBaselineTotal += highest.price * item.quantity;
    totalItemCount += item.quantity;
  });

  // Group by stores that have items
  const storeGroups: ReceiptStoreGroup[] = Object.entries(storeMap)
    .filter(([_, items]) => items.length > 0)
    .map(([storeId, items]) => {
      const storeInfo = STORES.find(s => s.id === storeId);
      const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
      return {
        storeId: storeId as StoreId,
        storeName: storeInfo ? storeInfo.name : storeId,
        items,
        subtotal
      };
    })
    .sort((a, b) => b.subtotal - a.subtotal);

  const totalSavings = Math.max(0, singleStoreBaselineTotal - optimizedTotal);
  const savingsPercentage = singleStoreBaselineTotal > 0
    ? Math.round((totalSavings / singleStoreBaselineTotal) * 100)
    : 0;

  const timestamp = new Date();
  const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = `REC-${dateStr}-${randomSuffix}`;
  const invoiceNumber = `ZA-${randomSuffix}-${dateStr.slice(4)}`;

  const receipt: ChuseReceipt = {
    id,
    invoiceNumber,
    createdAt: timestamp.toISOString(),
    province,
    items: receiptItems,
    storeGroups,
    totalItemCount,
    optimizedTotal,
    singleStoreBaselineTotal,
    totalSavings,
    savingsPercentage
  };

  // Save as current receipt in localStorage
  saveCurrentReceipt(receipt);
  // Also push to persistent history
  saveReceiptToHistory(receipt);

  return receipt;
}

// Save active receipt to localStorage
export function saveCurrentReceipt(receipt: ChuseReceipt): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(receipt));
  } catch (err) {
    console.warn('[ReceiptStorage] Failed to save current receipt to localStorage:', err);
  }
}

// Retrieve active receipt from localStorage
export function getCurrentReceipt(): ChuseReceipt | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Append a receipt to persistent history in localStorage
export function saveReceiptToHistory(receipt: ChuseReceipt): void {
  try {
    const history = getReceiptHistory();
    // Prevent duplicate ID
    const filtered = history.filter(r => r.id !== receipt.id);
    const updated = [receipt, ...filtered].slice(0, 50); // Keep last 50 receipts
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[ReceiptStorage] Failed to save receipt to history:', err);
  }
}

// Get all saved receipts from localStorage
export function getReceiptHistory(): ChuseReceipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Delete single receipt
export function deleteReceiptFromHistory(id: string): void {
  try {
    const history = getReceiptHistory();
    const updated = history.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[ReceiptStorage] Failed to delete receipt:', err);
  }
}

// Clear all receipt history
export function clearAllReceipts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    localStorage.removeItem(STORAGE_KEY_CURRENT);
  } catch (err) {
    console.warn('[ReceiptStorage] Failed to clear receipts:', err);
  }
}
