-- Chuse catalog v2: retailer SKUs, physical/online locations, current offers,
-- structured promotions, and observations for real price history.
-- Apply only after reviewing the selected data provider's storage/display terms.

CREATE TABLE IF NOT EXISTS public.retailer_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  external_location_id TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'branch',
  name TEXT NOT NULL,
  province TEXT,
  city TEXT,
  suburb TEXT,
  postal_code TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  fulfillment_modes JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (retailer_id, external_location_id)
);

CREATE TABLE IF NOT EXISTS public.retailer_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  retailer_sku TEXT NOT NULL,
  canonical_product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  brand TEXT,
  pack_size TEXT,
  variant TEXT,
  image_url TEXT,
  product_url TEXT,
  match_method TEXT NOT NULL DEFAULT 'unmatched',
  match_confidence NUMERIC(4,3),
  source_last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (retailer_id, retailer_sku),
  CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 1))
);

CREATE INDEX IF NOT EXISTS idx_retailer_products_barcode ON public.retailer_products(barcode);
CREATE INDEX IF NOT EXISTS idx_retailer_products_canonical ON public.retailer_products(canonical_product_id);

CREATE TABLE IF NOT EXISTS public.retailer_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_product_id UUID NOT NULL REFERENCES public.retailer_products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.retailer_locations(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_url TEXT,
  currency CHAR(3) NOT NULL DEFAULT 'ZAR',
  regular_price NUMERIC(10,2),
  current_price NUMERIC(10,2) NOT NULL CHECK (current_price >= 0),
  loyalty_price NUMERIC(10,2) CHECK (loyalty_price IS NULL OR loyalty_price >= 0),
  loyalty_program TEXT,
  in_stock BOOLEAN,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL,
  source_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (retailer_product_id, location_id),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_retailer_offers_location ON public.retailer_offers(location_id, is_active);
CREATE INDEX IF NOT EXISTS idx_retailer_offers_freshness ON public.retailer_offers(fetched_at DESC);

CREATE TABLE IF NOT EXISTS public.retailer_promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.retailer_locations(id) ON DELETE CASCADE,
  external_promotion_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  promotion_type TEXT NOT NULL,
  reward_value NUMERIC(10,2),
  currency CHAR(3) NOT NULL DEFAULT 'ZAR',
  loyalty_program TEXT,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL,
  source_url TEXT,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_retailer_promotions_active_dates
  ON public.retailer_promotions(is_active, valid_from, valid_until);

CREATE TABLE IF NOT EXISTS public.retailer_promotion_products (
  promotion_id UUID NOT NULL REFERENCES public.retailer_promotions(id) ON DELETE CASCADE,
  retailer_product_id UUID NOT NULL REFERENCES public.retailer_products(id) ON DELETE CASCADE,
  product_role TEXT NOT NULL DEFAULT 'qualifier',
  required_quantity INTEGER NOT NULL DEFAULT 1 CHECK (required_quantity > 0),
  PRIMARY KEY (promotion_id, retailer_product_id, product_role)
);

CREATE TABLE IF NOT EXISTS public.retailer_offer_history (
  id BIGSERIAL PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.retailer_offers(id) ON DELETE CASCADE,
  regular_price NUMERIC(10,2),
  current_price NUMERIC(10,2) NOT NULL CHECK (current_price >= 0),
  loyalty_price NUMERIC(10,2),
  in_stock BOOLEAN,
  source TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  UNIQUE (offer_id, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_retailer_offer_history_offer_time
  ON public.retailer_offer_history(offer_id, observed_at DESC);

ALTER TABLE public.retailer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_offer_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Retailer locations are readable by everyone" ON public.retailer_locations;
CREATE POLICY "Retailer locations are readable by everyone" ON public.retailer_locations
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Retailer products are readable by everyone" ON public.retailer_products;
CREATE POLICY "Retailer products are readable by everyone" ON public.retailer_products
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Retailer offers are readable by everyone" ON public.retailer_offers;
CREATE POLICY "Retailer offers are readable by everyone" ON public.retailer_offers
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Retailer promotions are readable by everyone" ON public.retailer_promotions;
CREATE POLICY "Retailer promotions are readable by everyone" ON public.retailer_promotions
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Promotion products are readable by everyone" ON public.retailer_promotion_products;
CREATE POLICY "Promotion products are readable by everyone" ON public.retailer_promotion_products
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Retailer offer history is readable by everyone" ON public.retailer_offer_history;
CREATE POLICY "Retailer offer history is readable by everyone" ON public.retailer_offer_history
  FOR SELECT USING (true);

-- No public INSERT/UPDATE/DELETE policies are created. Ingestion should run on
-- a trusted server with the service-role key; never ship that key to the client.
