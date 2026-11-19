import fs from 'node:fs/promises';
import path from 'node:path';

const API_URL = 'https://prices.openfoodfacts.org/api/v1/prices';
const USER_AGENT = 'ChuseSA/1.0.0 (https://chuse.co.za; contact: info@chuse.co.za)';
const STORE_ALIASES = {
  checkers: ['checkers', 'sixty60'],
  woolworths: ['woolworths'],
  pnp: ['pick n pay', "pick 'n pay", 'pick and pay'],
  shoprite: ['shoprite'],
  spar: ['spar'],
  boxer: ['boxer'],
  foodlovers: ['food lover', 'foodlovers'],
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function inferStore(location) {
  const searchable = [location.osm_brand, location.osm_name, location.osm_display_name, location.website_url]
    .filter(Boolean).join(' ').toLowerCase();
  const matches = Object.entries(STORE_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => searchable.includes(alias)))
    .map(([storeId]) => storeId);
  return matches.length === 1 ? matches[0] : null;
}

function normalize(row, fetchedAt) {
  const location = row.location || {};
  const product = row.product || {};
  const proof = row.proof || {};
  if (String(location.osm_address_country_code || '').toLowerCase() !== 'za' || row.currency !== 'ZAR') return null;
  const price = Number(row.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    source: 'Open Prices (community observation)',
    sourceUrl: `https://prices.openfoodfacts.org/api/v1/prices/${row.id}`,
    fetchedAt,
    observedOn: row.date || null,
    price,
    regularPrice: row.price_without_discount == null ? null : Number(row.price_without_discount),
    isDiscounted: Boolean(row.price_is_discounted),
    currency: 'ZAR',
    barcode: row.product_code || product.code || null,
    productName: row.product_name || product.product_name || null,
    productQuantity: product.quantity || null,
    productImageUrl: product.image_url || null,
    storeIdCandidate: inferStore(location),
    location: {
      id: location.id || null,
      name: location.osm_name || location.osm_display_name || null,
      brand: location.osm_brand || null,
      address: location.osm_display_name || null,
      suburb: location.osm_address_city || null,
      postalCode: location.osm_address_postcode || null,
      latitude: location.osm_lat ?? null,
      longitude: location.osm_lon ?? null,
    },
    proof: {
      id: proof.id || null,
      type: proof.type || null,
      date: proof.date || null,
      url: proof.file_path || null,
    },
    matchStatus: 'needs_review',
  };
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name, fallback) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : fallback;
  };
  const days = Number(arg('--days', '30'));
  const maxPages = Number(arg('--max-pages', '10'));
  const outputPath = path.resolve(arg('--output', 'open_prices_snapshot.json'));
  if (!Number.isInteger(days) || days < 1 || !Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error('--days and --max-pages must be positive integers.');
  }
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();
  const observations = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(API_URL);
    Object.entries({ currency: 'ZAR', date__gte: since, order_by: '-date', size: '100', page: String(page) })
      .forEach(([key, value]) => url.searchParams.set(key, value));
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Open Prices returned HTTP ${response.status} on page ${page}.`);
    const payload = await response.json();
    const rows = payload.items || [];
    observations.push(...rows.map((row) => normalize(row, fetchedAt)).filter(Boolean));
    const totalPages = Number(payload.pages || page);
    process.stdout.write(`Fetched page ${page}/${Math.min(totalPages, maxPages)} (${rows.length} rows)\n`);
    if (rows.length === 0 || page >= totalPages || page >= maxPages) break;
    await sleep(1000);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({
    source: 'Open Prices',
    license: 'ODbL; attribution and share-alike obligations apply',
    fetchedAt,
    observations,
  }, null, 2), 'utf8');
  process.stdout.write(`Saved ${observations.length} South African ZAR observations for review: ${outputPath}\n`);
  process.stdout.write('These community observations are not retailer-confirmed offers and were not synced into Chuse.\n');
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
