// Digital download products sold on /shop.
//
// To add a product: drop the file into the Supabase "shop-downloads" storage
// bucket, then add an entry here with a matching `fileKey`. Prices are in whole
// US dollars. Set `active: false` to hide a product without deleting it.

export interface DigitalProduct {
  id: string
  name: string
  description: string
  priceUsd: number
  /** Object key inside the private "shop-downloads" Supabase Storage bucket. */
  fileKey: string
  /** Public cover image URL (can live in /public or any URL). */
  image: string
  active: boolean
}

export const PRODUCTS: DigitalProduct[] = [
  {
    id: '30-dinners-under-30-minutes',
    name: '30 Dinners Under 30 Minutes',
    description:
      '30 family-tested weeknight dinners — 6 ingredients or fewer, 30 minutes or less, with a full-color photo for every recipe. Plus 5 bonus guides: a 7-day meal plan + grocery list, smart swaps, a pantry checklist, and a freezer guide. 40-page instant PDF download.',
    priceUsd: 9.99,
    fileKey: '30-dinners-under-30-minutes.pdf',
    image: '/shop-30-dinners.jpg',
    // Flip to true AFTER the PDF is uploaded to the shop-downloads bucket.
    active: false,
  },
  {
    id: 'weeknight-dinner-planner',
    name: 'Weeknight Dinner Planner (Printable)',
    description:
      'A clean, printable weekly dinner planner + grocery checklist. Plan the week, shop once, skip the 5pm scramble. Instant PDF download.',
    priceUsd: 7,
    fileKey: 'weeknight-dinner-planner.pdf',
    image: '/og-image.png',
    // Flip to true AFTER the file is uploaded to the shop-downloads bucket.
    active: false,
  },
  {
    id: 'family-meal-prep-bundle',
    name: 'Family Meal-Prep Bundle',
    description:
      'Meal-prep planner, pantry inventory sheet, and a budget grocery tracker — everything a busy family needs to run dinner on autopilot. Instant PDF download.',
    priceUsd: 12,
    fileKey: 'family-meal-prep-bundle.pdf',
    image: '/og-image.png',
    // Flip to true AFTER the file is uploaded to the shop-downloads bucket.
    active: false,
  },
]

export function getProduct(id: string): DigitalProduct | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export function activeProducts(): DigitalProduct[] {
  return PRODUCTS.filter((p) => p.active)
}
