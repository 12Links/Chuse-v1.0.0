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
  onSpecial?: boolean;
  specialDetail?: string;
  inStock: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string; // e.g., "700g", "2L", "18 Pack", "1kg", "Each"
  image?: string; // We can use abstract icon names from Lucide or beautiful designs
  imageUrl?: string; // High-resolution supermarket packaging images
  prices: StorePrice[]; // Store specific prices
  isPopular?: boolean;
  barcode?: string;
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
  name: string;
  email: string;
  avatarUrl?: string;
  loyaltyCards: {
    checkers: boolean;
    pnp: boolean;
    woolworths: boolean;
    shoprite: boolean;
    spar: boolean;
  };
  region: string;
}
