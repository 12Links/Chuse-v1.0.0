export type StoreId = 'checkers' | 'woolworths' | 'pnp' | 'shoprite' | 'foodlovers' | 'boxer' | 'spar';

export interface Store {
  id: StoreId;
  name: string;
  logoColor: string;
  borderColor: string;
  accentBg: string;
  description: string;
  rating: number;
  logoUrl?: string; // High-resolution official store branding logo
}

export interface StorePrice {
  storeId: StoreId;
  price: number;
  /** Previous/non-promotional price when the source provides it. */
  regularPrice?: number;
  /** Member-only price. Kept separate so comparisons respect the shopper's card. */
  loyaltyPrice?: number;
  loyaltyProgram?: string;
  onSpecial?: boolean;
  specialDetail?: string;
  inStock: boolean;
  /** Branch/zone this quote belongs to. Empty means the source is not location-specific. */
  branchId?: string;
  branchName?: string;
  source?: string;
  sourceUrl?: string;
  fetchedAt?: string;
  validFrom?: string;
  validUntil?: string;
  /** True only for explicitly seeded or simulated offers. */
  isDemoData?: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string; // e.g., "700g", "2L", "18 Pack", "1kg", "Each"
  image?: string; // We can use abstract icon names from Lucide or beautiful designs
  imageUrl?: string; // High-resolution supermarket packaging images
  imageSource?: string;
  imageSourceUrl?: string;
  prices: StorePrice[]; // Store specific prices
  /** Real, dated observations supplied by the catalog API; never synthesized in the client. */
  priceHistory?: PriceHistoryObservation[];
  isPopular?: boolean;
  barcode?: string;
}

export interface PriceHistoryObservation {
  observedAt: string;
  storeId: StoreId;
  price: number;
  branchId?: string;
  source?: string;
}

export type RetailerMatchMethod = 'barcode' | 'reviewed' | 'name_size' | 'unmatched';

export interface RetailerLocation {
  id: string;
  retailerId: StoreId;
  externalLocationId: string;
  name: string;
  province?: string;
  city?: string;
  suburb?: string;
  postalCode?: string;
  fulfillmentModes: Array<'delivery' | 'collection' | 'in_store'>;
}

export interface RetailerCatalogProduct {
  id: string;
  retailerId: StoreId;
  retailerSku: string;
  canonicalProductId?: string | null;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  packSize?: string | null;
  variant?: string | null;
  productUrl?: string | null;
  matchMethod: RetailerMatchMethod;
  matchConfidence?: number | null;
}

export interface RetailerPromotion {
  id: string;
  retailerId: StoreId;
  locationId?: string | null;
  title: string;
  description?: string | null;
  promotionType: string;
  rewardValue?: number | null;
  loyaltyProgram?: string | null;
  conditions: Record<string, unknown>;
  validFrom?: string | null;
  validUntil?: string | null;
  source: string;
  sourceUrl?: string | null;
  fetchedAt: string;
}

export interface BasketItem {
  productId: string;
  quantity: number;
}

export interface CustomProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  prices: { [key in StoreId]?: number }; // user-input prices
}

export interface UserProfile {
  displayName: string;
  email: string;
  avatarUrl?: string;
  preferredStoreLocation: string;
  loyaltyCards: {
    checkers: boolean;
    pnp: boolean;
    woolworths: boolean;
    shoprite: boolean;
    spar: boolean;
  };
  isGuest?: boolean;
}

export interface ReceiptItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  bestPrice: number;
  bestStoreId: StoreId;
  bestStoreName: string;
  highestPrice: number;
  lineTotal: number;
  savingsTotal: number;
}

export interface ReceiptStoreGroup {
  storeId: StoreId;
  storeName: string;
  items: ReceiptItem[];
  subtotal: number;
}

export interface ChuseReceipt {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  province: string;
  items: ReceiptItem[];
  storeGroups: ReceiptStoreGroup[];
  totalItemCount: number;
  optimizedTotal: number;
  singleStoreBaselineTotal: number;
  totalSavings: number;
  savingsPercentage: number;
}

export type PriceTimingStatus = 'buy' | 'fair' | 'wait';

export interface StapleTimingAnalysis {
  productId: string;
  status: PriceTimingStatus;
  badgeLabel: string;
  headline: string;
  explanation: string;
  currentBestPrice: number;
  bestStoreId: StoreId;
  bestStoreName: string;
  thirtyDayMin: number;
  thirtyDayAvg: number;
  thirtyDayMax: number;
  diffFromAvgPercent: number; // e.g. -12.5% or +8.2%
  savingsOpportunity: number; // potential savings vs 30-day high or average
  isSpecial: boolean;
  specialDetail?: string;
  isStaple: boolean;
  recommendedAction: string;
  flyerCycleNote: string;
  historyAvailable: boolean;
}

