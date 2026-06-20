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
export function amazonProductUrl(asin: string): string {
  const tag = AMAZON_ASSOCIATES_TAG
  return `https://www.amazon.com/dp/${asin}${tag ? `?tag=${tag}` : ''}`
}

export interface AffiliateItem {
  name: string
  /** Amazon search term used to build the affiliate link. */
  search: string
}

export interface AffiliateGroup {
  title: string
  emoji: string
  items: AffiliateItem[]
}

// Curated restock staples for the Pantry page. Search-term based so links
// stay valid even when individual products go out of stock.
export const PANTRY_ESSENTIALS: AffiliateGroup[] = [
  {
    title: 'Cooking basics & spices',
    emoji: '🧂',
    items: [
      { name: 'Extra-virgin olive oil', search: 'extra virgin olive oil' },
      { name: 'Avocado oil spray', search: 'avocado oil cooking spray' },
      { name: 'Kosher salt', search: 'kosher salt' },
      { name: 'Ground black pepper', search: 'ground black pepper' },
      { name: 'Garlic powder', search: 'garlic powder' },
      { name: 'Onion powder', search: 'onion powder' },
      { name: 'Italian seasoning', search: 'italian seasoning' },
      { name: 'Smoked paprika', search: 'smoked paprika' },
      { name: 'Ground cumin', search: 'ground cumin' },
      { name: 'Chili powder', search: 'chili powder' },
    ],
  },
  {
    title: 'Shelf staples',
    emoji: '🥫',
    items: [
      { name: 'Low-sodium chicken broth', search: 'low sodium chicken broth' },
      { name: 'Canned diced tomatoes', search: 'canned diced tomatoes' },
      { name: 'Tomato paste', search: 'tomato paste' },
      { name: 'Coconut milk', search: 'canned coconut milk' },
      { name: 'Pasta', search: 'dried pasta' },
      { name: 'White rice', search: 'white rice 5 lb' },
      { name: 'Quinoa', search: 'quinoa' },
      { name: 'Canned black beans', search: 'canned black beans' },
      { name: 'Soy sauce', search: 'soy sauce' },
      { name: 'Honey', search: 'honey' },
    ],
  },
  {
    title: 'Wraps & storage',
    emoji: '🧴',
    items: [
      { name: 'Aluminum foil', search: 'aluminum foil heavy duty' },
      { name: 'Parchment paper', search: 'parchment paper sheets' },
      { name: 'Gallon freezer bags', search: 'gallon freezer bags' },
      { name: 'Glass food storage', search: 'glass food storage containers with lids' },
      { name: 'Plastic wrap', search: 'plastic wrap' },
    ],
  },
  {
    title: 'Household essentials',
    emoji: '🧻',
    items: [
      { name: 'Paper towels', search: 'paper towels bulk' },
      { name: 'Dish soap', search: 'dish soap' },
      { name: 'Dishwasher pods', search: 'dishwasher detergent pods' },
      { name: 'Trash bags', search: 'kitchen trash bags 13 gallon' },
      { name: 'Sponges', search: 'kitchen sponges' },
    ],
  },
]

// Kitchen tools — Amazon's best physical-goods rate (4.5%). Used on the blog.
export const KITCHEN_TOOLS: AffiliateGroup = {
  title: 'Stock your kitchen',
  emoji: '🍳',
  items: [
    { name: 'Half-sheet pan', search: 'half sheet pan baking' },
    { name: 'Nonstick skillet', search: 'nonstick skillet 12 inch' },
    { name: 'Dutch oven', search: 'enameled dutch oven' },
    { name: "Chef's knife", search: 'chef knife 8 inch' },
    { name: 'Cutting board', search: 'plastic cutting board set' },
    { name: 'Mixing bowls', search: 'stainless steel mixing bowls' },
    { name: 'Measuring cups & spoons', search: 'measuring cups and spoons set' },
    { name: 'Instant Pot', search: 'instant pot duo' },
    { name: 'Air fryer', search: 'air fryer' },
    { name: 'Food storage containers', search: 'meal prep containers' },
  ],
}
