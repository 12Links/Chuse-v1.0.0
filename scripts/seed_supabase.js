import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder-project')) {
  console.error('[!] Error: Supabase credentials not found in environment.');
  console.error('    Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🚀 Seeding Supabase database with South African retail catalog...');

  const productsPath = path.join(process.cwd(), 'synced_products.json');
  if (!fs.existsSync(productsPath)) {
    console.error(`[!] Error: ${productsPath} not found.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(productsPath, 'utf-8');
  const products = JSON.parse(raw);

  console.log(`Found ${products.length} products to seed.`);

  // 1. Upsert Products
  const productsToUpsert = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category || 'Groceries',
    unit: p.unit || '1 Unit',
    barcode: p.barcode || null,
    image_url: p.imageUrl || null,
    is_popular: Boolean(p.isPopular),
  }));

  const { error: prodErr } = await supabase.from('products').upsert(productsToUpsert, { onConflict: 'id' });
  if (prodErr) {
    console.error('[!] Failed to upsert products:', prodErr.message);
  } else {
    console.log(`✓ Successfully seeded ${productsToUpsert.length} products into public.products table.`);
  }

  // Price rows in the bundled legacy catalog are modeled demo values. Do not
  // write them as retailer quotes; sourced offers use retailer_offers ingestion.
  console.log('ℹ Skipped legacy price rows: this file contains demo/modelled prices, not sourced retailer offers.');

  console.log('🎉 Supabase database seeding complete!');
}

seed().catch((err) => {
  console.error('[!] Seeding failed:', err);
  process.exit(1);
});
