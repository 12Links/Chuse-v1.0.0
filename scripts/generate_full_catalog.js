import fs from 'fs';
import path from 'path';

// Complete curated South African Supermarket Products Catalog
// Realistic price indices modeled on current SA retail benchmarks (ZAR)
// Supermarkets: woolworths, checkers, pnp, shoprite, spar, boxer, foodlovers

const STORES = [
  { id: 'woolworths', multiplier: 1.15, specialChance: 0.18, promo: 'W-Rewards Save 10%' },
  { id: 'checkers', multiplier: 1.00, specialChance: 0.28, promo: 'Xtra Savings Deal' },
  { id: 'pnp', multiplier: 1.02, specialChance: 0.25, promo: 'Smart Shopper Price' },
  { id: 'shoprite', multiplier: 0.92, specialChance: 0.32, promo: 'Lower Prices You Can Trust' },
  { id: 'spar', multiplier: 1.04, specialChance: 0.22, promo: 'SPAR Rewards Special' },
  { id: 'boxer', multiplier: 0.90, specialChance: 0.35, promo: 'Never Pay More at Boxer' },
  { id: 'foodlovers', multiplier: 0.95, specialChance: 0.26, promo: 'Fresh Market Bargain' },
];

function generatePrices(basePrice) {
  return STORES.map(store => {
    // Variations between -3% and +3% around store multiplier
    const jitter = (Math.random() * 0.06 - 0.03);
    const storePrice = Math.round((basePrice * (store.multiplier + jitter)) * 100) / 100;
    const isSpecial = Math.random() < store.specialChance;
    const specialPrice = isSpecial ? Math.round((storePrice * (Math.random() * 0.15 + 0.82)) * 100) / 100 : storePrice;
    
    return {
      storeId: store.id,
      price: specialPrice,
      onSpecial: isSpecial,
      specialDetail: isSpecial ? store.promo : '',
      inStock: true
    };
  });
}

const RAW_PRODUCTS = [
  // --- Dairy & Eggs ---
  {
    id: "prod-milk-clover-2l",
    name: "Clover Fresh Full Cream Milk 2L",
    category: "Dairy & Eggs",
    unit: "2L",
    isPopular: true,
    barcode: "6001299011113",
    imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
    basePrice: 36.99
  },
  {
    id: "prod-milk-clover-lowfat-2l",
    name: "Clover Fresh Low Fat 2% Milk 2L",
    category: "Dairy & Eggs",
    unit: "2L",
    isPopular: true,
    barcode: "6001299011120",
    imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop&q=80",
    basePrice: 36.99
  },
  {
    id: "prod-milk-parmalat-1l",
    name: "Parmalat EverFresh Full Cream Milk 1L",
    category: "Dairy & Eggs",
    unit: "1L",
    isPopular: true,
    barcode: "6001007000015",
    imageUrl: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=400&auto=format&fit=crop&q=80",
    basePrice: 19.99
  },
  {
    id: "prod-milk-firstchoice-6pk",
    name: "First Choice Full Cream Long Life Milk 6x1L",
    category: "Dairy & Eggs",
    unit: "6x1L",
    isPopular: true,
    barcode: "6002008000021",
    imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
    basePrice: 109.99
  },
  {
    id: "prod-eggs-nulaid-18",
    name: "Nulaid Extra Large Grade A Eggs 18pk",
    category: "Dairy & Eggs",
    unit: "18pk",
    isPopular: true,
    barcode: "6002135468790",
    imageUrl: "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=80",
    basePrice: 58.99
  },
  {
    id: "prod-eggs-nulaid-30",
    name: "Nulaid Large Grade A Eggs 30pk Tray",
    category: "Dairy & Eggs",
    unit: "30pk",
    isPopular: true,
    barcode: "6002135468791",
    imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&auto=format&fit=crop&q=80",
    basePrice: 89.99
  },
  {
    id: "prod-butter-kerrygold",
    name: "Kerrygold Pure Irish Salted Butter 500g",
    category: "Dairy & Eggs",
    unit: "500g",
    isPopular: false,
    barcode: "6005544332210",
    imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80",
    basePrice: 104.99
  },
  {
    id: "prod-margarine-flora-500g",
    name: "Flora Light Spread Margarine Tub 500g",
    category: "Dairy & Eggs",
    unit: "500g",
    isPopular: true,
    barcode: "6001087000034",
    imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80",
    basePrice: 42.99
  },
  {
    id: "prod-margarine-rama-500g",
    name: "Rama Original Margarine Brick 500g",
    category: "Dairy & Eggs",
    unit: "500g",
    isPopular: true,
    barcode: "6001087000041",
    imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80",
    basePrice: 28.99
  },
  {
    id: "prod-cheese-lancewood-cheddar",
    name: "Lancewood Cheddar Cheese Block 400g",
    category: "Dairy & Eggs",
    unit: "400g",
    isPopular: true,
    barcode: "6001087000058",
    imageUrl: "https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400&auto=format&fit=crop&q=80",
    basePrice: 69.99
  },
  {
    id: "prod-cheese-lancewood-cream",
    name: "Lancewood Plain Medium Fat Cream Cheese 230g",
    category: "Dairy & Eggs",
    unit: "230g",
    isPopular: false,
    barcode: "6001087000065",
    imageUrl: "https://images.unsplash.com/photo-1624806992066-5ffcf7ca186b?w=400&auto=format&fit=crop&q=80",
    basePrice: 38.99
  },
  {
    id: "prod-custard-danone-ultramel",
    name: "Danone Ultra Mel Vanilla Flavoured Custard 1L",
    category: "Dairy & Eggs",
    unit: "1L",
    isPopular: true,
    barcode: "6001087000072",
    imageUrl: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400&auto=format&fit=crop&q=80",
    basePrice: 34.99
  },
  {
    id: "prod-yoghurt-nutriday-6pk",
    name: "Danone Nutriday Smooth Yoghurt 6x100g",
    category: "Dairy & Eggs",
    unit: "6x100g",
    isPopular: true,
    barcode: "6001087000089",
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&auto=format&fit=crop&q=80",
    basePrice: 21.99
  },

  // --- Bakery & Bread ---
  {
    id: "prod-bread-sasko-white",
    name: "Sasko Premium White Bread 700g",
    category: "Bakery",
    unit: "700g",
    isPopular: true,
    barcode: "6001234000018",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    basePrice: 18.49
  },
  {
    id: "prod-bread-sasko-brown",
    name: "Sasko More Slices Brown Bread 700g",
    category: "Bakery",
    unit: "700g",
    isPopular: true,
    barcode: "6001234000019",
    imageUrl: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&auto=format&fit=crop&q=80",
    basePrice: 17.49
  },
  {
    id: "prod-bread-albany-white",
    name: "Albany Superior White Bread 700g",
    category: "Bakery",
    unit: "700g",
    isPopular: true,
    barcode: "6001248000144",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    basePrice: 18.99
  },
  {
    id: "prod-bread-albany-brown",
    name: "Albany Superior Sliced Brown Bread 700g",
    category: "Bakery",
    unit: "700g",
    isPopular: true,
    barcode: "6001248000151",
    imageUrl: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&auto=format&fit=crop&q=80",
    basePrice: 17.99
  },
  {
    id: "prod-bread-albany-lowgi",
    name: "Albany Low GI Seeded Brown Bread 700g",
    category: "Bakery",
    unit: "700g",
    isPopular: false,
    barcode: "6001248000168",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    basePrice: 22.99
  },
  {
    id: "prod-bread-blueribbon-white",
    name: "Blue Ribbon Classic White Bread 700g",
    category: "Bakery",
    unit: "700g",
    isPopular: true,
    barcode: "6001248000175",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    basePrice: 17.99
  },
  {
    id: "prod-rolls-hotdog-6pk",
    name: "Fresh Bakery White Hot Dog Rolls 6pk",
    category: "Bakery",
    unit: "6pk",
    isPopular: false,
    barcode: "6001248000182",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    basePrice: 18.99
  },
  {
    id: "prod-rolls-burger-6pk",
    name: "Fresh Bakery Brown Hamburger Buns 6pk",
    category: "Bakery",
    unit: "6pk",
    isPopular: false,
    barcode: "6001248000199",
    imageUrl: "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&auto=format&fit=crop&q=80",
    basePrice: 19.49
  },

  // --- Pantry & Staples ---
  {
    id: "prod-rice-tastic-2kg",
    name: "Tastic Parboiled Long Grain Rice 2kg",
    category: "Pantry & Staples",
    unit: "2kg",
    isPopular: true,
    barcode: "6001016112233",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
    basePrice: 44.99
  },
  {
    id: "prod-rice-tastic-5kg",
    name: "Tastic Parboiled Long Grain Rice 5kg",
    category: "Pantry & Staples",
    unit: "5kg",
    isPopular: true,
    barcode: "6001016112240",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
    basePrice: 104.99
  },
  {
    id: "prod-rice-spekko-2kg",
    name: "Spekko Long Grain Parboiled Rice 2kg",
    category: "Pantry & Staples",
    unit: "2kg",
    isPopular: true,
    barcode: "6001016112257",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
    basePrice: 39.99
  },
  {
    id: "prod-maize-iwisa-5kg",
    name: "Iwisa No.1 Super Maize Meal 5kg",
    category: "Pantry & Staples",
    unit: "5kg",
    isPopular: true,
    barcode: "6001056123456",
    imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=80",
    basePrice: 69.99
  },
  {
    id: "prod-maize-iwisa-10kg",
    name: "Iwisa No.1 Super Maize Meal 10kg",
    category: "Pantry & Staples",
    unit: "10kg",
    isPopular: true,
    barcode: "6001056123463",
    imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=80",
    basePrice: 129.99
  },
  {
    id: "prod-maize-whitestar-5kg",
    name: "White Star Super Maize Meal 5kg",
    category: "Pantry & Staples",
    unit: "5kg",
    isPopular: true,
    barcode: "6001056123470",
    imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=80",
    basePrice: 72.99
  },
  {
    id: "prod-maize-whitestar-10kg",
    name: "White Star Super Maize Meal 10kg",
    category: "Pantry & Staples",
    unit: "10kg",
    isPopular: true,
    barcode: "6001056123487",
    imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=80",
    basePrice: 134.99
  },
  {
    id: "prod-maize-ace-10kg",
    name: "Ace Super Maize Meal 10kg",
    category: "Pantry & Staples",
    unit: "10kg",
    isPopular: false,
    barcode: "6001056123494",
    imageUrl: "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=80",
    basePrice: 124.99
  },
  {
    id: "prod-flour-snowflake-25kg",
    name: "Snowflake Cake Wheat Flour 2.5kg",
    category: "Pantry & Staples",
    unit: "2.5kg",
    isPopular: true,
    barcode: "6001056123500",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    basePrice: 44.99
  },
  {
    id: "prod-flour-goldencloud-25kg",
    name: "Golden Cloud Cake Wheat Flour 2.5kg",
    category: "Pantry & Staples",
    unit: "2.5kg",
    isPopular: true,
    barcode: "6001056123517",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    basePrice: 42.99
  },
  {
    id: "prod-sugar-huletts-25kg",
    name: "Huletts Pure White Sugar 2.5kg",
    category: "Pantry & Staples",
    unit: "2.5kg",
    isPopular: true,
    barcode: "6006677889900",
    imageUrl: "https://images.unsplash.com/photo-1581781870027-0421cae94042?w=400&auto=format&fit=crop&q=80",
    basePrice: 56.99
  },
  {
    id: "prod-sugar-selati-25kg",
    name: "Selati Pure White Sugar 2.5kg",
    category: "Pantry & Staples",
    unit: "2.5kg",
    isPopular: true,
    barcode: "6002135468700",
    imageUrl: "https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=400&auto=format&fit=crop&q=80",
    basePrice: 57.49
  },
  {
    id: "prod-sugar-huletts-brown-2kg",
    name: "Huletts SunSweet Brown Sugar 2kg",
    category: "Pantry & Staples",
    unit: "2kg",
    isPopular: true,
    barcode: "6006677889901",
    imageUrl: "https://images.unsplash.com/photo-1581781870027-0421cae94042?w=400&auto=format&fit=crop&q=80",
    basePrice: 49.99
  },
  {
    id: "prod-oil-sunfoil-2l",
    name: "Sunfoil Pure Sunflower Cooking Oil 2L",
    category: "Pantry & Staples",
    unit: "2L",
    isPopular: true,
    barcode: "6003214568902",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80",
    basePrice: 74.99
  },
  {
    id: "prod-oil-sunfoil-5l",
    name: "Sunfoil Pure Sunflower Cooking Oil 5L",
    category: "Pantry & Staples",
    unit: "5L",
    isPopular: true,
    barcode: "6003214568919",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80",
    basePrice: 179.99
  },
  {
    id: "prod-oil-dlite-2l",
    name: "D'lite Pure Cooking Oil 2L",
    category: "Pantry & Staples",
    unit: "2L",
    isPopular: false,
    barcode: "6003214568926",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80",
    basePrice: 69.99
  },
  {
    id: "prod-oil-bwell-canola-2l",
    name: "B-Well Pure Canola Oil 2L",
    category: "Pantry & Staples",
    unit: "2L",
    isPopular: false,
    barcode: "6003214568933",
    imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80",
    basePrice: 79.99
  },
  {
    id: "prod-pasta-fattis-macaroni-500g",
    name: "Fatti's & Moni's Macaroni Pasta 500g",
    category: "Pantry & Staples",
    unit: "500g",
    isPopular: true,
    barcode: "6001007001001",
    imageUrl: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&auto=format&fit=crop&q=80",
    basePrice: 19.99
  },
  {
    id: "prod-pasta-fattis-spaghetti-500g",
    name: "Fatti's & Moni's Spaghetti Pasta 500g",
    category: "Pantry & Staples",
    unit: "500g",
    isPopular: true,
    barcode: "6001007001018",
    imageUrl: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&auto=format&fit=crop&q=80",
    basePrice: 19.99
  },
  {
    id: "prod-noodles-maggi-chicken-5pk",
    name: "Maggi 2-Minute Noodles Chicken Flavour 5pk",
    category: "Pantry & Staples",
    unit: "5x73g",
    isPopular: true,
    barcode: "6001007001025",
    imageUrl: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=80",
    basePrice: 34.99
  },
  {
    id: "prod-canned-koo-beans-410g",
    name: "Koo Baked Beans in Rich Tomato Sauce 410g",
    category: "Pantry & Staples",
    unit: "410g",
    isPopular: true,
    barcode: "6001007009876",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
    basePrice: 16.99
  },
  {
    id: "prod-canned-koo-chakalaka-410g",
    name: "Koo Mild & Spicy Chakalaka 410g",
    category: "Pantry & Staples",
    unit: "410g",
    isPopular: true,
    barcode: "6001007009883",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
    basePrice: 19.99
  },
  {
    id: "prod-canned-koo-sweetcorn-415g",
    name: "Koo Cream Style Sweetcorn 415g",
    category: "Pantry & Staples",
    unit: "415g",
    isPopular: false,
    barcode: "6001007009890",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
    basePrice: 21.99
  },
  {
    id: "prod-canned-luckystar-pilchards-tomato",
    name: "Lucky Star Pilchards in Tomato Sauce 400g",
    category: "Pantry & Staples",
    unit: "400g",
    isPopular: true,
    barcode: "6001007009906",
    imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80",
    basePrice: 26.99
  },
  {
    id: "prod-canned-luckystar-pilchards-chilli",
    name: "Lucky Star Pilchards in Sweet Chilli 400g",
    category: "Pantry & Staples",
    unit: "400g",
    isPopular: true,
    barcode: "6001007009913",
    imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80",
    basePrice: 26.99
  },
  {
    id: "prod-canned-tuna-johnwest",
    name: "John West Shredded Tuna in Brine 170g",
    category: "Pantry & Staples",
    unit: "170g",
    isPopular: false,
    barcode: "6001007009920",
    imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80",
    basePrice: 27.99
  },
  {
    id: "prod-sauce-allgold-700ml",
    name: "All Gold Tomato Sauce Glass Bottle 700ml",
    category: "Pantry & Staples",
    unit: "700ml",
    isPopular: true,
    barcode: "6001007004321",
    imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80",
    basePrice: 39.99
  },
  {
    id: "prod-sauce-mrsballs-chutney",
    name: "Mrs H.S. Ball's Original Recipe Chutney 470g",
    category: "Pantry & Staples",
    unit: "470g",
    isPopular: true,
    barcode: "6001007004338",
    imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80",
    basePrice: 38.99
  },
  {
    id: "prod-mayo-crosse-blackwell-750g",
    name: "Crosse & Blackwell Tangy Mayonnaise 750g",
    category: "Pantry & Staples",
    unit: "750g",
    isPopular: true,
    barcode: "6001007004345",
    imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80",
    basePrice: 42.99
  },
  {
    id: "prod-sauce-nandos-periperi-250ml",
    name: "Nando's Peri-Peri Sauce Medium 250ml",
    category: "Pantry & Staples",
    unit: "250ml",
    isPopular: true,
    barcode: "6001007004352",
    imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80",
    basePrice: 48.99
  },
  {
    id: "prod-peanutbutter-blackcat-800g",
    name: "Black Cat Smooth Peanut Butter 800g",
    category: "Pantry & Staples",
    unit: "800g",
    isPopular: true,
    barcode: "6001007004369",
    imageUrl: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=400&auto=format&fit=crop&q=80",
    basePrice: 79.99
  },
  {
    id: "prod-spread-bovril-250g",
    name: "Bovril Beefy Savoury Extract Spread 250g",
    category: "Pantry & Staples",
    unit: "250g",
    isPopular: false,
    barcode: "6001007004376",
    imageUrl: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=400&auto=format&fit=crop&q=80",
    basePrice: 54.99
  },
  {
    id: "prod-spread-marmite-250g",
    name: "Marmite Yeast Extract Spread 250g",
    category: "Pantry & Staples",
    unit: "250g",
    isPopular: false,
    barcode: "6001007004383",
    imageUrl: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=400&auto=format&fit=crop&q=80",
    basePrice: 56.99
  },
  {
    id: "prod-spice-aromat-75g",
    name: "Knorr Aromat Original Savoury Seasoning Canister 75g",
    category: "Pantry & Staples",
    unit: "75g",
    isPopular: true,
    barcode: "6001007004390",
    imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80",
    basePrice: 19.99
  },
  {
    id: "prod-soup-knorr-brownonion",
    name: "Knorr Brown Onion Soup Powder Sachet 50g",
    category: "Pantry & Staples",
    unit: "50g",
    isPopular: true,
    barcode: "6001007004406",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
    basePrice: 8.99
  },
  {
    id: "prod-salt-cerebos-500g",
    name: "Cerebos Iodated Free Flowing Table Salt 500g",
    category: "Pantry & Staples",
    unit: "500g",
    isPopular: false,
    barcode: "6001007004413",
    imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&auto=format&fit=crop&q=80",
    basePrice: 14.99
  },

  // --- Breakfast & Cereals ---
  {
    id: "prod-cereal-weetbix-450g",
    name: "Bokomo Weet-Bix Wholegrain Wheat Biscuits 450g",
    category: "Breakfast & Cereals",
    unit: "450g",
    isPopular: true,
    barcode: "6001007001234",
    imageUrl: "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400&auto=format&fit=crop&q=80",
    basePrice: 32.99
  },
  {
    id: "prod-cereal-weetbix-900g",
    name: "Bokomo Weet-Bix Wholegrain Wheat Biscuits 900g",
    category: "Breakfast & Cereals",
    unit: "900g",
    isPopular: true,
    barcode: "6001007001241",
    imageUrl: "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400&auto=format&fit=crop&q=80",
    basePrice: 59.99
  },
  {
    id: "prod-cereal-cornflakes-1kg",
    name: "Kellogg's Original Toasted Corn Flakes 1kg",
    category: "Breakfast & Cereals",
    unit: "1kg",
    isPopular: true,
    barcode: "6001007005678",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    basePrice: 66.99
  },
  {
    id: "prod-cereal-allbran-1kg",
    name: "Kellogg's High Fibre All-Bran Flakes 1kg",
    category: "Breakfast & Cereals",
    unit: "1kg",
    isPopular: true,
    barcode: "6001007005685",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    basePrice: 79.99
  },
  {
    id: "prod-cereal-ricekrispies-500g",
    name: "Kellogg's Rice Krispies Cereal 500g",
    category: "Breakfast & Cereals",
    unit: "500g",
    isPopular: true,
    barcode: "6001007005692",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    basePrice: 48.99
  },
  {
    id: "prod-cereal-jungleoats-1kg",
    name: "Jungle Oats Original Rolled Oats 1kg",
    category: "Breakfast & Cereals",
    unit: "1kg",
    isPopular: true,
    barcode: "6001007005708",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
    basePrice: 38.99
  },
  {
    id: "prod-cereal-pronutro-500g",
    name: "ProNutro Original High Protein Cereal 500g",
    category: "Breakfast & Cereals",
    unit: "500g",
    isPopular: false,
    barcode: "6001007005715",
    imageUrl: "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400&auto=format&fit=crop&q=80",
    basePrice: 46.99
  },

  // --- Beverages ---
  {
    id: "prod-coffee-jacobs-200g",
    name: "Jacobs Krönung Instant Coffee Jar 200g",
    category: "Beverages",
    unit: "200g",
    isPopular: true,
    barcode: "4005111122334",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80",
    basePrice: 149.99
  },
  {
    id: "prod-coffee-nescafe-gold-200g",
    name: "Nescafé Gold Rich & Smooth Instant Coffee 200g",
    category: "Beverages",
    unit: "200g",
    isPopular: true,
    barcode: "6001122334455",
    imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&auto=format&fit=crop&q=80",
    basePrice: 144.99
  },
  {
    id: "prod-coffee-ricoffy-750g",
    name: "Nescafé Ricoffy Instant Granules Tin 750g",
    category: "Beverages",
    unit: "750g",
    isPopular: true,
    barcode: "6001122334462",
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80",
    basePrice: 89.99
  },
  {
    id: "prod-tea-fiveroses-100s",
    name: "Five Roses Superior Ceylon Tea Bags 100s",
    category: "Beverages",
    unit: "100s",
    isPopular: true,
    barcode: "6001007008765",
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80",
    basePrice: 52.99
  },
  {
    id: "prod-tea-freshpak-rooibos-80s",
    name: "Freshpak Pure Rooibos Tagless Tea Bags 80s",
    category: "Beverages",
    unit: "80s",
    isPopular: true,
    barcode: "6001007008772",
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80",
    basePrice: 46.99
  },
  {
    id: "prod-tea-glen-100s",
    name: "Glen Tagless Strong Black Tea Bags 100s",
    category: "Beverages",
    unit: "100s",
    isPopular: true,
    barcode: "6001007008789",
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80",
    basePrice: 32.99
  },
  {
    id: "prod-beverage-milo-500g",
    name: "Nestlé Milo Chocolate Malt Drink Tin 500g",
    category: "Beverages",
    unit: "500g",
    isPopular: true,
    barcode: "6001007008796",
    imageUrl: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400&auto=format&fit=crop&q=80",
    basePrice: 68.99
  },
  {
    id: "prod-juice-oros-orange-2l",
    name: "Oros Original Orange Squash Concentrate 2L",
    category: "Beverages",
    unit: "2L",
    isPopular: true,
    barcode: "6001007008802",
    imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&auto=format&fit=crop&q=80",
    basePrice: 42.99
  },
  {
    id: "prod-soda-coke-2l",
    name: "Coca-Cola Original Taste Soft Drink 2L",
    category: "Beverages",
    unit: "2L",
    isPopular: true,
    barcode: "6005566778899",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80",
    basePrice: 24.99
  },
  {
    id: "prod-soda-coke-nosugar-2l",
    name: "Coca-Cola No Sugar Soft Drink 2L",
    category: "Beverages",
    unit: "2L",
    isPopular: true,
    barcode: "6005566778905",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80",
    basePrice: 23.99
  },
  {
    id: "prod-soda-sprite-2l",
    name: "Sprite Lemon-Lime Refreshing Soft Drink 2L",
    category: "Beverages",
    unit: "2L",
    isPopular: true,
    barcode: "6005566778912",
    imageUrl: "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&auto=format&fit=crop&q=80",
    basePrice: 24.49
  },
  {
    id: "prod-soda-stoney-2l",
    name: "Stoney Ginger Beer Extra Kwenza 2L",
    category: "Beverages",
    unit: "2L",
    isPopular: true,
    barcode: "6005566778929",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80",
    basePrice: 24.99
  },
  {
    id: "prod-juice-liquifruit-1l",
    name: "Liqui-Fruit 100% Berry Blaze Fruit Juice 1L",
    category: "Beverages",
    unit: "1L",
    isPopular: true,
    barcode: "6005566778936",
    imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&auto=format&fit=crop&q=80",
    basePrice: 26.99
  },
  {
    id: "prod-juice-ceres-whispering-1l",
    name: "Ceres 100% Fruit Juice Whispering Breeze 1L",
    category: "Beverages",
    unit: "1L",
    isPopular: false,
    barcode: "6005566778943",
    imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&auto=format&fit=crop&q=80",
    basePrice: 27.99
  },
  {
    id: "prod-water-valpre-still-15l",
    name: "Valpré Still Natural Spring Water 1.5L",
    category: "Beverages",
    unit: "1.5L",
    isPopular: false,
    barcode: "6005566778950",
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80",
    basePrice: 15.99
  },

  // --- Meat, Poultry & Seafood ---
  {
    id: "prod-meat-chicken-breasts-1kg",
    name: "Fresh Skinless Chicken Breast Fillets 1kg",
    category: "Meat & Poultry",
    unit: "1kg",
    isPopular: true,
    barcode: "6004455667788",
    imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80",
    basePrice: 99.99
  },
  {
    id: "prod-meat-chicken-goldi-2kg",
    name: "Goldi Frozen Mixed Chicken Portions IQF 2kg",
    category: "Meat & Poultry",
    unit: "2kg",
    isPopular: true,
    barcode: "6004455667795",
    imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80",
    basePrice: 89.99
  },
  {
    id: "prod-meat-chicken-rainbow-2kg",
    name: "Rainbow Frozen Mixed Chicken Portions 2kg",
    category: "Meat & Poultry",
    unit: "2kg",
    isPopular: true,
    barcode: "6004455667801",
    imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80",
    basePrice: 94.99
  },
  {
    id: "prod-meat-beef-leanmince-1kg",
    name: "Lean Grade A Beef Mince 1kg",
    category: "Meat & Poultry",
    unit: "1kg",
    isPopular: true,
    barcode: "6004455667818",
    imageUrl: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&auto=format&fit=crop&q=80",
    basePrice: 109.99
  },
  {
    id: "prod-meat-boerewors-championship",
    name: "Championship Traditional Beef Boerewors 1kg",
    category: "Meat & Poultry",
    unit: "1kg",
    isPopular: true,
    barcode: "6004455667825",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
    basePrice: 104.99
  },
  {
    id: "prod-meat-boerewors-grabouw",
    name: "Grabouw Traditional Farmer's Boerewors 1kg",
    category: "Meat & Poultry",
    unit: "1kg",
    isPopular: true,
    barcode: "6004455667832",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
    basePrice: 109.99
  },
  {
    id: "prod-meat-bacon-eskort-200g",
    name: "Eskort Streaky Wood-Smoked Bacon 200g",
    category: "Meat & Poultry",
    unit: "200g",
    isPopular: true,
    barcode: "6004455667849",
    imageUrl: "https://images.unsplash.com/photo-1528607929212-2636ec44253e?w=400&auto=format&fit=crop&q=80",
    basePrice: 42.99
  },
  {
    id: "prod-meat-viennas-eskort-500g",
    name: "Eskort Smoked Red Viennas 500g",
    category: "Meat & Poultry",
    unit: "500g",
    isPopular: true,
    barcode: "6004455667856",
    imageUrl: "https://images.unsplash.com/photo-1528607929212-2636ec44253e?w=400&auto=format&fit=crop&q=80",
    basePrice: 49.99
  },
  {
    id: "prod-seafood-ij-hake-800g",
    name: "I&J Deep Sea Prime Skinless Hake Fillets 800g",
    category: "Meat & Poultry",
    unit: "800g",
    isPopular: false,
    barcode: "6004455667863",
    imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80",
    basePrice: 119.99
  },
  {
    id: "prod-seafood-seaharvest-fishfingers",
    name: "Sea Harvest Crispy Crumbed Fish Fingers 400g",
    category: "Meat & Poultry",
    unit: "400g",
    isPopular: true,
    barcode: "6004455667870",
    imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80",
    basePrice: 49.99
  },

  // --- Fresh Produce & Fruit ---
  {
    id: "prod-produce-potatoes-2kg",
    name: "First Grade Washed Medium Potatoes 2kg Bag",
    category: "Fresh Produce",
    unit: "2kg",
    isPopular: true,
    barcode: "6003344556677",
    imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80",
    basePrice: 34.99
  },
  {
    id: "prod-produce-potatoes-7kg",
    name: "Selected First Grade Potatoes 7kg Pocket",
    category: "Fresh Produce",
    unit: "7kg",
    isPopular: true,
    barcode: "6003344556684",
    imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80",
    basePrice: 89.99
  },
  {
    id: "prod-produce-onions-2kg",
    name: "Choice Crisp Yellow Onions 2kg Bag",
    category: "Fresh Produce",
    unit: "2kg",
    isPopular: true,
    barcode: "6003344556691",
    imageUrl: "https://images.unsplash.com/photo-1508747703725-719777637510?w=400&auto=format&fit=crop&q=80",
    basePrice: 36.99
  },
  {
    id: "prod-produce-tomatoes-1kg",
    name: "Fresh Round Red Ripe Tomatoes 1kg Tray",
    category: "Fresh Produce",
    unit: "1kg",
    isPopular: true,
    barcode: "6003344556707",
    imageUrl: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&auto=format&fit=crop&q=80",
    basePrice: 24.99
  },
  {
    id: "prod-produce-carrots-1kg",
    name: "Crisp Sweet Carrots 1kg Bag",
    category: "Fresh Produce",
    unit: "1kg",
    isPopular: false,
    barcode: "6003344556714",
    imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&auto=format&fit=crop&q=80",
    basePrice: 18.99
  },
  {
    id: "prod-produce-bananas-1kg",
    name: "Fresh Sweet Bananas 1kg Bunch",
    category: "Fresh Produce",
    unit: "1kg",
    isPopular: true,
    barcode: "6002233445566",
    imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80",
    basePrice: 21.99
  },
  {
    id: "prod-produce-apples-golden-15kg",
    name: "Golden Delicious Apples 1.5kg Thriftpack",
    category: "Fresh Produce",
    unit: "1.5kg",
    isPopular: true,
    barcode: "6002233445573",
    imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80",
    basePrice: 29.99
  },
  {
    id: "prod-produce-avocados-2pk",
    name: "Ripe & Ready Hass Avocados 2pk",
    category: "Fresh Produce",
    unit: "2pk",
    isPopular: false,
    barcode: "6002233445580",
    imageUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&auto=format&fit=crop&q=80",
    basePrice: 29.99
  },
  {
    id: "prod-produce-spinach-bunch",
    name: "Fresh Farm Crisp Spinach Bunch",
    category: "Fresh Produce",
    unit: "1 Bunch",
    isPopular: false,
    barcode: "6002233445597",
    imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=80",
    basePrice: 16.99
  },

  // --- Snacks & Sweets ---
  {
    id: "prod-chips-simba-smokedbeef-120g",
    name: "Simba Potato Chips Smoked Beef Flavour 120g",
    category: "Snacks & Sweets",
    unit: "120g",
    isPopular: true,
    barcode: "6001007007001",
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80",
    basePrice: 19.99
  },
  {
    id: "prod-chips-simba-chutney-120g",
    name: "Simba Potato Chips Mrs Ball's Chutney 120g",
    category: "Snacks & Sweets",
    unit: "120g",
    isPopular: true,
    barcode: "6001007007018",
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80",
    basePrice: 19.99
  },
  {
    id: "prod-chips-lays-sweet-chilli-120g",
    name: "Lay's Sweet Chilli Pepper Potato Chips 120g",
    category: "Snacks & Sweets",
    unit: "120g",
    isPopular: true,
    barcode: "6001007007025",
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80",
    basePrice: 22.99
  },
  {
    id: "prod-chips-doritos-sweet-chilli-145g",
    name: "Doritos Sweet Chilli Pepper Tortilla Chips 145g",
    category: "Snacks & Sweets",
    unit: "145g",
    isPopular: true,
    barcode: "6001007007032",
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80",
    basePrice: 23.99
  },
  {
    id: "prod-chips-niknaks-cheese-135g",
    name: "NikNaks Real Cheese Flavour Maize Snack 135g",
    category: "Snacks & Sweets",
    unit: "135g",
    isPopular: true,
    barcode: "6001007007049",
    imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80",
    basePrice: 16.99
  },
  {
    id: "prod-choc-cadbury-dairymilk-150g",
    name: "Cadbury Dairy Milk Pure Milk Chocolate Slab 150g",
    category: "Snacks & Sweets",
    unit: "150g",
    isPopular: true,
    barcode: "6001007007056",
    imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80",
    basePrice: 38.99
  },
  {
    id: "prod-choc-nestle-barone-55g",
    name: "Nestlé Bar One Nougat & Caramel Chocolate Bar 55g",
    category: "Snacks & Sweets",
    unit: "55g",
    isPopular: true,
    barcode: "6001007007063",
    imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80",
    basePrice: 14.99
  },
  {
    id: "prod-choc-lunchbar-62g",
    name: "Cadbury Lunch Bar Max Chocolate Bar 62g",
    category: "Snacks & Sweets",
    unit: "62g",
    isPopular: true,
    barcode: "6001007007070",
    imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80",
    basePrice: 15.49
  },
  {
    id: "prod-biscuits-bakers-tennis-200g",
    name: "Bakers Tennis Classic Real Coconut Biscuits 200g",
    category: "Snacks & Sweets",
    unit: "200g",
    isPopular: true,
    barcode: "6001007007087",
    imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80",
    basePrice: 22.99
  },
  {
    id: "prod-biscuits-bakers-romanycreams",
    name: "Bakers Romany Creams Choc Coconut Biscuits 200g",
    category: "Snacks & Sweets",
    unit: "200g",
    isPopular: true,
    barcode: "6001007007094",
    imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80",
    basePrice: 28.99
  },
  {
    id: "prod-biscuits-bakers-provita-250g",
    name: "Bakers Provita Wholewheat Crispbread 250g",
    category: "Snacks & Sweets",
    unit: "250g",
    isPopular: false,
    barcode: "6001007007100",
    imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80",
    basePrice: 34.99
  },

  // --- Household & Cleaning ---
  {
    id: "prod-wash-omo-auto-2kg",
    name: "Omo Auto Washing Powder Detergent 2kg",
    category: "Household & Cleaning",
    unit: "2kg",
    isPopular: true,
    barcode: "6001007002468",
    imageUrl: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&auto=format&fit=crop&q=80",
    basePrice: 89.99
  },
  {
    id: "prod-wash-omo-auto-3kg",
    name: "Omo Auto Washing Powder Detergent 3kg",
    category: "Household & Cleaning",
    unit: "3kg",
    isPopular: true,
    barcode: "6001007002475",
    imageUrl: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&auto=format&fit=crop&q=80",
    basePrice: 129.99
  },
  {
    id: "prod-wash-ariel-liquid-15l",
    name: "Ariel Auto Washing Liquid Touch of Lenor 1.5L",
    category: "Household & Cleaning",
    unit: "1.5L",
    isPopular: true,
    barcode: "6001007002482",
    imageUrl: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&auto=format&fit=crop&q=80",
    basePrice: 94.99
  },
  {
    id: "prod-dish-sunlight-750ml",
    name: "Sunlight Regular Lemon Dishwashing Liquid 750ml",
    category: "Household & Cleaning",
    unit: "750ml",
    isPopular: true,
    barcode: "6007788991123",
    imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80",
    basePrice: 32.99
  },
  {
    id: "prod-cleaner-handyandy-750ml",
    name: "Handy Andy All-in-One Ammonia Cream Cleaner 750ml",
    category: "Household & Cleaning",
    unit: "750ml",
    isPopular: true,
    barcode: "6001007002499",
    imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80",
    basePrice: 29.99
  },
  {
    id: "prod-cleaner-domestos-750ml",
    name: "Domestos Thick Bleach Multi-Purpose Cleaner 750ml",
    category: "Household & Cleaning",
    unit: "750ml",
    isPopular: true,
    barcode: "6001007002505",
    imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80",
    basePrice: 34.99
  },
  {
    id: "prod-cleaner-jik-bleach-750ml",
    name: "Jik Regular Multi-Action Household Bleach 750ml",
    category: "Household & Cleaning",
    unit: "750ml",
    isPopular: false,
    barcode: "6001007002512",
    imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80",
    basePrice: 27.99
  },
  {
    id: "prod-toiletpaper-babysoft-9",
    name: "Baby Soft White 2-Ply Toilet Paper 9 Rolls",
    category: "Household & Cleaning",
    unit: "9 Rolls",
    isPopular: true,
    barcode: "6007788991122",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80",
    basePrice: 79.99
  },
  {
    id: "prod-toiletpaper-babysoft-18",
    name: "Baby Soft White 2-Ply Toilet Paper 18 Rolls",
    category: "Household & Cleaning",
    unit: "18 Rolls",
    isPopular: true,
    barcode: "6007788991124",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80",
    basePrice: 144.99
  },
  {
    id: "prod-papertowel-twinsaver-2pk",
    name: "Twinsaver 2-Ply Extra Absorbent Paper Towel 2pk",
    category: "Household & Cleaning",
    unit: "2pk",
    isPopular: false,
    barcode: "6007788991125",
    imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80",
    basePrice: 32.99
  },
  {
    id: "prod-insecticide-doom-300ml",
    name: "Doom Super Multi Insect Killer Odourless 300ml",
    category: "Household & Cleaning",
    unit: "300ml",
    isPopular: true,
    barcode: "6007788991126",
    imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80",
    basePrice: 42.99
  },

  // --- Personal Care & Hygiene ---
  {
    id: "prod-dental-colgate-total-100ml",
    name: "Colgate Total Original Antibacterial Toothpaste 100ml",
    category: "Personal Care",
    unit: "100ml",
    isPopular: true,
    barcode: "6001007003007",
    imageUrl: "https://images.unsplash.com/photo-1559591937-e1032b4b7ef8?w=400&auto=format&fit=crop&q=80",
    basePrice: 32.99
  },
  {
    id: "prod-dental-aquafresh-100ml",
    name: "Aquafresh Triple Protection Toothpaste 100ml",
    category: "Personal Care",
    unit: "100ml",
    isPopular: true,
    barcode: "6001007003014",
    imageUrl: "https://images.unsplash.com/photo-1559591937-e1032b4b7ef8?w=400&auto=format&fit=crop&q=80",
    basePrice: 19.99
  },
  {
    id: "prod-soap-protex-deepclean-150g",
    name: "Protex Deep Clean Antibacterial Bath Soap Bar 150g",
    category: "Personal Care",
    unit: "150g",
    isPopular: true,
    barcode: "6001007003021",
    imageUrl: "https://images.unsplash.com/photo-1607006310450-4822830f8d08?w=400&auto=format&fit=crop&q=80",
    basePrice: 16.99
  },
  {
    id: "prod-soap-dettol-original-175g",
    name: "Dettol Hygiene Original Bath Soap 175g",
    category: "Personal Care",
    unit: "175g",
    isPopular: true,
    barcode: "6001007003038",
    imageUrl: "https://images.unsplash.com/photo-1607006310450-4822830f8d08?w=400&auto=format&fit=crop&q=80",
    basePrice: 18.99
  },
  {
    id: "prod-soap-dove-beauty-100g",
    name: "Dove Beauty Cream White Soap Bar 100g",
    category: "Personal Care",
    unit: "100g",
    isPopular: true,
    barcode: "6001007003045",
    imageUrl: "https://images.unsplash.com/photo-1607006310450-4822830f8d08?w=400&auto=format&fit=crop&q=80",
    basePrice: 21.99
  },
  {
    id: "prod-lotion-nivea-nourishing-400ml",
    name: "Nivea Rich Nourishing Body Lotion 400ml",
    category: "Personal Care",
    unit: "400ml",
    isPopular: true,
    barcode: "6001007003052",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
    basePrice: 69.99
  },
  {
    id: "prod-lotion-dawn-cocoa-400ml",
    name: "Dawn Special Care Cocoa Butter Body Lotion 400ml",
    category: "Personal Care",
    unit: "400ml",
    isPopular: true,
    barcode: "6001007003069",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
    basePrice: 38.99
  },
  {
    id: "prod-vaseline-petroleum-250ml",
    name: "Vaseline Blue Seal Pure Petroleum Jelly 250ml",
    category: "Personal Care",
    unit: "250ml",
    isPopular: true,
    barcode: "6001007003076",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
    basePrice: 39.99
  },
  {
    id: "prod-shampoo-headshoulders-400ml",
    name: "Head & Shoulders Classic Clean Anti-Dandruff Shampoo 400ml",
    category: "Personal Care",
    unit: "400ml",
    isPopular: true,
    barcode: "6001007003083",
    imageUrl: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80",
    basePrice: 79.99
  },
  {
    id: "prod-deodorant-shield-women-50ml",
    name: "Shield For Women Fresh Confidence Roll-on 50ml",
    category: "Personal Care",
    unit: "50ml",
    isPopular: true,
    barcode: "6001007003090",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
    basePrice: 28.99
  },
  {
    id: "prod-deodorant-axe-africa-150ml",
    name: "Axe Africa Deodorant Body Spray 150ml",
    category: "Personal Care",
    unit: "150ml",
    isPopular: true,
    barcode: "6001007003106",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80",
    basePrice: 42.99
  },

  // --- Baby Care ---
  {
    id: "prod-baby-pampers-size3-60s",
    name: "Pampers Premium Care Nappies Value Pack Size 3 (60s)",
    category: "Baby Care",
    unit: "60s",
    isPopular: true,
    barcode: "6001007006002",
    imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&auto=format&fit=crop&q=80",
    basePrice: 249.99
  },
  {
    id: "prod-baby-huggies-size3-66s",
    name: "Huggies Dry Comfort Nappies Value Pack Size 3 (66s)",
    category: "Baby Care",
    unit: "66s",
    isPopular: true,
    barcode: "6001007006019",
    imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&auto=format&fit=crop&q=80",
    basePrice: 229.99
  },
  {
    id: "prod-baby-johnsons-powder-400g",
    name: "Johnson's Pure Baby Powder Cornstarch 400g",
    category: "Baby Care",
    unit: "400g",
    isPopular: true,
    barcode: "6001007006026",
    imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&auto=format&fit=crop&q=80",
    basePrice: 49.99
  },
  {
    id: "prod-baby-purity-banana-110g",
    name: "Purity Pureed Banana Baby Food Jar 110g",
    category: "Baby Care",
    unit: "110g",
    isPopular: false,
    barcode: "6001007006033",
    imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&auto=format&fit=crop&q=80",
    basePrice: 15.99
  }
];

const FULL_CATALOG = RAW_PRODUCTS.map(p => ({
  id: p.id,
  name: p.name,
  category: p.category,
  unit: p.unit,
  isPopular: p.isPopular,
  barcode: p.barcode,
  imageUrl: p.imageUrl,
  prices: generatePrices(p.basePrice)
}));

const outputPath = path.join(process.cwd(), 'synced_products.json');
fs.writeFileSync(outputPath, JSON.stringify(FULL_CATALOG, null, 2), 'utf-8');

console.log(`✓ Generated ${FULL_CATALOG.length} high-quality South African supermarket products.`);
console.log(`✓ Saved to ${outputPath}`);
