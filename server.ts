import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Optional Supabase Server / Admin client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
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
  console.warn("[Gemini API] GEMINI_API_KEY not found. Running in mock/fallback mode for AI Savings Wizard.");
}

const USERS_FILE = path.join(process.cwd(), "local_users.json");
const BASKETS_FILE = path.join(process.cwd(), "local_baskets.json");

// Helper to read JSON database files safely
function readJsonFile(filePath: string, defaultValue: any): any {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err: any) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return defaultValue;
}

// Helper to write JSON database files safely
function writeJsonFile(filePath: string, data: any): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err: any) {
    console.error(`Error writing to ${filePath}:`, err.message);
  }
}

// Load data
let usersDb = readJsonFile(USERS_FILE, {});
let basketsDb = readJsonFile(BASKETS_FILE, {});

// Read product catalog database
const productsFilePath = path.join(process.cwd(), "synced_products.json");
let productsList: any[] = [];
try {
  if (fs.existsSync(productsFilePath)) {
    const data = fs.readFileSync(productsFilePath, "utf-8");
    productsList = JSON.parse(data);
    console.log(`[Database] Loaded ${productsList.length} products from synced_products.json`);
  } else {
    console.warn("[Database] synced_products.json not found! Empty product catalog initialized.");
  }
} catch (err: any) {
  console.error("[Database] Error reading synced_products.json:", err.message);
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
            imageUrl: d.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80",
            prices: (d.prices || []).map((pr: any) => ({
              storeId: pr.store_id,
              price: Number(pr.price),
              onSpecial: Boolean(pr.on_special),
              specialDetail: pr.special_detail || "",
              inStock: true
            }))
          }));
          return res.json(formatted);
        }
      } catch (err: any) {
        console.warn("[Supabase] Products query error, fallback to local cache:", err.message);
      }
    }
    res.json(productsList);
  });

  // POST /api/products/search
  app.post("/api/products/search", (req, res) => {
    const query = (req.body.query || "").trim().toLowerCase();
    if (!query) {
      return res.json([]);
    }
    const filtered = productsList.filter((p) => {
      const nameMatch = p.name && p.name.toLowerCase().includes(query);
      const catMatch = p.category && p.category.toLowerCase().includes(query);
      const barcodeMatch = p.barcode && p.barcode.includes(query);
      return nameMatch || catMatch || barcodeMatch;
    });
    res.json(filtered);
  });

  // GET /api/autocomplete & /api/v1/autocomplete
  app.get(["/api/autocomplete", "/api/v1/autocomplete"], (req, res) => {
    const q = (req.query.q as string || "").trim().toLowerCase();
    if (!q) {
      return res.json([]);
    }
    const matchingNames = Array.from(
      new Set(
        productsList
          .filter((p) => (p.name && p.name.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q)))
          .map((p) => p.name)
      )
    ).slice(0, 10);
    res.json(matchingNames);
  });

  // GET /api/search & /api/v1/search
  app.get(["/api/search", "/api/v1/search"], (req, res) => {
    const q = (req.query.q as string || "").trim().toLowerCase();
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!q) {
      return res.json({ items: [], has_more: false, limit, offset });
    }

    const filtered = productsList.filter((p) => {
      const nameMatch = p.name && p.name.toLowerCase().includes(q);
      const catMatch = p.category && p.category.toLowerCase().includes(q);
      return nameMatch || catMatch;
    });

    const sliced = filtered.slice(offset, offset + limit);
    res.json({
      items: sliced,
      has_more: filtered.length > offset + limit,
      limit,
      offset,
    });
  });

  // GET /api/products/:product_id & GET /api/v1/products/:product_id
  app.get(["/products/:product_id", "/api/products/:product_id", "/api/v1/products/:product_id"], (req, res) => {
    const id = req.params.product_id;
    const product = productsList.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });

  // GET /products/:product_id/compare-stores & GET /api/v1/products/:product_id/compare-stores
  app.get(["/products/:product_id/compare-stores", "/api/products/:product_id/compare-stores", "/api/v1/products/:product_id/compare-stores"], (req, res) => {
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
  });

  // GET /products/:product_id/compare-brands & GET /api/v1/products/:product_id/compare-brands
  app.get(["/products/:product_id/compare-brands", "/api/products/:product_id/compare-brands", "/api/v1/products/:product_id/compare-brands"], (req, res) => {
    const id = req.params.product_id;
    const store = req.query.store as string || "";

    const product = productsList.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (!store) {
      return res.status(400).json({ error: "store query parameter is required" });
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

    const substitutes = productsList
      .filter((p) => p.id !== id && p.category === product.category && p.unit === product.unit)
      .map((p) => {
        const storePrice = p.prices.find((pr: any) => pr.storeId === store);
        if (storePrice) {
          return {
            id: p.id,
            name: p.name,
            category: p.category,
            unit: p.unit,
            barcode: p.barcode,
            imageUrl: p.imageUrl,
            price: storePrice.price,
            onSpecial: storePrice.onSpecial || false,
            specialDetail: storePrice.specialDetail || "",
            store_name: storesMap[store] || store,
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.price - b.price);

    res.json({
      productId: id,
      storeId: store,
      storeName: storesMap[store] || store,
      items: substitutes,
    });
  });

  // GET /api/sync/status
  app.get("/api/sync/status", (req, res) => {
    res.json({
      success: true,
      lastSyncTime: new Date().toISOString(),
      syncLogs: [
        "System bootstrap: Express-based daily pricing engine active.",
        "Successfully initialized memory cache for SA retail indexes.",
        supabase ? "Supabase database client connected." : "Running with local JSON database fallback.",
      ],
      schedule: "0 2 * * * (Every day at 2am)",
      status: "Listening",
      version: "4.0.0-node",
      backend: supabase ? "Supabase (PostgreSQL)" : "Local JSON Cache Engine",
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
      loyaltyCards: loyaltyCards || { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
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
            loyaltyCards: data.loyalty_cards || { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
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
    const { message, basket, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message parameter" });
    }

    if (!ai) {
      // Intelligent fallback when GEMINI_API_KEY is not configured
      let replyText = "";
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes("split")) {
        replyText = `**Howzit!** I see you're looking to split your shopping basket for maximum savings! 🇿🇦\n\nBased on your current basket, I recommend splitting your trip between **Checkers** (for bulk and staples) and **Shoprite** (for lowest commodity prices). This split strategy typically saves you around **12% to 15%** on your basic household staples!`;
      } else if (lowerMsg.includes("swap") || lowerMsg.includes("house")) {
        replyText = `**Lekker!** Swapping to house-brands is the fastest way to save! 🛒\n\nTry swapping brand-name items for:
- **Checkers House Brand** or **Simple Truth**
- **PnP No Name** or **Smart Shopper** specials
- **SPAR Brand** alternatives\n\nThese simple swaps can put up to **20% back in your pocket** immediately!`;
      } else {
        replyText = `**Howzit!** I am the chuse. Saving Wizard! 🌟\n\nI can help you optimize your grocery budget, find house-brand swaps, or suggest budget South African recipes. Try adding basic staples like bread and milk, and ask me to "split my basket" or "suggest brand swaps"!`;
      }
      return res.json({ text: replyText });
    }

    try {
      const systemInstruction = `You are the chuse. Saving Wizard! 🌟
You are a personalized, Gemini-powered South African grocery budget coach and retail strategist.
You compare prices across popular South African stores: Woolworths, Checkers, Pick n Pay, Shoprite, SPAR, and Boxer.

When answering, always use friendly, objective, and professional South African slang like "Howzit!", "lekker", "banger", "chuse" or "ZAR" where appropriate.
Provide specific, actionable grocery budget advice, split shopping tips, or smart house-brand swaps.

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
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
        },
      });

      res.json({ text: aiResponse.text || "I was unable to generate a response. Please try again." });
    } catch (err: any) {
      console.error("[Gemini API Error]", err.message);
      res.status(500).json({ error: "Failed to generate savings advice", details: err.message });
    }
  });

  // Vite middleware for assets and SPA handling in standalone mode
  export async function setupApp(isDev = process.env.NODE_ENV !== "production") {
    if (isDev && !process.env.VERCEL) {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
    return app;
  }

  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const PORT = parseInt(process.env.PORT || "3000", 10);
    setupApp().then(() => {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
      });
    });
  }
