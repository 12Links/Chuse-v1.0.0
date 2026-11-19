import fs from 'node:fs/promises';
import path from 'node:path';

const API_ROOT = 'https://world.openfoodfacts.org/api/v3/product/';
const USER_AGENT = 'ChuseSA/1.0.0 (https://chuse.co.za; contact: info@chuse.co.za)';
const FIELDS = 'code,product_name,product_name_en,quantity,image_front_url,image_front_thumb_url';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchBarcode(barcode) {
  const url = `${API_ROOT}${encodeURIComponent(barcode)}?fields=${encodeURIComponent(FIELDS)}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (response.status === 404) return null;
  if (response.status === 429) throw new Error('Open Food Facts rate limit reached; wait before rerunning.');
  if (!response.ok) throw new Error(`Open Food Facts returned HTTP ${response.status}`);
  const payload = await response.json();
  const product = payload.product || {};
  if (payload.status !== 1 || String(product.code || '') !== String(barcode)) return null;
  const imageUrl = product.image_front_url || product.image_front_thumb_url;
  if (!imageUrl?.startsWith('https://')) return null;
  return {
    barcode: String(barcode),
    name: product.product_name_en || product.product_name || null,
    quantity: product.quantity || null,
    imageUrl,
    source: 'Open Food Facts',
    sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`,
    license: 'Open Food Facts; image attribution and CC BY-SA terms apply',
  };
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name, fallback) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : fallback;
  };
  const inputPath = path.resolve(arg('--input', 'src/data/initialProducts.json'));
  const outputPath = path.resolve(arg('--output', 'src/data/openFoodFactsProductImages.json'));
  const limit = Number(arg('--limit', '150'));
  const delaySeconds = Number(arg('--delay', '4.2'));
  if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(delaySeconds) || delaySeconds < 4) {
    throw new Error('--limit must be positive and --delay must be at least 4 seconds.');
  }

  const products = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  if (!Array.isArray(products)) throw new Error('Catalog input must be a JSON array of products.');
  const barcodes = [...new Set(products.map((product) => String(product.barcode || '')).filter(Boolean))].slice(0, limit);
  const byBarcode = {};

  for (let i = 0; i < barcodes.length; i += 1) {
    const barcode = barcodes[i];
    try {
      const match = await fetchBarcode(barcode);
      if (match) {
        byBarcode[barcode] = match;
        process.stdout.write(`[${i + 1}/${barcodes.length}] matched ${barcode}: ${match.name || 'product image'}\n`);
      } else {
        process.stdout.write(`[${i + 1}/${barcodes.length}] no exact public product match for ${barcode}\n`);
      }
    } catch (error) {
      process.stderr.write(`[${i + 1}/${barcodes.length}] stopped at ${barcode}: ${error.message}\n`);
      break;
    }
    if (i < barcodes.length - 1) await sleep(delaySeconds * 1000);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify({
    source: 'Open Food Facts',
    fetchedAt: new Date().toISOString(),
    byBarcode,
  }, null, 2), 'utf8');
  process.stdout.write(`Wrote ${Object.keys(byBarcode).length} exact-barcode matches from ${barcodes.length} lookups to ${outputPath}\n`);
  process.stdout.write('No supermarket prices were changed. Open Food Facts image attribution and license terms apply.\n');
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
