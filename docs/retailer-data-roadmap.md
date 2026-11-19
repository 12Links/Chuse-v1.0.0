# Chuse retailer data roadmap

## The constraint

Chuse currently has no retailer contracts, credentials, or paid data budget. There is no responsible way to promise every SKU and current price across seven chains in that situation. A public product catalog is not a price feed, and a price found online may depend on loyalty status, delivery area, selected branch, stock, or promotion dates. Chuse must not infer missing prices or label old data live.

## Data-source plan

| Source | Use | Trust and limitation |
| --- | --- | --- |
| Open Food Facts | Product names, barcode identity, pack size, product images | Community-maintained product metadata; not retailer prices. Attribute it and follow its data/API terms. |
| Open Prices | Optional observed-price signal, product barcode, date, proof, and mapped store location | Community-submitted observations, not a guaranteed retailer feed. Use only ZAR prices with a South African location, match retailer and barcode carefully, preserve proof and observation date, and label the source. Coverage in South Africa may be sparse. |
| Retailer public catalogues and specials | Dated promotions for the area the catalogue names | Only ingest pages/documents the retailer makes publicly available and where its terms allow reuse. Store validity dates and location. A weekly flyer is not a full product catalog. Do not bypass login, access controls, or anti-bot measures. |
| Retailer feeds or licensed providers | Broad, reliable, frequently refreshed assortment and price coverage | Best route to broad coverage. Requires direct retailer agreement or a provider contract; price and permitted use must be confirmed before launch. |
| Chuse shopper reports | Fill local gaps and correct stale observations | Store as pending until proof/review. A community report is not automatically a verified quote. |

Open Prices is a free community data project with a public API and daily data exports. Its API documentation says some endpoints require an account/token; Chuse should start with read-only access, test its coverage, and follow the ODbL attribution and share-alike requirements before redistributing or combining records. See [Open Prices API](https://openfoodfacts.github.io/open-prices/guides/API/), [price list endpoint](https://openfoodfacts.github.io/documentation/docs/Open-prices/prices/prices_list/), and [data and license guidance](https://openfoodfacts.github.io/open-prices/guides/data/).

To inspect a bounded recent sample locally, run `npm run open-prices:snapshot`. It stores a review-only file at `open_prices_snapshot.json` (ignored by Git) and never writes to Supabase. Rows are candidates only: the snapshot needs product, retailer, location, date, and proof review before it can become a Chuse offer. Coverage can be empty or sparse.

## Delivery sequence

### 1. Make trust visible (implemented in this branch)

- Treat bundled and legacy prices as demo data.
- Require source, branch/location, and recent fetch time before an offer can affect verified price comparisons.
- Keep observed price history; never synthesize chart points or buy-timing advice.
- Preserve retailer, location, loyalty price, source URL, validity dates, stock, and observations in the catalog schema.
- Do not seed modeled offers into production price tables.

### 2. Populate a small real pilot

- Pick one city and a manageable set of frequently bought barcoded products.
- Read Open Prices coverage for South Africa and see whether it has enough recent ZAR observations for the pilot; do not assume it does.
- Pilot public, dated specials per retailer only after reviewing terms and validating product/pack-size matches.
- Accept user submissions with photo proof, but keep them pending. Add a server-side review action and file storage before treating photos as evidence.
- Track coverage, match confidence, stale-rate, and corrections by store and suburb.

### 3. Add lawful refresh and comparison

- Use a scheduled worker with per-source adapters, rate limits, retries, source health, and a last-success timestamp.
- Capture each observation before replacing the current offer. Expire offers after their source freshness or promotion validity window.
- Match exact barcode/SKU first. Keep uncertain name-and-size matches out of optimizer totals until reviewed.
- Compare like-for-like branches or delivery zones, basket quantities, loyalty eligibility, promotion conditions, and stock.
- Link every displayed quote back to its source and timestamp.

### 4. Expand from measured coverage

- Add more products, branches, cities, and store adapters only when the source works consistently and the legal/data terms permit it.
- Request direct retailer or licensed-provider access for broad, dependable catalogs. Keep the free/community path as a fallback and correction loop.
- Launch the full basket optimizer only after a city/store coverage threshold is met and clearly show missing items and quote age.

## Release checks for a retailer adapter

- Data source and reuse terms documented.
- Correct retailer and region/branch identity.
- Barcode or reviewed product match, correct pack size, currency ZAR.
- Promotion price, regular/loyalty price, conditions, and start/end dates are preserved separately.
- Source URL and observed/fetched times are stored.
- A failed or blocked refresh cannot make an old offer look current.
- Users can see unavailability instead of a fabricated price.
