import { Product, StoreId, StapleTimingAnalysis, PriceTimingStatus } from '../types';
import { STORES } from '../data/catalog';
import { generatePriceHistory } from '../components/PriceHistoryChart';
import { getOfferFreshness } from './offerPricing';

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
 * Computes a buy-timing recommendation only when a current sourced offer and
 * enough matching, branch-specific observations exist.
 */
export function analyzePriceTiming(product: Product): StapleTimingAnalysis {
  const validPrices = product.prices.filter(
    p => p.inStock && p.price > 0 && getOfferFreshness(p) === 'fresh'
  );
  
  if (validPrices.length === 0) {
    return {
      productId: product.id,
      status: 'fair',
      badgeLabel: 'PRICE NOT VERIFIED',
      headline: 'Verified price data is not available yet',
      explanation: 'Chuse needs a recent retailer quote with its source and location before it can give trustworthy buy timing.',
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
      recommendedAction: 'You can still explore the catalog. Price timing will appear when verified offers are connected.',
      flyerCycleNote: 'Offer source and last-checked time will be shown when available.',
      historyAvailable: false,
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

  // Use only dated observations returned by the catalog API. Never manufacture history.
  const historyPoints = generatePriceHistory(product);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentObservations = (product.priceHistory || []).filter((observation) => {
    const observedAt = Date.parse(observation.observedAt);
    const matchingOffer = validPrices.find(price =>
      price.storeId === observation.storeId && price.branchId === observation.branchId
    );
    return Boolean(matchingOffer)
      && Number.isFinite(observation.price)
      && observation.price > 0
      && Number.isFinite(observedAt)
      && observedAt >= thirtyDaysAgo
      && observedAt <= Date.now();
  });
  const distinctObservationDays = new Set(recentObservations.map((observation) =>
    new Date(observation.observedAt).toISOString().slice(0, 10)
  ));

  if (historyPoints.length < 3 || distinctObservationDays.size < 3) {
    return {
      productId: product.id,
      status: 'fair',
      badgeLabel: 'COLLECTING HISTORY',
      headline: 'Not enough verified history yet',
      explanation: `The current verified quote is R${currentBestPrice.toFixed(2)} at ${bestStoreName}. Chuse needs several dated observations before it can call the price low, typical, or high.`,
      currentBestPrice,
      bestStoreId: bestCurrent.storeId,
      bestStoreName,
      thirtyDayMin: 0,
      thirtyDayAvg: 0,
      thirtyDayMax: 0,
      diffFromAvgPercent: 0,
      savingsOpportunity: 0,
      isSpecial: validPrices.some(price => price.onSpecial),
      specialDetail: validPrices.find(price => price.onSpecial)?.specialDetail,
      isStaple: isHouseholdStaple(product),
      recommendedAction: 'Compare current offers and check the branch and last-checked time before shopping.',
      flyerCycleNote: 'Special dates and availability vary by retailer and location.',
      historyAvailable: false,
    };
  }
  
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

  if (allHistoricalPrices.length === 0 || bestHistoricalPrices.length === 0) {
    return {
      productId: product.id,
      status: 'fair',
      badgeLabel: 'COLLECTING HISTORY',
      headline: 'Not enough verified history yet',
      explanation: 'Chuse has not collected enough matching store observations to compare this quote over time.',
      currentBestPrice,
      bestStoreId: bestCurrent.storeId,
      bestStoreName,
      thirtyDayMin: 0,
      thirtyDayAvg: 0,
      thirtyDayMax: 0,
      diffFromAvgPercent: 0,
      savingsOpportunity: 0,
      isSpecial: validPrices.some(price => price.onSpecial),
      specialDetail: validPrices.find(price => price.onSpecial)?.specialDetail,
      isStaple: isHouseholdStaple(product),
      recommendedAction: 'Check the listed source and location for the current offer.',
      flyerCycleNote: 'Special dates and availability vary by retailer and location.',
      historyAvailable: false,
    };
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
    flyerCycleNote = 'Check the offer validity dates and loyalty requirements before shopping.';
  } else if (isElevated) {
    status = 'wait';
    badgeLabel = 'WAIT';
    headline = 'Wait to Buy · Price Elevated';
    explanation = `R${currentBestPrice.toFixed(2)} at ${bestStoreName} is ${diffFromAvgPercent.toFixed(0)}% above the lowest cross-store basket price observed over the last 30 days.`;
    recommendedAction = `If you can wait, set a target near the observed low of R${thirtyDayMin.toFixed(2)} and watch for a verified offer.`;
    flyerCycleNote = 'Prices and promotions vary by branch or delivery zone.';
  } else {
    status = 'fair';
    badgeLabel = 'FAIR PRICE';
    headline = 'Standard Shelf Price';
    explanation = `R${currentBestPrice.toFixed(2)} at ${bestStoreName} is within normal everyday price variance (${diffFromAvgPercent >= 0 ? '+' : ''}${diffFromAvgPercent.toFixed(0)}% vs 30d avg).`;
    recommendedAction = 'Compare the current total with your own budget and check that the offer is still valid at this location.';
    flyerCycleNote = 'This comparison uses dated observations for the selected source and location.';
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
    flyerCycleNote,
    historyAvailable: true,
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
