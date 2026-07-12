var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
import_dotenv.default.config();
var ai = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    console.log("[Gemini API] Client initialized successfully.");
  } catch (err) {
    console.error("[Gemini API] Failed to initialize client:", err.message);
  }
} else {
  console.warn("[Gemini API] GEMINI_API_KEY not found. Running in mock/fallback mode for AI Savings Wizard.");
}
var USERS_FILE = import_path.default.join(process.cwd(), "local_users.json");
var BASKETS_FILE = import_path.default.join(process.cwd(), "local_baskets.json");
function readJsonFile(filePath, defaultValue) {
  try {
    if (import_fs.default.existsSync(filePath)) {
      const data = import_fs.default.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return defaultValue;
}
function writeJsonFile(filePath, data) {
  try {
    import_fs.default.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err.message);
  }
}
var usersDb = readJsonFile(USERS_FILE, {});
var basketsDb = readJsonFile(BASKETS_FILE, {});
var productsFilePath = import_path.default.join(process.cwd(), "synced_products.json");
var productsList = [];
try {
  if (import_fs.default.existsSync(productsFilePath)) {
    const data = import_fs.default.readFileSync(productsFilePath, "utf-8");
    productsList = JSON.parse(data);
    console.log(`[Database] Loaded ${productsList.length} products from synced_products.json`);
  } else {
    console.warn("[Database] synced_products.json not found! Empty product catalog initialized.");
  }
} catch (err) {
  console.error("[Database] Error reading synced_products.json:", err.message);
}
function getUserIdFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        return payload.user_id || payload.uid || payload.sub || "mock-user-123";
      }
    } catch (e) {
      console.warn("[Auth] Token parsing failed, using fallback mock ID.");
    }
  }
  return "mock-user-123";
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/products", (req, res) => {
    res.json(productsList);
  });
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
  app.get(["/api/autocomplete", "/api/v1/autocomplete"], (req, res) => {
    const q = (req.query.q || "").trim().toLowerCase();
    if (!q) {
      return res.json([]);
    }
    const matchingNames = Array.from(
      new Set(
        productsList.filter((p) => p.name && p.name.toLowerCase().includes(q) || p.category && p.category.toLowerCase().includes(q)).map((p) => p.name)
      )
    ).slice(0, 10);
    res.json(matchingNames);
  });
  app.get(["/api/search", "/api/v1/search"], (req, res) => {
    const q = (req.query.q || "").trim().toLowerCase();
    const limit = parseInt(req.query.limit) || 12;
    const offset = parseInt(req.query.offset) || 0;
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
      offset
    });
  });
  app.get(["/products/:product_id", "/api/products/:product_id", "/api/v1/products/:product_id"], (req, res) => {
    const id = req.params.product_id;
    const product = productsList.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });
  app.get(["/products/:product_id/compare-stores", "/api/products/:product_id/compare-stores", "/api/v1/products/:product_id/compare-stores"], (req, res) => {
    const id = req.params.product_id;
    const product = productsList.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const storesMap = {
      woolworths: "Woolworths",
      checkers: "Checkers",
      pnp: "Pick n Pay",
      shoprite: "Shoprite",
      foodlovers: "Food Lover's Market",
      boxer: "Boxer Superstores",
      spar: "SPAR"
    };
    const compared = (product.prices || []).map((priceInfo) => ({
      storeId: priceInfo.storeId,
      storeName: storesMap[priceInfo.storeId] || priceInfo.storeId,
      price: priceInfo.price,
      onSpecial: priceInfo.onSpecial || false,
      specialDetail: priceInfo.specialDetail || "",
      lastUpdated: priceInfo.lastUpdated || (/* @__PURE__ */ new Date()).toISOString()
    })).sort((a, b) => a.price - b.price);
    res.json({
      productId: id,
      barcode: product.barcode || "",
      stores: compared
    });
  });
  app.get(["/products/:product_id/compare-brands", "/api/products/:product_id/compare-brands", "/api/v1/products/:product_id/compare-brands"], (req, res) => {
    const id = req.params.product_id;
    const store = req.query.store || "";
    const product = productsList.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (!store) {
      return res.status(400).json({ error: "store query parameter is required" });
    }
    const storesMap = {
      woolworths: "Woolworths",
      checkers: "Checkers",
      pnp: "Pick n Pay",
      shoprite: "Shoprite",
      foodlovers: "Food Lover's Market",
      boxer: "Boxer Superstores",
      spar: "SPAR"
    };
    const substitutes = productsList.filter((p) => p.id !== id && p.category === product.category && p.unit === product.unit).map((p) => {
      const storePrice = p.prices.find((pr) => pr.storeId === store);
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
          store_name: storesMap[store] || store
        };
      }
      return null;
    }).filter(Boolean).sort((a, b) => a.price - b.price);
    res.json({
      productId: id,
      storeId: store,
      storeName: storesMap[store] || store,
      items: substitutes
    });
  });
  app.get("/api/sync/status", (req, res) => {
    res.json({
      success: true,
      lastSyncTime: (/* @__PURE__ */ new Date()).toISOString(),
      syncLogs: [
        "System bootstrap: Express-based daily pricing engine active.",
        "Successfully initialized memory cache for SA retail indexes."
      ],
      schedule: "0 2 * * * (Every day at 2am)",
      status: "Listening",
      version: "4.0.0-node"
    });
  });
  app.post("/api/v1/auth/register", (req, res) => {
    const { uid, email, displayName, loyaltyCards, preferredStoreLocation } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: "uid and email are required" });
    }
    const profile = {
      uid,
      email,
      displayName: displayName || email.split("@")[0],
      loyaltyCards: loyaltyCards || { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
      preferredStoreLocation: preferredStoreLocation || "Gauteng"
    };
    usersDb[uid] = profile;
    writeJsonFile(USERS_FILE, usersDb);
    res.json({ status: "ok", user: profile });
  });
  app.post("/api/v1/auth/sync-profile", (req, res) => {
    const uid = getUserIdFromRequest(req);
    let profile = usersDb[uid];
    if (!profile) {
      profile = {
        uid,
        email: `${uid}@example.com`,
        displayName: `User-${uid.slice(0, 5)}`,
        loyaltyCards: { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
        preferredStoreLocation: "Gauteng"
      };
      usersDb[uid] = profile;
      writeJsonFile(USERS_FILE, usersDb);
    }
    res.json(profile);
  });
  app.get("/api/v1/users/me", (req, res) => {
    const uid = getUserIdFromRequest(req);
    const profile = usersDb[uid];
    if (!profile) {
      return res.status(404).json({ error: "UserProfile not found" });
    }
    res.json(profile);
  });
  app.put("/api/v1/users/me", (req, res) => {
    const uid = getUserIdFromRequest(req);
    let profile = usersDb[uid] || {
      uid,
      email: `${uid}@example.com`,
      displayName: "User",
      loyaltyCards: { checkers: false, pnp: false, woolworths: false, shoprite: false, spar: false },
      preferredStoreLocation: "Gauteng"
    };
    const { displayName, avatarUrl, loyaltyCards, preferredStoreLocation } = req.body;
    if (displayName !== void 0) profile.displayName = displayName;
    if (avatarUrl !== void 0) profile.avatarUrl = avatarUrl;
    if (loyaltyCards !== void 0) profile.loyaltyCards = loyaltyCards;
    if (preferredStoreLocation !== void 0) profile.preferredStoreLocation = preferredStoreLocation;
    usersDb[uid] = profile;
    writeJsonFile(USERS_FILE, usersDb);
    res.json(profile);
  });
  app.post("/api/v1/basket/sync", (req, res) => {
    const uid = getUserIdFromRequest(req);
    const items = req.body.items || [];
    basketsDb[uid] = items;
    writeJsonFile(BASKETS_FILE, basketsDb);
    res.json({ status: "ok", items });
  });
  app.post("/api/ai/chat", async (req, res) => {
    const { message, basket, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Missing message parameter" });
    }
    if (!ai) {
      let replyText = "";
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes("split")) {
        replyText = `**Howzit!** I see you're looking to split your shopping basket for maximum savings! \u{1F1FF}\u{1F1E6}

Based on your current basket, I recommend splitting your trip between **Checkers** (for bulk and staples) and **Shoprite** (for lowest commodity prices). This split strategy typically saves you around **12% to 15%** on your basic household staples!`;
      } else if (lowerMsg.includes("swap") || lowerMsg.includes("house")) {
        replyText = `**Lekker!** Swapping to house-brands is the fastest way to save! \u{1F6D2}

Try swapping brand-name items for:
- **Checkers House Brand** or **Simple Truth**
- **PnP No Name** or **Smart Shopper** specials
- **SPAR Brand** alternatives

These simple swaps can put up to **20% back in your pocket** immediately!`;
      } else {
        replyText = `**Howzit!** I am the chuse. Saving Wizard! \u{1F31F}

I can help you optimize your grocery budget, find house-brand swaps, or suggest budget South African recipes. Try adding basic staples like bread and milk, and ask me to "split my basket" or "suggest brand swaps"!`;
      }
      return res.json({ text: replyText });
    }
    try {
      const systemInstruction = `You are the chuse. Saving Wizard! \u{1F31F}
You are a personalized, Gemini-powered South African grocery budget coach and retail strategist.
You compare prices across popular South African stores: Woolworths, Checkers, Pick n Pay, Shoprite, SPAR, and Boxer.

When answering, always use friendly, objective, and professional South African slang like "Howzit!", "lekker", "banger", "chuse" or "ZAR" where appropriate.
Provide specific, actionable grocery budget advice, split shopping tips, or smart house-brand swaps.

Current Shopping Basket Context:
${JSON.stringify(basket || [], null, 2)}
`;
      const contents = [
        ...history.map((h) => ({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        })),
        {
          role: "user",
          parts: [{ text: message }]
        }
      ];
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction
        }
      });
      res.json({ text: aiResponse.text || "I was unable to generate a response. Please try again." });
    } catch (err) {
      console.error("[Gemini API Error]", err.message);
      res.status(500).json({ error: "Failed to generate savings advice", details: err.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
