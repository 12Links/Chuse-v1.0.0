import { StoreId } from '../types';

export interface RetailerTheme {
  id: StoreId;
  name: string;
  shortName: string;
  loyaltyProgram: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder?: string;
  accentColor: string;
  dotColor: string;
  tagColor: string;
  appDeepLinkPrefix?: string;
}

export const RETAILER_THEMES: Record<StoreId, RetailerTheme> = {
  checkers: {
    id: 'checkers',
    name: 'Checkers',
    shortName: 'Checkers',
    loyaltyProgram: 'Xtra Savings',
    badgeBg: 'bg-[#004D40]',
    badgeText: 'text-[#FFE600]',
    badgeBorder: 'border-[#004D40]',
    accentColor: '#004D40',
    dotColor: 'bg-[#008374]',
    tagColor: 'bg-teal-50 text-teal-900 border-teal-200',
    appDeepLinkPrefix: 'https://www.checkers.co.za/search?q='
  },
  pnp: {
    id: 'pnp',
    name: 'Pick n Pay',
    shortName: 'PnP',
    loyaltyProgram: 'Smart Shopper',
    badgeBg: 'bg-[#0B2B6B]',
    badgeText: 'text-white',
    badgeBorder: 'border-l-2 border-l-[#D3122A] border-[#0B2B6B]',
    accentColor: '#0B2B6B',
    dotColor: 'bg-[#002B49]',
    tagColor: 'bg-blue-50 text-blue-900 border-blue-200',
    appDeepLinkPrefix: 'https://www.pnp.co.za/search?q='
  },
  woolworths: {
    id: 'woolworths',
    name: 'Woolworths',
    shortName: 'Woolies',
    loyaltyProgram: 'W-Rewards',
    badgeBg: 'bg-[#18181B]',
    badgeText: 'text-white',
    badgeBorder: 'border-[#18181B]',
    accentColor: '#18181B',
    dotColor: 'bg-black',
    tagColor: 'bg-zinc-100 text-zinc-900 border-zinc-300',
    appDeepLinkPrefix: 'https://www.woolworths.co.za/cat?Ntt='
  },
  shoprite: {
    id: 'shoprite',
    name: 'Shoprite',
    shortName: 'Shoprite',
    loyaltyProgram: 'Xtra Savings',
    badgeBg: 'bg-[#DC2626]',
    badgeText: 'text-white',
    badgeBorder: 'border-[#DC2626]',
    accentColor: '#DC2626',
    dotColor: 'bg-[#DC2626]',
    tagColor: 'bg-red-50 text-red-900 border-red-200',
    appDeepLinkPrefix: 'https://www.shoprite.co.za/search?q='
  },
  spar: {
    id: 'spar',
    name: 'SPAR',
    shortName: 'SPAR',
    loyaltyProgram: 'SPAR Rewards',
    badgeBg: 'bg-[#15803D]',
    badgeText: 'text-white',
    badgeBorder: 'border-[#15803D]',
    accentColor: '#15803D',
    dotColor: 'bg-[#15803D]',
    tagColor: 'bg-green-50 text-green-900 border-green-200',
    appDeepLinkPrefix: 'https://www.spar.co.za/search?q='
  },
  boxer: {
    id: 'boxer',
    name: 'Boxer Superstores',
    shortName: 'Boxer',
    loyaltyProgram: 'Club Card',
    badgeBg: 'bg-[#EA580C]',
    badgeText: 'text-white',
    badgeBorder: 'border-[#EA580C]',
    accentColor: '#EA580C',
    dotColor: 'bg-[#EA580C]',
    tagColor: 'bg-orange-50 text-orange-900 border-orange-200',
    appDeepLinkPrefix: 'https://www.boxer.co.za/search?q='
  },
  foodlovers: {
    id: 'foodlovers',
    name: "Food Lover's Market",
    shortName: "Food Lover's",
    loyaltyProgram: 'Fresh Club',
    badgeBg: 'bg-[#365314]',
    badgeText: 'text-white',
    badgeBorder: 'border-[#365314]',
    accentColor: '#365314',
    dotColor: 'bg-[#365314]',
    tagColor: 'bg-lime-50 text-lime-900 border-lime-200',
    appDeepLinkPrefix: 'https://foodloversmarket.co.za/?s='
  }
};

/**
 * Calculates normalized unit price (per L, per kg, per 100g, per egg/unit)
 * Example: R29.90 for 2L => R14.95 / L
 * Example: R38.99 for 750g => R51.99 / kg
 * Example: R49.99 for 18 Pack => R2.78 / egg
 */
export function calculateNormalizedUnitPrice(price: number, unitString?: string): {
  unitPrice: number;
  formatted: string;
} | null {
  if (!price || price <= 0 || !unitString) return null;

  const raw = unitString.trim().toLowerCase();

  // Litres (e.g. "2L", "1.5L", "500ml", "330ml", "375ml", "1L")
  const litreMatch = raw.match(/^([\d.]+)\s*l$/i);
  if (litreMatch) {
    const litres = parseFloat(litreMatch[1]);
    if (litres > 0) {
      const unitPrice = price / litres;
      return {
        unitPrice,
        formatted: `R${unitPrice.toFixed(2)} / L`
      };
    }
  }

  const mlMatch = raw.match(/^([\d.]+)\s*ml$/i);
  if (mlMatch) {
    const ml = parseFloat(mlMatch[1]);
    if (ml > 0) {
      const litres = ml / 1000;
      const unitPrice = price / litres;
      return {
        unitPrice,
        formatted: `R${unitPrice.toFixed(2)} / L`
      };
    }
  }

  // Kilograms (e.g. "1kg", "2kg", "2.5kg", "5kg", "10kg", "12.5kg")
  const kgMatch = raw.match(/^([\d.]+)\s*kg$/i);
  if (kgMatch) {
    const kg = parseFloat(kgMatch[1]);
    if (kg > 0) {
      const unitPrice = price / kg;
      return {
        unitPrice,
        formatted: `R${unitPrice.toFixed(2)} / kg`
      };
    }
  }

  // Grams (e.g. "700g", "750g", "500g", "250g", "80g", "100g")
  const gMatch = raw.match(/^([\d.]+)\s*g$/i);
  if (gMatch) {
    const g = parseFloat(gMatch[1]);
    if (g > 0) {
      // If >= 250g, display per kg. If < 250g, display per 100g.
      if (g >= 250) {
        const kg = g / 1000;
        const unitPrice = price / kg;
        return {
          unitPrice,
          formatted: `R${unitPrice.toFixed(2)} / kg`
        };
      } else {
        const per100g = (price / g) * 100;
        return {
          unitPrice: per100g,
          formatted: `R${per100g.toFixed(2)} / 100g`
        };
      }
    }
  }

  // Egg / Multi-packs (e.g. "18 Pack", "30 Pack", "6 Pack", "18s", "30-Pack", "6s")
  const packMatch = raw.match(/^([\d.]+)\s*(?:pack|pk|s|-pack)$/i);
  if (packMatch) {
    const count = parseFloat(packMatch[1]);
    if (count > 0) {
      const unitPrice = price / count;
      const noun = raw.includes('egg') ? 'egg' : 'item';
      return {
        unitPrice,
        formatted: `R${unitPrice.toFixed(2)} / ${noun}`
      };
    }
  }

  // Rolls / Units (e.g. "9 Roll", "18 Rolls")
  const rollMatch = raw.match(/^([\d.]+)\s*(?:roll|rolls)$/i);
  if (rollMatch) {
    const count = parseFloat(rollMatch[1]);
    if (count > 0) {
      const unitPrice = price / count;
      return {
        unitPrice,
        formatted: `R${unitPrice.toFixed(2)} / roll`
      };
    }
  }

  // Default fallback if "Each"
  if (raw === 'each' || raw === '1 each') {
    return {
      unitPrice: price,
      formatted: `R${price.toFixed(2)} each`
    };
  }

  return null;
}
