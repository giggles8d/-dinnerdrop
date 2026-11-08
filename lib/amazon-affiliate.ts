// Amazon Associates affiliate links for DinnerDrop.
// Store ID issued for dinnerdrop.app (US store, "-20").
// Override via NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG if the tag ever changes.
export const AMAZON_ASSOCIATES_TAG =
  process.env.NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG || 'dinnerdrop-20'

/** Build an Amazon search URL with the affiliate tag attached. */
export function amazonSearchUrl(term: string): string {
  const q = encodeURIComponent(term)
  const tag = AMAZON_ASSOCIATES_TAG
  return `https://www.amazon.com/s?k=${q}${tag ? `&tag=${tag}` : ''}`
}

/** Build an Amazon product URL (by ASIN) with the affiliate tag attached. */
export function amazonProductUrl(asin: string, tagOverride?: string): string {
  const tag = tagOverride || AMAZON_ASSOCIATES_TAG
  return `https://www.amazon.com/dp/${asin}${tag ? `?tag=${tag}` : ''}`
}

export interface AffiliateItem {
  name: string
  /** What the item is (kept for reference; links never use search — search links earn no credit). */
  search: string
  /** The exact Amazon product the chip links to (checked on Amazon Nov 8 2026: in stock, 4.4★+). */
  asin: string
  product: string
}

export interface AffiliateGroup {
  title: string
  emoji: string
  items: AffiliateItem[]
}

// Curated restock staples for the Pantry page. Each chip links ONE exact product (Sarah, Nov 8 2026: never a
// search link). Products picked and checked on Amazon Nov 8 2026; recheck if one goes out of stock.
export const PANTRY_ESSENTIALS: AffiliateGroup[] = [
  {
    title: 'Cooking basics & spices',
    emoji: '🧂',
    items: [
      { name: 'Extra-virgin olive oil', search: 'extra virgin olive oil', asin: 'B08XY6RQHX', product: 'California Olive Ranch Extra Virgin Olive Oil (2 L)' },
      { name: 'Avocado oil spray', search: 'avocado oil cooking spray', asin: 'B0FBYXSXZM', product: 'Chosen Foods 100% Avocado Oil Spray' },
      { name: 'Kosher salt', search: 'kosher salt', asin: 'B0011BPMUK', product: 'Diamond Crystal Kosher Salt' },
      { name: 'Ground black pepper', search: 'ground black pepper', asin: 'B010BUE6CG', product: 'McCormick Pure Ground Black Pepper' },
      { name: 'Garlic powder', search: 'garlic powder', asin: 'B074ZK8MQS', product: 'McCormick Garlic Powder' },
      { name: 'Onion powder', search: 'onion powder', asin: 'B01JH65TM6', product: 'McCormick Onion Powder' },
      { name: 'Italian seasoning', search: 'italian seasoning', asin: 'B001PQREOI', product: 'McCormick Italian Seasoning' },
      { name: 'Smoked paprika', search: 'smoked paprika', asin: 'B00MQIQ1V6', product: 'McCormick Smoked Paprika' },
      { name: 'Ground cumin', search: 'ground cumin', asin: 'B001PQOAOA', product: 'McCormick Ground Cumin (14 oz)' },
      { name: 'Chili powder', search: 'chili powder', asin: 'B001PQOAP4', product: 'McCormick Dark Chili Powder' },
    ],
  },
  {
    title: 'Shelf staples',
    emoji: '🥫',
    items: [
      { name: 'Low-sodium chicken broth', search: 'low sodium chicken broth', asin: 'B0C5S7Q1XL', product: 'Swanson Lower Sodium Chicken Broth (6 × 32 oz)' },
      { name: 'Canned diced tomatoes', search: 'canned diced tomatoes', asin: 'B00DOSIYAS', product: 'Hunt\'s Petite Diced Tomatoes' },
      { name: 'Tomato paste', search: 'tomato paste', asin: 'B07JRCSTKT', product: 'Mutti Double Concentrated Tomato Paste (4 tubes)' },
      { name: 'Coconut milk', search: 'canned coconut milk', asin: 'B000GZSDZI', product: 'Thai Kitchen Unsweetened Coconut Milk' },
      { name: 'Pasta', search: 'dried pasta', asin: 'B00WBGKJPW', product: 'Barilla Spaghetti' },
      { name: 'White rice', search: 'white rice 5 lb', asin: 'B000JOQ57E', product: 'Mahatma Extra-Long-Grain White Rice (5 lb)' },
      { name: 'Quinoa', search: 'quinoa', asin: 'B00JPJRQ7W', product: 'Viva Naturals Organic Quinoa (4 lb)' },
      { name: 'Canned black beans', search: 'canned black beans', asin: 'B01N1O1TF8', product: 'Bush\'s Best Black Beans (12 × 15 oz)' },
      { name: 'Soy sauce', search: 'soy sauce', asin: 'B0FBX8WPHW', product: 'Kikkoman Less Sodium Soy Sauce (2-pack)' },
      { name: 'Honey', search: 'honey', asin: 'B00CMQD3VS', product: 'Nate\'s 100% Pure Raw Honey (32 oz)' },
    ],
  },
  {
    title: 'Wraps & storage',
    emoji: '🧴',
    items: [
      { name: 'Aluminum foil', search: 'aluminum foil heavy duty', asin: 'B00M8ZEAW4', product: 'Reynolds Wrap Heavy Duty Aluminum Foil' },
      { name: 'Parchment paper', search: 'parchment paper sheets', asin: 'B00C37QN2C', product: 'Reynolds Kitchens Stay Flat Parchment Paper' },
      { name: 'Gallon freezer bags', search: 'gallon freezer bags', asin: 'B0DGNHJVLY', product: 'Ziploc Gallon Freezer Bags (2-pack)' },
      { name: 'Glass food storage', search: 'glass food storage containers with lids', asin: 'B07L51SFVS', product: 'Pyrex Simply Store Glass Containers (12-pc)' },
      { name: 'Plastic wrap', search: 'plastic wrap', asin: 'B0CH92KWTG', product: 'Amazon Basics Plastic Food Wrap' },
    ],
  },
  {
    title: 'Household essentials',
    emoji: '🧻',
    items: [
      { name: 'Paper towels', search: 'paper towels bulk', asin: 'B0DQYQKZQ2', product: 'Bounty Quick-Size Paper Towels (12 rolls)' },
      { name: 'Dish soap', search: 'dish soap', asin: 'B0FX5X647R', product: 'Dawn Ultra Dish Soap Refill' },
      { name: 'Dishwasher pods', search: 'dishwasher detergent pods', asin: 'B0DR3HBKSB', product: 'Cascade Platinum Dishwasher Pods' },
      { name: 'Trash bags', search: 'kitchen trash bags 13 gallon', asin: 'B07T9MBNTT', product: 'Glad Tall Kitchen Drawstring Trash Bags (13 gal)' },
      { name: 'Sponges', search: 'kitchen sponges', asin: 'B0043P0GRA', product: 'Scotch-Brite Zero Scratch Scrub Sponges (9-pack)' },
    ],
  },
]

// Kitchen tools — Amazon's best physical-goods rate (4.5%). Used on the blog.
export const KITCHEN_TOOLS: AffiliateGroup = {
  title: 'Stock your kitchen',
  emoji: '🍳',
  items: [
    { name: 'Half-sheet pan', search: 'half sheet pan baking', asin: 'B0049C2S32', product: 'Nordic Ware Naturals Half Sheet Pan' },
    { name: 'Nonstick skillet', search: 'nonstick skillet 12 inch', asin: 'B07H18G2P4', product: 'T-fal Ultimate Hard Anodized Nonstick Fry Pans (10" + 12")' },
    { name: 'Dutch oven', search: 'enameled dutch oven', asin: 'B073Q9WV8S', product: 'Amazon Basics 6-Qt Enameled Cast Iron Dutch Oven' },
    { name: "Chef's knife", search: 'chef knife 8 inch', asin: 'B008M5U1C2', product: 'Victorinox Fibrox Pro 8" Chef\'s Knife' },
    { name: 'Cutting board', search: 'plastic cutting board set', asin: 'B07WBTRRMT', product: 'OXO Good Grips 2-Piece Cutting Board Set' },
    { name: 'Mixing bowls', search: 'stainless steel mixing bowls', asin: 'B01HTYH8YA', product: 'FineDine Stainless Steel Mixing Bowl Set' },
    { name: 'Measuring cups & spoons', search: 'measuring cups and spoons set', asin: 'B0CBW78J4Q', product: 'Spring Chef Stainless Measuring Cups & Spoons' },
    { name: 'Instant Pot', search: 'instant pot duo', asin: 'B00FLYWNYQ', product: 'Instant Pot Duo 6-Qt 7-in-1' },
    { name: 'Air fryer', search: 'air fryer', asin: 'B0CSZ7WBYW', product: 'Ninja Air Fryer Pro 5-Qt' },
    { name: 'Food storage containers', search: 'meal prep containers', asin: 'B07L51SFVS', product: 'Pyrex Simply Store Glass Containers (12-pc)' },
  ],
}
