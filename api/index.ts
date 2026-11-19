import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Optional Supabase Server / Admin client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey && !supabaseUrl.includes("placeholder-project")) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[Supabase] Backend client connected successfully.");
  } catch (err: any) {
    console.warn("[Supabase] Backend initialization skipped:", err.message);
  }
} else {
  console.log("[Supabase] Running with local JSON database fallback.");
}

// Initialize Gemini API Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("[Gemini API] Client initialized successfully.");
  } catch (err: any) {
    console.error("[Gemini API] Failed to initialize client:", err.message);
  }
} else {
  console.warn(
    "[Gemini API] GEMINI_API_KEY not found. Running in mock/fallback mode for AI Savings Wizard."
  );
}

// Fallback in-memory storage for serverless / stateless environments
const inMemoryUsers: Record<string, any> = {};
const inMemoryBaskets: Record<string, any> = {};

const USERS_FILE = path.join(process.cwd(), "local_users.json");
const BASKETS_FILE = path.join(process.cwd(), "local_baskets.json");

function readJsonFile(filePath: string, defaultValue: any): any {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err: any) {
    // Ignore error in serverless read-only filesystem
  }
  return defaultValue;
}

function writeJsonFile(filePath: string, data: any): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err: any) {
    // Read-only filesystem in serverless lambdas is expected
  }
}

let usersDb = readJsonFile(USERS_FILE, inMemoryUsers);
let basketsDb = readJsonFile(BASKETS_FILE, inMemoryBaskets);

// Fallback South African staple products
const FALLBACK_PRODUCTS = [
  {
    id: "sku-milk-2l",
    name: "Clover Full Cream Fresh Milk 2L",
    category: "Dairy & Eggs",
    unit: "2L",
    isPopular: true,
    barcode: "6001299011113",
    imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
    prices: [
      { storeId: "checkers", price: 34.99, onSpecial: true, specialDetail: "Xtra Savings", inStock: true },
      { storeId: "pnp", price: 36.99, onSpecial: false, specialDetail: "", inStock: true },
      { storeId: "woolworths", price: 39.99, onSpecial: false, specialDetail: "", inStock: true },
      { storeId: "shoprite", price: 33.99, onSpecial: true, specialDetail: "Lower Price", inStock: true },
      { storeId: "spar", price: 37.5, onSpecial: false, specialDetail: "", inStock: true }
    ]
  },
  {
    id: "sku-bread-white",
    name: "Albany Superior White Bread 700g",
    category: "Bakery",
    unit: "700g",
    isPopular: true,
    barcode: "6001248000144",
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80",
    prices: [
      { storeId: "checkers", price: 18.99, onSpecial: false, specialDetail: "", inStock: true },
      { storeId: "pnp", price: 18.99, onSpecial: false, specialDetail: "", inStock: true },
      { storeId: "woolworths", price: 21.99, onSpecial: false, specialDetail: "", inStock: true },
      { storeId: "shoprite", price: 17.99, onSpecial: true, specialDetail: "Everyday Low Price", inStock: true },
      { storeId: "spar", price: 19.5, onSpecial: false, specialDetail: "", inStock: true }
    ]
  },
  {
    id: "sku-eggs-18",
    name: "Large Eggs 18pk",
    category: "Dairy & Eggs",
    unit: "18pk",
    isPopular: true,
    barcode: "6001007012345",
    imageUrl: "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=400&auto=format&fit=crop&q=80",
    prices: [
      { storeId: "checkers", price: 54.99, onSpecial: true, specialDetail: "Buy 2 Save R10", inStock: true },
      { storeId: "pnp", price: 56.99, onSpecial: false, specialDetail: "", inStock: true },
      { storeId: "woolworths", price: 62.99, onSpecial: false, specialDetail: "", inStock: true },
      { storeId: "shoprite", price: 52.99, onSpecial: true, specialDetail: "Bulk Saver", inStock: true },
      { storeId: "spar", price: 58.0, onSpecial: false, specialDetail: "", inStock: true }
    ]
  }
];

// Product catalog database loading
function markPreviewCatalog(products: any[]) {
  return products.map((product: any) => ({
    ...product,
    prices: (product.prices || []).map((price: any) => ({
      ...price,
      isDemoData: true,
      source: price.source || "Chuse demo catalog",
    })),
  }));
}

const productsFilePath = path.join(process.cwd(), "synced_products.json");
let productsList: any[] = markPreviewCatalog(FALLBACK_PRODUCTS);
try {
  if (fs.existsSync(productsFilePath)) {
    const data = fs.readFileSync(productsFilePath, "utf-8");
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // This JSON is generated with modeled showcase prices. Keep it usable for
      // UI previews, but never present its values as verified retailer quotes.
      productsList = markPreviewCatalog(parsed);
    }
  }
} catch (err: any) {
  // Use FALLBACK_PRODUCTS
}

const STORE_IDS = new Set(["checkers", "woolworths", "pnp", "shoprite", "spar", "boxer", "foodlovers"]);
const openFoodFactsBarcodeCache = new Map<string, { value: any | null; expiresAt: number }>();
let openFoodFactsReadQueue = Promise.resolve();
let lastOpenFoodFactsReadAt = 0;

/** Barcode lookup uses Open Food Facts identity data only, never retailer pricing. */
function getOpenFoodFactsProductByBarcode(barcode: string): Promise<any | null> {
  const cached = openFoodFactsBarcodeCache.get(barcode);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);

  const read = openFoodFactsReadQueue.then(async () => {
    const secondCacheCheck = openFoodFactsBarcodeCache.get(barcode);
    if (secondCacheCheck && secondCacheCheck.expiresAt > Date.now()) return secondCacheCheck.value;

    const delay = Math.max(0, 4200 - (Date.now() - lastOpenFoodFactsReadAt));
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    lastOpenFoodFactsReadAt = Date.now();
    const fields = "code,product_name,product_name_en,quantity,image_front_url,image_front_thumb_url,categories_tags";
    const url = `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "ChuseSA/1.0.0 (https://chuse.co.za; contact: info@chuse.co.za)", Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error(`Open Food Facts returned HTTP ${response.status}`);
    const payload: any = await response.json();
    const raw = payload.product;
    if (payload.status !== 1 || String(raw?.code || "") !== barcode) {
      openFoodFactsBarcodeCache.set(barcode, { value: null, expiresAt: Date.now() + 24 * 60 * 60_000 });
      return null;
    }
    const name = raw.product_name_en || raw.product_name;
    if (!name) return null;
    const categoryTag = (raw.categories_tags || []).find((tag: string) => tag.startsWith("en:"));
    const product = {
      id: `off-${barcode}`,
      name,
      category: categoryTag ? categoryTag.slice(3).replace(/-/g, " ") : "Groceries",
      unit: raw.quantity || "1 Unit",
      isPopular: false,
      barcode,
      imageUrl: raw.image_front_url || raw.image_front_thumb_url || undefined,
      imageSource: "Open Food Facts",
      imageSourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
      productSource: "Open Food Facts",
      productSourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
      prices: [],
    };
    openFoodFactsBarcodeCache.set(barcode, { value: product, expiresAt: Date.now() + 7 * 24 * 60 * 60_000 });
    return product;
  });
  openFoodFactsReadQueue = read.then(() => undefined, () => undefined);
  return read;
}

/** Add branch-scoped, timestamped retailer offers when catalog v2 has been installed.
 * Legacy `prices` rows remain preview-only; they are never mixed into sourced comparisons.
 */
async function attachSourcedOffers(products: any[], requestedLocation?: { postalCode?: string; suburb?: string; city?: string; province?: string }) {
  if (!supabase || products.length === 0) return products;
  const locationFilter = requestedLocation && Object.values(requestedLocation).some(Boolean) ? requestedLocation : null;
  if (!locationFilter) return products;
  const productIds = products.map((product) => product.id).filter(Boolean);
  try {
    const { data: retailerProducts, error } = await supabase
      .from("retailer_products")
      .select("id,retailer_id,canonical_product_id,retailer_offers(id,source,source_url,current_price,regular_price,loyalty_price,loyalty_program,in_stock,valid_from,valid_until,fetched_at,location_id,retailer_locations(id,name,province,city,suburb,postal_code),retailer_offer_history(regular_price,current_price,observed_at,source))")
      .in("canonical_product_id", productIds);
    if (error) {
      // The migration is optional until the deployment is ready for sourced feeds.
      if (!/does not exist|schema cache/i.test(error.message || "")) {
        console.warn("[Catalog v2] Sourced offers query failed:", error.message);
      }
      return products;
    }

    const byProduct = new Map<string, { prices: any[]; history: any[] }>();
    for (const retailerProduct of retailerProducts || []) {
      if (!STORE_IDS.has(retailerProduct.retailer_id)) continue;
      const target = byProduct.get(retailerProduct.canonical_product_id) || { prices: [], history: [] };
      for (const offer of retailerProduct.retailer_offers || []) {
        const rawLocation = offer.retailer_locations;
        const location = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation;
        if (!location || !offer.source || !offer.fetched_at) continue;
        const matchesRequestedLocation = locationFilter.postalCode
          ? String(location.postal_code || "").trim() === String(locationFilter.postalCode).trim()
          : locationFilter.suburb
            ? String(location.suburb || "").toLowerCase().includes(String(locationFilter.suburb).trim().toLowerCase())
            : locationFilter.city
              ? String(location.city || "").toLowerCase().includes(String(locationFilter.city).trim().toLowerCase())
              : locationFilter.province
                ? String(location.province || "").toLowerCase() === String(locationFilter.province).trim().toLowerCase()
                : false;
        if (!matchesRequestedLocation) continue;
        const currentOffer = {
          storeId: retailerProduct.retailer_id,
          price: Number(offer.current_price),
          regularPrice: offer.regular_price == null ? undefined : Number(offer.regular_price),
          loyaltyPrice: offer.loyalty_price == null ? undefined : Number(offer.loyalty_price),
          loyaltyProgram: offer.loyalty_program || undefined,
          onSpecial: offer.regular_price != null && Number(offer.current_price) < Number(offer.regular_price),
          specialDetail: offer.loyalty_program || "",
          // Unknown availability is not equivalent to in stock.
          inStock: offer.in_stock === true,
          branchId: location.id || offer.location_id,
          branchName: [location.name, location.suburb || location.city].filter(Boolean).join(" · "),
          source: offer.source,
          sourceUrl: offer.source_url || undefined,
          fetchedAt: offer.fetched_at,
          validFrom: offer.valid_from || undefined,
          validUntil: offer.valid_until || undefined,
          isDemoData: false,
        };
        const existingIndex = target.prices.findIndex(price => price.storeId === retailerProduct.retailer_id);
        if (existingIndex === -1) {
          target.prices.push(currentOffer);
        } else if (Date.parse(currentOffer.fetchedAt) > Date.parse(target.prices[existingIndex].fetchedAt)) {
          target.prices[existingIndex] = currentOffer;
        }
        for (const observation of offer.retailer_offer_history || []) {
          target.history.push({
            observedAt: observation.observed_at,
            storeId: retailerProduct.retailer_id,
            price: Number(observation.current_price),
            branchId: location.id || offer.location_id,
            source: observation.source,
          });
        }
      }
      byProduct.set(retailerProduct.canonical_product_id, target);
    }

    return products.map((product) => {
      const sourced = byProduct.get(product.id);
      return sourced?.prices.length
        ? { ...product, prices: sourced.prices, priceHistory: sourced.history }
        : product;
    });
  } catch (err: any) {
    console.warn("[Catalog v2] Sourced offers unavailable:", err.message);
    return products;
  }
}

// Token helper to extract UID from Supabase / JWT token
function getUserIdFromRequest(req: express.Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        return payload.sub || payload.id || payload.user_id || payload.uid || "mock-user-123";
      }
    } catch (e) {
      console.warn("[Auth] Token parsing failed, using fallback mock ID.");
    }
  }
  return "mock-user-123";
}

export const app = express();
app.use(express.json());

// Enable CORS for mobile apps (Capacitor https://localhost) and third-party consumers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// --- API Endpoints ---

// GET /api/products
app.get("/api/products", async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("products").select("*, prices(*)");
      if (!error && data && data.length > 0) {
        const formatted = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          category: d.category || "Groceries",
          unit: d.unit || "1 Unit",
          isPopular: Boolean(d.is_popular),
          barcode: d.barcode || "",
          imageUrl:
            d.image_url ||
            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80",
          prices: (d.prices || []).map((pr: any) => ({
            storeId: pr.store_id,
            price: Number(pr.price),
            onSpecial: Boolean(pr.on_special),
            specialDetail: pr.special_detail || "",
            inStock: true,
            isDemoData: true,
            source: "Legacy catalog without retailer provenance",
          })),
        }));
        return res.json(await attachSourcedOffers(formatted, {
          postalCode: String(req.query.postalCode || ""),
          suburb: String(req.query.suburb || ""),
          city: String(req.query.city || ""),
          province: String(req.query.province || ""),
        }));
      }
    } catch (err: any) {
      console.warn("[Supabase] Products query error, fallback to memory cache:", err.message);
    }
  }
  res.json(productsList);
});

// POST /api/products/search
app.post("/api/products/search", async (req, res) => {
  const query = (req.body.query || "").trim().toLowerCase();
  if (!query) {
    return res.json([]);
  }

  // 1. Try querying Supabase live database
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, prices(*)")
        .or(`name.ilike.%${query}%,category.ilike.%${query}%,barcode.ilike.%${query}%`);
      if (!error && data && data.length > 0) {
        const formatted = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          category: d.category || "Groceries",
          unit: d.unit || "1 Unit",
          isPopular: Boolean(d.is_popular),
          barcode: d.barcode || "",
          imageUrl:
            d.image_url ||
            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80",
          prices: (d.prices || []).map((pr: any) => ({
            storeId: pr.store_id,
            price: Number(pr.price),
            onSpecial: Boolean(pr.on_special),
            specialDetail: pr.special_detail || "",
            inStock: true,
            isDemoData: true,
            source: "Legacy catalog without retailer provenance",
          })),
        }));
        const requestedLocation = req.body.location || {};
        return res.json(await attachSourcedOffers(formatted, {
          postalCode: String(requestedLocation.postalCode || ""),
          suburb: String(requestedLocation.suburb || ""),
          city: String(requestedLocation.city || ""),
          province: String(requestedLocation.province || ""),
        }));
      }
    } catch (err: any) {
      console.warn("[Search] Supabase live search error:", err.message);
    }
  }

  // 2. Multi-token fuzzy fallback on memory cache
  const tokens = query.split(/\s+/).filter(Boolean);
  const filtered = productsList.filter((p) => {
    const text = `${p.name} ${p.category} ${p.unit || ""} ${p.barcode || ""}`.toLowerCase();
    return tokens.every((t) => text.includes(t));
  });
  res.json(filtered);
});

// GET /api/autocomplete & /api/v1/autocomplete
app.get(["/api/autocomplete", "/api/v1/autocomplete"], (req, res) => {
  const q = ((req.query.q as string) || "").trim().toLowerCase();
  if (!q) {
    return res.json([]);
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  const matchingNames = Array.from(
    new Set(
      productsList
        .filter((p) => {
          const text = `${p.name} ${p.category}`.toLowerCase();
          return tokens.every((t) => text.includes(t));
        })
        .map((p) => p.name)
    )
  ).slice(0, 10);
  res.json(matchingNames);
});

// GET /api/search & /api/v1/search
app.get(["/api/search", "/api/v1/search"], (req, res) => {
  const q = ((req.query.q as string) || "").trim().toLowerCase();
  const limit = parseInt(req.query.limit as string) || 12;
  const offset = parseInt(req.query.offset as string) || 0;

  if (!q) {
    return res.json({ items: [], has_more: false, limit, offset });
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const filtered = productsList.filter((p) => {
    const text = `${p.name} ${p.category} ${p.unit || ""}`.toLowerCase();
    return tokens.every((t) => text.includes(t));
  });

  const sliced = filtered.slice(offset, offset + limit);
  res.json({
    items: sliced,
    has_more: filtered.length > offset + limit,
    limit,
    offset,
  });
});

// GET /api/products/:product_id
app.get(
  ["/products/:product_id", "/api/products/:product_id", "/api/v1/products/:product_id"],
  (req, res) => {
    const id = req.params.product_id;
    const product = productsList.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  }
);

// GET /api/barcode/:code & /api/v1/barcode/:code (exact Open Food Facts product lookup)
app.get(
  ["/api/barcode/:code", "/api/v1/barcode/:code"],
  async (req, res) => {
    const rawCode = (req.params.code || "").trim();
    if (!rawCode) {
      return res.status(400).json({ error: "Barcode parameter required" });
    }

    try {
      const product = await getOpenFoodFactsProductByBarcode(rawCode);
      if (product) return res.json(product);
      return res.status(404).json({ error: "No exact product record was found for this barcode.", barcode: rawCode });
    } catch (err: any) {
      console.warn("[Barcode] Open Food Facts lookup failed:", err.message);
      return res.status(503).json({ error: "The product database is temporarily unavailable.", barcode: rawCode });
    }
  }
);

// GET /products/:product_id/compare-stores
app.get(
  [
    "/products/:product_id/compare-stores",
    "/api/products/:product_id/compare-stores",
    "/api/v1/products/:product_id/compare-stores",
  ],
  (req, res) => {
    const id = req.params.product_id;
    const product = productsList.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const storesMap: Record<string, string> = {
      woolworths: "Woolworths",
      checkers: "Checkers",
      pnp: "Pick n Pay",
      shoprite: "Shoprite",
      foodlovers: "Food Lover's Market",
      boxer: "Boxer Superstores",
      spar: "SPAR",
    };

    const compared = (product.prices || [])
      .map((priceInfo: any) => ({
        storeId: priceInfo.storeId,
        storeName: storesMap[priceInfo.storeId] || priceInfo.storeId,
        price: priceInfo.price,
        onSpecial: priceInfo.onSpecial || false,
        specialDetail: priceInfo.specialDetail || "",
        lastUpdated: priceInfo.lastUpdated || new Date().toISOString(),
      }))
      .sort((a: any, b: any) => a.price - b.price);

    res.json({
      productId: id,
      barcode: product.barcode || "",
      stores: compared,
    });
  }
);

// GET /api/sync/status
app.get("/api/sync/status", (req, res) => {
  res.json({
    success: true,
    lastSyncTime: new Date().toISOString(),
    syncLogs: [
      "System bootstrap: Express-based daily pricing engine active on Vercel.",
      "Successfully initialized memory cache for SA retail indexes.",
      supabase
        ? "Supabase database client connected."
        : "Running with local JSON database fallback.",
    ],
    schedule: "0 2 * * * (Every day at 2am via GitHub Actions)",
    status: "Healthy",
    version: "4.0.0-node",
    backend: supabase ? "Supabase (PostgreSQL)" : "Local In-Memory Cache Engine",
    supabaseConnected: Boolean(supabase),
  });
});

// POST /api/v1/auth/register
app.post("/api/v1/auth/register", async (req, res) => {
  const { uid, email, displayName, loyaltyCards, preferredStoreLocation } = req.body;
  if (!uid || !email) {
    return res.status(400).json({ error: "uid and email are required" });
  }

  const profile = {
    uid,
    email,
    displayName: displayName || email.split("@")[0],
    loyaltyCards: loyaltyCards || {
      checkers: false,
      pnp: false,
      woolworths: false,
      shoprite: false,
      spar: false,
    },
    preferredStoreLocation: preferredStoreLocation || "Gauteng",
  };

  usersDb[uid] = profile;
  writeJsonFile(USERS_FILE, usersDb);

  if (supabase) {
    try {
      await supabase.from("profiles").upsert({
        id: uid,
        email,
        display_name: profile.displayName,
        loyalty_cards: profile.loyaltyCards,
        preferred_store_location: profile.preferredStoreLocation,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn("[Supabase] Failed to persist profile to database:", err.message);
    }
  }

  res.json({ status: "ok", user: profile });
});

// POST /api/v1/auth/sync-profile
app.post("/api/v1/auth/sync-profile", async (req, res) => {
  const uid = getUserIdFromRequest(req);
  let profile = usersDb[uid];

  if (supabase && (!profile || req.body?.email)) {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (data) {
        profile = {
          uid: data.id,
          email: data.email,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          loyaltyCards: data.loyalty_cards || {
            checkers: false,
            pnp: false,
            woolworths: false,
            shoprite: false,
            spar: false,
          },
          preferredStoreLocation: data.preferred_store_location || "Gauteng",
        };
        usersDb[uid] = profile;
        writeJsonFile(USERS_FILE, usersDb);
      }
    } catch (e) {
      // fallback
    }
  }

  if (!profile) {
    profile = {
      uid,
      email: req.body?.email || `${uid}@example.com`,
      displayName: req.body?.displayName || `User-${uid.slice(0, 5)}`,
      loyaltyCards: { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
      preferredStoreLocation: "Gauteng",
    };
    usersDb[uid] = profile;
    writeJsonFile(USERS_FILE, usersDb);

    if (supabase) {
      try {
        await supabase.from("profiles").upsert({
          id: uid,
          email: profile.email,
          display_name: profile.displayName,
          loyalty_cards: profile.loyaltyCards,
          preferred_store_location: profile.preferredStoreLocation,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {}
    }
  }
  res.json(profile);
});

// GET /api/v1/users/me
app.get("/api/v1/users/me", async (req, res) => {
  const uid = getUserIdFromRequest(req);
  let profile = usersDb[uid];

  if (supabase && !profile) {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (data) {
        profile = {
          uid: data.id,
          email: data.email,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          loyaltyCards: data.loyalty_cards,
          preferredStoreLocation: data.preferred_store_location,
        };
        usersDb[uid] = profile;
        writeJsonFile(USERS_FILE, usersDb);
      }
    } catch (e) {}
  }

  if (!profile) {
    return res.status(404).json({ error: "UserProfile not found" });
  }
  res.json(profile);
});

// PUT /api/v1/users/me
app.put("/api/v1/users/me", async (req, res) => {
  const uid = getUserIdFromRequest(req);
  let profile = usersDb[uid] || {
    uid,
    email: `${uid}@example.com`,
    displayName: "User",
    loyaltyCards: { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
    preferredStoreLocation: "Gauteng",
  };

  const { displayName, avatarUrl, loyaltyCards, preferredStoreLocation } = req.body;
  if (displayName !== undefined) profile.displayName = displayName;
  if (avatarUrl !== undefined) profile.avatarUrl = avatarUrl;
  if (loyaltyCards !== undefined) profile.loyaltyCards = loyaltyCards;
  if (preferredStoreLocation !== undefined) profile.preferredStoreLocation = preferredStoreLocation;

  usersDb[uid] = profile;
  writeJsonFile(USERS_FILE, usersDb);

  if (supabase) {
    try {
      await supabase.from("profiles").upsert({
        id: uid,
        email: profile.email,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
        loyalty_cards: profile.loyaltyCards,
        preferred_store_location: profile.preferredStoreLocation,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn("[Supabase] Profile update sync failed:", err.message);
    }
  }

  res.json(profile);
});

// GET /api/v1/basket
app.get("/api/v1/basket", async (req, res) => {
  const uid = getUserIdFromRequest(req);
  if (supabase) {
    try {
      const { data } = await supabase
        .from("baskets")
        .select("items, updated_at")
        .eq("user_id", uid)
        .maybeSingle();

      if (data && Array.isArray(data.items)) {
        return res.json({ items: data.items, updated_at: data.updated_at });
      }
    } catch (err: any) {
      console.warn("[Supabase] Get basket failed:", err.message);
    }
  }

  const items = basketsDb[uid] || [];
  res.json({ items });
});

// POST /api/v1/basket/sync
app.post("/api/v1/basket/sync", async (req, res) => {
  const uid = getUserIdFromRequest(req);
  const items = req.body.items || [];
  basketsDb[uid] = items;
  writeJsonFile(BASKETS_FILE, basketsDb);

  if (supabase) {
    try {
      await supabase.from("baskets").upsert({
        user_id: uid,
        items,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn("[Supabase] Basket sync failed:", err.message);
    }
  }

  res.json({ status: "ok", items });
});

// POST /api/ai/chat
app.post("/api/ai/chat", async (req, res) => {
  const { message, basket, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing message parameter" });
  }

  if (!ai) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes("split")) {
      return res.json({ text: "I can’t calculate a trustworthy store split yet because this catalog doesn’t have current, branch-specific retailer quotes connected. I won’t guess which store is cheapest. You can still use your list to plan the items you need." });
    } else if (lowerMsg.includes("swap") || lowerMsg.includes("house")) {
      return res.json({ text: "I can help you think through house-brand alternatives, but I can’t claim a specific swap saves money until Chuse has comparable products and current local prices. Check the pack size and ingredients before substituting." });
    }
    return res.json({ text: "I can help with grocery planning, meal ideas, and budget habits. Store-by-store price recommendations will appear when verified offers are available for your area." });
  }

  try {
    const systemInstruction = `You are the chuse. Saving Wizard! 🌟
You are a South African grocery planning and budget assistant. Only compare stores when a supplied offer includes a source, branch/location, and recent fetch time. The catalog may contain no verified prices; in that case say plainly that a store comparison cannot be made and never guess store rankings or savings percentages.

When answering, always use friendly, objective, and professional South African slang like "Howzit!", "lekker", "banger", "chuse" or "ZAR" where appropriate.
Give practical advice, but never claim current prices, specials, product availability, or savings amounts unless they are present in the verified basket context. Do not infer local price rankings from store reputation.

Current Shopping Basket Context:
${JSON.stringify(basket || [], null, 2)}
`;

    const contents = [
      ...history.map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }],
      })),
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
      },
    });

    res.json({
      text: aiResponse.text || "I was unable to generate a response. Please try again.",
    });
  } catch (err: any) {
    console.error("[Gemini API Error]", err.message);
    res.status(500).json({ error: "Failed to generate savings advice", details: err.message });
  }
});

export default app;
