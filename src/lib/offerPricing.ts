import { StorePrice, StoreId } from '../types';

export type OfferFreshness = 'fresh' | 'stale' | 'unknown' | 'demo';

export interface LoyaltyAccess {
  [storeId: string]: boolean | undefined;
}

/**
 * Report what we actually know about a quote. Missing timestamps are unknown,
 * not silently treated as live. The refresh window can be set by the data source.
 */
export function getOfferFreshness(
  offer: StorePrice,
  now = Date.now(),
  maxAgeHours = 24,
): OfferFreshness {
  if (offer.isDemoData) return 'demo';
  if (!offer.fetchedAt || !offer.source || !offer.branchId) return 'unknown';

  const fetchedAt = Date.parse(offer.fetchedAt);
  if (!Number.isFinite(fetchedAt)) return 'unknown';
  if (fetchedAt > now + 5 * 60_000) return 'unknown';
  if (offer.validFrom) {
    const validFrom = Date.parse(offer.validFrom);
    if (!Number.isFinite(validFrom)) return 'unknown';
    if (validFrom > now) return 'stale';
  }
  if (offer.validUntil) {
    const validUntil = Date.parse(offer.validUntil);
    if (!Number.isFinite(validUntil)) return 'unknown';
    if (validUntil < now) return 'stale';
  }
  return now - fetchedAt <= maxAgeHours * 60 * 60_000 ? 'fresh' : 'stale';
}

/** Return a loyalty price only when the shopper has the matching store card. */
export function getEffectiveOfferPrice(
  offer: StorePrice,
  loyaltyCards?: LoyaltyAccess | null,
): number | null {
  if (!offer.inStock || !Number.isFinite(offer.price) || offer.price <= 0) return null;

  const hasCard = Boolean(loyaltyCards?.[offer.storeId]);
  if (hasCard && offer.loyaltyPrice != null && Number.isFinite(offer.loyaltyPrice) && offer.loyaltyPrice > 0) {
    return offer.loyaltyPrice;
  }
  return offer.price;
}

/** Select offers that can be used for an apples-to-apples basket estimate. */
export function getComparableOffers(
  offers: StorePrice[],
  options: {
    loyaltyCards?: LoyaltyAccess | null;
    branchId?: string;
    includeUnknownFreshness?: boolean;
    now?: number;
    maxAgeHours?: number;
  } = {},
): Array<{ offer: StorePrice; effectivePrice: number; freshness: OfferFreshness }> {
  return offers.flatMap((offer) => {
    const freshness = getOfferFreshness(offer, options.now, options.maxAgeHours);
    if (freshness === 'demo' || freshness === 'stale') return [];
    if (freshness === 'unknown' && !options.includeUnknownFreshness) return [];
    if (options.branchId && offer.branchId !== options.branchId) return [];

    const effectivePrice = getEffectiveOfferPrice(offer, options.loyaltyCards);
    return effectivePrice == null ? [] : [{ offer, effectivePrice, freshness }];
  });
}

export function getStoreName(storeId: StoreId, fallback = storeId): string {
  const names: Record<StoreId, string> = {
    checkers: 'Checkers',
    woolworths: 'Woolworths',
    pnp: 'Pick n Pay',
    shoprite: 'Shoprite',
    foodlovers: "Food Lover's Market",
    boxer: 'Boxer',
    spar: 'SPAR',
  };
  return names[storeId] || fallback;
}
