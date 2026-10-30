import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const { Client } = pg;

async function run() {
  console.log('====================================================');
  console.log('       CHUSE SUPABASE AUTOMATED TERMINAL SETUP      ');
  console.log('====================================================\n');

  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  // 1. Run SQL Schema if DATABASE_URL is present
  if (dbUrl && !dbUrl.includes('placeholder')) {
    console.log('🔄 Connecting to Supabase PostgreSQL database...');
    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('✓ Connected to PostgreSQL.');

      const schemaPath = path.join(process.cwd(), 'supabase_schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf-8');

      console.log('📄 Executing supabase_schema.sql to build tables and triggers...');
      await client.query(sql);
      console.log('✓ Schema applied successfully (profiles, stores, products, prices, baskets, shopping_lists).\n');
    } catch (err) {
      console.error('[!] Warning: Could not run schema directly via DATABASE_URL:', err.message);
      console.log('    (You can also paste supabase_schema.sql in the Supabase Dashboard SQL Editor)\n');
    } finally {
      await client.end().catch(() => {});
    }
  } else {
    console.log('ℹ️  No direct DATABASE_URL provided. If you haven\'t run supabase_schema.sql yet,');
    console.log('    paste it into the Supabase Dashboard -> SQL Editor.\n');
  }

  // 2. Sync Products and Prices
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder-project')) {
    console.error('[!] Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in your .env file.');
    console.error('    Please configure them first, then run this command again.\n');
    process.exit(1);
  }

  console.log('📦 Connecting to Supabase API and syncing retail catalog...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const productsPath = path.join(process.cwd(), 'synced_products.json');
  if (!fs.existsSync(productsPath)) {
    console.error(`[!] Error: ${productsPath} not found.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(productsPath, 'utf-8');
  const products = JSON.parse(raw);
  console.log(`Found ${products.length} catalog items to sync.`);

  // Upsert products
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
    console.error('[!] Product sync error:', prodErr.message);
  } else {
    console.log(`✓ Synced ${productsToUpsert.length} products to public.products.`);
  }

  // Upsert prices
  const pricesToUpsert = [];
  for (const p of products) {
    if (Array.isArray(p.prices)) {
      for (const pr of p.prices) {
        if (pr.storeId && pr.price != null) {
          pricesToUpsert.push({
            product_id: p.id,
            store_id: pr.storeId,
            price: pr.price,
            on_special: Boolean(pr.onSpecial),
            special_detail: pr.specialDetail || '',
            last_updated: new Date().toISOString(),
          });
        }
      }
    }
  }

  if (pricesToUpsert.length > 0) {
    const { error: priceErr } = await supabase.from('prices').upsert(pricesToUpsert, { onConflict: 'product_id,store_id' });
    if (priceErr) {
      console.error('[!] Price sync error:', priceErr.message);
    } else {
      console.log(`✓ Synced ${pricesToUpsert.length} price points across stores to public.prices.`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 Setup complete! All data is synced with Supabase.');
  console.log('Run `npm run dev` to launch the app.');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('[!] Setup failed:', err);
  process.exit(1);
});
