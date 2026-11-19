<div align="center">
  <img width="1200" height="475" alt="Chuse Banner" src="public/icons/playstore.png" />
  <h1>chuse.co.za</h1>
  <p><strong>South African Multi-Supermarket Bento Price Comparison Engine & Basket Optimizer</strong></p>
</div>

---

## 🇿🇦 Overview

**Chuse** is a grocery comparison app in active development. The current bundled catalog is a UI preview; its modeled prices and specials are not live retailer quotes. Live comparison requires retailer feeds, public offers, or recent branch-level observations with source attribution. The app is being prepared to represent offers from:
- **Woolworths** (W-Rewards)
- **Checkers** (Xtra Savings)
- **Pick n Pay** (Smart Shopper)
- **Shoprite** (Xtra Savings)
- **SPAR** (SPAR Rewards)
- **Boxer Superstores**
- **Food Lover's Market**

### Key Features
- 🛒 **Basket Split Optimizer**: Compares eligible offers when fresh, branch-specific retailer data is connected.
- ⚡ **Interactive Specials & Deals**: Promotion experience; real promotions require a dated retailer source.
- 🤖 **AI Savings Wizard**: South African budget assistant powered by Google Gemini.
- 📷 **Barcode Scanner**: Scan store items in real time to instantly see which nearby competitor has it cheaper.
- 🔐 **Supabase Authentication & Database**: User profiles, saved shopping lists, loyalty card preferences, and cloud sync.
- 📱 **Cross-Platform Mobile**: Native Android and iOS support via Capacitor.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20/v26)
- **npm** or **pnpm**
- **Python 3** (optional, only for the existing Python backend and legacy scraper commands)

### 2. Install Dependencies
```bash
npm install
```

### 3. Supabase Setup
Chuse is powered by **Supabase** for user authentication and PostgreSQL storage.

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase Dashboard, go to **SQL Editor** and run [`supabase_schema.sql`](./supabase_schema.sql), then [`20261119_001_retail_catalog.sql`](./supabase/migrations/20261119_001_retail_catalog.sql).
3. Copy your project credentials:
   - Go to **Project Settings** > **API**.
   - Copy **Project URL** and **anon/public Key**.
4. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
5. Fill in your Supabase variables in `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### 4. (Optional) Seed the Supabase Database
This imports product metadata from the bundled catalog. Legacy modeled prices are deliberately skipped and are not retailer quotes:
```bash
npm run seed:supabase
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The app runs with full hot-reloading (Vite + Express).

---

## 🛠 Project Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Starts the Express server with Vite middleware on port 3000 |
| **Python Backend** | `npm run backend` | Starts the FastAPI high-performance backend on port 8000 |
| **Scraper (Demo)** | `npm run scraper` | Creates a local demo catalog; does not sync demo prices to Supabase |
| **Product Metadata** | `npm run scraper:live` | Fetches product identity metadata from Open Food Facts; it provides no supermarket prices |
| **Open Prices Snapshot** | `npm run open-prices:snapshot` | Downloads recent community ZAR observations to a local review file; it does not publish them |
| **Verified Product Images** | `npm run open-food-facts:images` | Looks up exact catalog barcodes at a respectful rate and builds an attributed product image/identity map; it does not change prices |
| **Supabase Setup** | `npm run supabase:setup` | Imports local product metadata; does not create sourced retailer offers |
| **Type Check** | `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| **Production Build** | `npm run build` | Compiles Vite frontend & bundles Node server into `dist/` |
| **Start Production** | `npm run start` | Runs the bundled production server (`dist/server.cjs`) |

---

## Retailer data and price trust

Chuse does not currently have official price feeds or credentials for the seven listed retailers. The product catalog and old database price rows are therefore treated as previews, not live prices. The `retailer_offers` migration provides branch, source, fetch time, loyalty price, validity dates, and observation history fields. Applying the migration alone does not populate those tables. See [the retailer data roadmap](./docs/retailer-data-roadmap.md) before connecting a source.

---

## 📱 Mobile App (Capacitor)

To sync and run on mobile:
```bash
# Build the web assets first
npm run build

# Sync with native Android / iOS projects
npx cap sync

# Open in Android Studio
npx cap open android

# Open in Xcode (macOS only)
npx cap open ios
```

---

## 📄 License
MIT License. © Chuse - A product of 12 Links.
