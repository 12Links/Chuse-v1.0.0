import { Store, Product } from '../types';

export const STORES: Store[] = [
  {
    id: 'woolworths',
    name: 'Woolworths',
    logoColor: 'bg-black text-white',
    borderColor: 'border-neutral-900',
    accentBg: 'bg-neutral-50 hover:bg-neutral-100',
    description: 'Premium quality grocery, known for exceptional fresh items and gourmet organic selections.',
    rating: 4.6,
    logoUrl: '/icons/woolworths.svg'
  },
  {
    id: 'checkers',
    name: 'Checkers',
    logoColor: 'bg-teal-700 text-white',
    borderColor: 'border-teal-700',
    accentBg: 'bg-teal-50 hover:bg-teal-100',
    description: 'Dynamic range with high-quality housebrands (Simple Truth) and excellent cheese/wine cellars.',
    rating: 4.4,
    logoUrl: '/icons/checkers.png'
  },
  {
    id: 'pnp',
    name: 'Pick n Pay',
    logoColor: 'bg-zinc-950 text-white',
    borderColor: 'border-zinc-950',
    accentBg: 'bg-zinc-50 hover:bg-zinc-100',
    description: 'Trusted family retailer offering great Smart Shopper savings and solid everyday essentials.',
    rating: 4.1,
    logoUrl: 'https://cdn-prd-02.pnp.co.za/sys-master/images/h7c/hc7/11159969071134/PicknPayLogo.svg'
  },
  {
    id: 'shoprite',
    name: 'Shoprite',
    logoColor: 'bg-red-600 text-white',
    borderColor: 'border-red-600',
    accentBg: 'bg-red-50 hover:bg-red-100',
    description: 'Dedicated to offering the lowest possible prices on everyday basic items and bulk groceries.',
    rating: 4.0,
    logoUrl: '/icons/shoprite.png'
  },
  {
    id: 'foodlovers',
    name: 'Food Lover\'s Market',
    logoColor: 'bg-lime-800 text-white',
    borderColor: 'border-lime-700',
    accentBg: 'bg-lime-50 hover:bg-lime-100',
    description: 'South Africa\'s leading fresh produce and organic food market, boasting premier bakeries and butcheries.',
    rating: 4.5,
    logoUrl: 'https://flm-cdn.s3.eu-central-1.amazonaws.com/wp-content/uploads/20231115150518/flm-green-favicon.png'
  },
  {
    id: 'boxer',
    name: 'Boxer Superstores',
    logoColor: 'bg-red-700 text-white',
    borderColor: 'border-red-700',
    accentBg: 'bg-red-50 hover:bg-red-100',
    description: 'The champion of discount shopping, dedicated to providing low-price commodity staples and fresh foods.',
    rating: 4.2,
    logoUrl: 'https://www.boxer.co.za/themes/boxer/assets/images/boxer-logo.png'
  },
  {
    id: 'spar',
    name: 'SPAR',
    logoColor: 'bg-emerald-600 text-white',
    borderColor: 'border-emerald-600',
    accentBg: 'bg-emerald-50 hover:bg-emerald-100',
    description: 'A beloved neighborhood dealer system with a stellar range of fresh deli offerings and SPAR Rewards.',
    rating: 4.3,
    logoUrl: 'https://thespargroup.com/wp-content/themes/spar/images/logo.png'
  }
];
