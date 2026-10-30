import { Product, StoreId, StapleTimingAnalysis, PriceTimingStatus } from '../types';
import { STORES } from '../data/catalog';
import { generatePriceHistory } from '../components/PriceHistoryChart';

const TRACKED_STAPLES_KEY = 'chuse_tracked_staples';

// Common South African household staples keywords
const STAPLE_KEYWORDS = [
  'oil', 'sunflower', 'canola',
  'maize', 'mealie', 'pap', 'white star', 'ace', 'iwisa', 'nyala',
  'milk', 'amasi', 'dairy', 'clover', 'parmalat', 'everfresh', 'long life',
  'bread', 'loaf', 'albany', 'blue ribbon', 'sasko',
  'rice', 'tastic', 'spekko', 'parboiled', 'basmati',
  'sugar', 'huletts', 'selati',
  'flour', 'cake flour', 'snowflake', 'golden cloud',
  'egg', 'eggs', 'large eggs',
  'tea', 'rooibos', 'five roses', 'glen', 'joko',
  'coffee', 'jacobs', 'nescafe', 'ricoffy', 'douwe',
  'chicken', 'meat', 'beef', 'mince', 'pilchards', 'lucky star', 'tuna',
  'toilet paper', 'baby soft', 'twinsaver',
  'washing powder', 'detergent', 'ariel', 'omo', 'sunlight', 'dishwashing',
  'potato', 'potatoes', 'onion', 'onions', 'tomato', 'tomatoes'
];

/**
 * Checks if a product belongs to core household staple categories or keywords
 */
export function isHouseholdStaple(product: Product): boolean {
  const text = `${product.name} ${product.category}`.toLowerCase();
  return STAPLE_KEYWORDS.some(kw => text.includes(kw));
}

/**
 * Computes a tactile, data-driven "Best Time to Buy" recommendation for any product
 * based on 30-day historical retail pricing trends, active promotional flyers, and weekly cycles.
 */
export function analyzePriceTiming(product: Product): StapleTimingAnalysis {
  const validPrices = product.prices.filter(p => p.inStock && p.price > 0);
  
  if (validPrices.length === 0) {
    return {
      productId: product.id,
      status: 'fair',
      badgeLabel: 'OUT OF STOCK',
      headline: 'Currently Unavailable',
      explanation: 'No active stock recorded at surveyed retailers.',
      currentBestPrice: 0,
      bestStoreId: 'checkers',
      bestStoreName: 'Supermarket',
      thirtyDayMin: 0,
      thirtyDayAvg: 0,
      thirtyDayMax: 0,
      diffFromAvgPercent: 0,
      savingsOpportunity: 0,
      isSpecial: false,
      isStaple: isHouseholdStaple(product),
      recommendedAction: 'Check back when fresh stock arrives.',
      flyerCycleNote: 'Inventory refreshes weekly.'
    };
  }

  // Find current cheapest retailer
  const sortedCurrent = [...validPrices].sort((a, b) => a.price - b.price);
  const bestCurrent = sortedCurrent[0];
  const currentBestPrice = bestCurrent.price;
  const bestStoreInfo = STORES.find(s => s.id === bestCurrent.storeId);
  const bestStoreName = bestStoreInfo?.name || bestCurrent.storeId;

  // Check active special deal
  const activeSpecialStore = validPrices.find(p => p.onSpecial);
  const isSpecial = Boolean(activeSpecialStore);
  const specialDetail = activeSpecialStore?.specialDetail;

  // Retrieve 30-day price points from deterministic historical model
  const historyPoints = generatePriceHistory(product);
  
  // Aggregate prices across all active stores over 30 days
  let allHistoricalPrices: number[] = [];
  let bestHistoricalPrices: number[] = []; // lowest price at each 6-day interval

  historyPoints.forEach(point => {
    const pointPrices: number[] = [];
    validPrices.forEach(vp => {
      const pVal = point[vp.storeId];
      if (typeof pVal === 'number' && pVal > 0) {
        allHistoricalPrices.push(pVal);
        pointPrices.push(pVal);
      }
    });
    if (pointPrices.length > 0) {
      bestHistoricalPrices.push(Math.min(...pointPrices));
    }
  });

  if (allHistoricalPrices.length === 0) {
    allHistoricalPrices = [currentBestPrice];
    bestHistoricalPrices = [currentBestPrice];
  }

  const thirtyDayMin = Math.min(...bestHistoricalPrices);
  const thirtyDayMax = Math.max(...allHistoricalPrices);
  const thirtyDayAvg = bestHistoricalPrices.reduce((a, b) => a + b, 0) / bestHistoricalPrices.length;

  const diffFromAvgPercent = Number((((currentBestPrice - thirtyDayAvg) / thirtyDayAvg) * 100).toFixed(1));
  const savingsOpportunity = Math.max(0, Number((thirtyDayMax - currentBestPrice).toFixed(2)));

  const staple = isHouseholdStaple(product);

  // Timing decision engine
  let status: PriceTimingStatus = 'fair';
  let badgeLabel = 'FAIR PRICE';
  let headline = 'Fair Shelf Price';
  let explanation = '';
  let recommendedAction = '';
  let flyerCycleNote = '';

  const isAtOrNearLow = currentBestPrice <= thirtyDayMin * 1.03;
  const isWellBelowAvg = diffFromAvgPercent <= -4.0;
  const isElevated = diffFromAvgPercent >= 4.0 || currentBestPrice >= thirtyDayMax * 0.97;

  if (isSpecial || isAtOrNearLow || isWellBelowAvg) {
    status = 'buy';
    badgeLabel = 'BUY NOW';
    headline = 'Best Time to Buy · Stock Up';
    if (isSpecial) {
      explanation = `Active ${specialDetail || 'promotional deal'} at ${bestStoreName}. Current price is R${currentBestPrice.toFixed(2)}, matching peak promotional discounts.`;
    } else {
      explanation = `R${currentBestPrice.toFixed(2)} at ${bestStoreName} is at its 30-day low (${Math.abs(diffFromAvgPercent).toFixed(0)}% below 30-day average). Excellent timing to buy or stock up.`;
    }
    recommendedAction = 'Add to your basket today to lock in promotional savings.';
    flyerCycleNote = 'South African supermarket promotional leaflets rotate weekly on Thursdays. Current promotional rates typically run through Sunday.';
  } else if (isElevated) {
    status = 'wait';
    badgeLabel = 'WAIT';
    headline = 'Wait to Buy · Price Elevated';
    explanation = `R${currentBestPrice.toFixed(2)} at ${bestStoreName} is currently +${diffFromAvgPercent.toFixed(0)}% above its 30-day baseline. Retailers regularly discount this item in weekly rotations.`;
    recommendedAction = `If not urgently needed, wait for upcoming promotional flyer drops. You could save ~R${(currentBestPrice - thirtyDayMin).toFixed(2)} when it returns to sale price.`;
    flyerCycleNote = 'Checkers, Pick n Pay, Shoprite, and SPAR publish refreshed weekly flyer deals every Wednesday/Thursday.';
  } else {
    status = 'fair';
    badgeLabel = 'FAIR PRICE';
    headline = 'Standard Shelf Price';
    explanation = `R${currentBestPrice.toFixed(2)} at ${bestStoreName} is within normal everyday price variance (${diffFromAvgPercent >= 0 ? '+' : ''}${diffFromAvgPercent.toFixed(0)}% vs 30d avg).`;
    recommendedAction = 'A reasonable everyday purchase. If buying in bulk, consider waiting for Thursday promotional leaflets.';
    flyerCycleNote = 'Mid-month grocery prices stay steady. Major bulk stock-up discounts peak during month-end payday cycles (25th–3rd).';
  }

  return {
    productId: product.id,
    status,
    badgeLabel,
    headline,
    explanation,
    currentBestPrice,
    bestStoreId: bestCurrent.storeId,
    bestStoreName,
    thirtyDayMin: Number(thirtyDayMin.toFixed(2)),
    thirtyDayAvg: Number(thirtyDayAvg.toFixed(2)),
    thirtyDayMax: Number(thirtyDayMax.toFixed(2)),
    diffFromAvgPercent,
    savingsOpportunity,
    isSpecial,
    specialDetail,
    isStaple: staple,
    recommendedAction,
    flyerCycleNote
  };
}

// ----------------------------------------------------------------------
// Local Storage Watchlist / Tracked Staples
// ----------------------------------------------------------------------

export function getTrackedStapleIds(): string[] {
  try {
    const raw = localStorage.getItem(TRACKED_STAPLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isStapleTracked(productId: string): boolean {
  const ids = getTrackedStapleIds();
  return ids.includes(productId);
}

export function toggleTrackStaple(productId: string): boolean {
  try {
    const ids = getTrackedStapleIds();
    const exists = ids.includes(productId);
    const updated = exists ? ids.filter(id => id !== productId) : [...ids, productId];
    localStorage.setItem(TRACKED_STAPLES_KEY, JSON.stringify(updated));
    // Trigger custom event so any component updates reactively
    window.dispatchEvent(new CustomEvent('chuse_tracked_staples_updated', { detail: updated }));
    return !exists;
  } catch {
    return false;
  }
}

export function getTrackedStaplesCount(): number {
  return getTrackedStapleIds().length;
}
