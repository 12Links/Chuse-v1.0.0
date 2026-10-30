-- ==============================================================================
-- CHUSE - SUPABASE POSTGRESQL SCHEMA & MIGRATION
-- South African Multi-Supermarket Bento Price Comparison Engine
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  loyalty_cards JSONB DEFAULT '{"checkers": false, "pnp": false, "woolworths": false, "shoprite": false, "spar": false}'::jsonb,
  preferred_store_location TEXT DEFAULT 'Gauteng',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to automatically create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, preferred_store_location)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'displayName', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/pixel-art/svg?seed=' || encode(NEW.email::bytea, 'hex')),
    COALESCE(NEW.raw_user_meta_data->>'province', 'Gauteng')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. STORES TABLE
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  premium_multiplier NUMERIC(4,2) DEFAULT 1.00,
  loyalty_program TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stores are readable by everyone" ON public.stores FOR SELECT USING (true);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT,
  barcode TEXT,
  image_url TEXT,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are readable by everyone" ON public.products FOR SELECT USING (true);

-- 5. PRICES TABLE (Current Prices by Store)
CREATE TABLE IF NOT EXISTS public.prices (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  on_special BOOLEAN DEFAULT false,
  special_detail TEXT DEFAULT '',
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_prices_product_id ON public.prices(product_id);
CREATE INDEX IF NOT EXISTS idx_prices_store_id ON public.prices(store_id);

ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prices are readable by everyone" ON public.prices FOR SELECT USING (true);

-- 6. PRICE HISTORY TABLE (Historical tracking for analytics)
CREATE TABLE IF NOT EXISTS public.price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_product ON public.price_history(product_id);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Price history is readable by everyone" ON public.price_history FOR SELECT USING (true);

-- 7. USER BASKETS TABLE
CREATE TABLE IF NOT EXISTS public.baskets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.baskets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own basket"
  ON public.baskets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own basket"
  ON public.baskets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. SHOPPING LISTS TABLE
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their shopping lists"
  ON public.shopping_lists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. PRICE DISCREPANCY REPORTS
CREATE TABLE IF NOT EXISTS public.price_discrepancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  store_id TEXT NOT NULL,
  reported_price NUMERIC(10,2) NOT NULL,
  shelf_photo_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.price_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can report a discrepancy"
  ON public.price_discrepancies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their reports"
  ON public.price_discrepancies FOR SELECT
  USING (auth.uid() = user_id);

-- 10. SEED STORES
INSERT INTO public.stores (id, name, premium_multiplier, loyalty_program) VALUES
  ('woolworths', 'Woolworths', 1.15, 'W-Rewards'),
  ('checkers', 'Checkers', 1.00, 'Xtra Savings'),
  ('pnp', 'Pick n Pay', 1.02, 'Smart Shopper'),
  ('shoprite', 'Shoprite', 0.94, 'Xtra Savings'),
  ('spar', 'SPAR', 1.01, 'SPAR Rewards'),
  ('foodlovers', 'Food Lover''s Market', 0.96, 'None'),
  ('boxer', 'Boxer Superstores', 0.92, 'None')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  premium_multiplier = EXCLUDED.premium_multiplier,
  loyalty_program = EXCLUDED.loyalty_program;
