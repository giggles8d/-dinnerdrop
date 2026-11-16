/**
 * Black Friday kitchen deals (Sarah, Nov 16 2026: "use these Black Friday sales in our newsletters and on our site").
 * Shown on /cookware, in the Sunday Drop, and in the Black Friday blog post until Cyber Monday ends.
 *
 * Every product was checked on Amazon on Nov 16 2026: exact title, 4.4★+ rating, in stock, and marked with an
 * Amazon deal badge that day. We never show prices or "% off" here: Amazon's deals change hourly and the
 * Associates rules don't allow showing prices we can't keep current. Copy says "see today's price on Amazon".
 * Links are one specific product with our tag (never search links — skill dinnerdrop-amazon-links).
 */
import { amazonProductUrl } from '@/lib/amazon-affiliate'
import { NEWSLETTER_TAG } from '@/lib/kitchen-picks'

/** Cyber Monday, Nov 30 2026, 11:59 PM ET. */
export const BLACK_FRIDAY_ENDS = Date.UTC(2026, 11, 1, 4, 59, 59)
export const blackFridayActive = (now: number = Date.now()) => now < BLACK_FRIDAY_ENDS
export const BLACK_FRIDAY_POST = '/blog/black-friday-kitchen-deals-for-busy-families'

export interface BlackFridayDeal {
  asin: string
  /** Exact Amazon product name, shortened. */
  product: string
  /** One honest line: who it helps and why. No testing claims. */
  why: string
  /** 'big' = worth waiting for a sale; 'gift' = usually under $25. */
  kind: 'big' | 'gift'
}

export const BLACK_FRIDAY_DEALS: BlackFridayDeal[] = [
  { asin: 'B003OXNBYC', kind: 'big', product: 'KitchenAid Classic Series 4.5-Qt Stand Mixer', why: 'The classic tilt-head mixer for cookie batches, bread dough and mashed potatoes. 4.7★ from 12,000+ ratings.' },
  { asin: 'B0000635XA', kind: 'big', product: 'KitchenAid Artisan 5-Qt Stand Mixer', why: 'A little bigger bowl than the Classic and lots of colors. 4.7★ from 30,000+ ratings.' },
  { asin: 'B01H7R1EJY', kind: 'big', product: 'Cuisinart 5.5-Qt 12-Speed Stand Mixer', why: 'The biggest bowl of the three, with a splash guard included. 4.7★ from 10,000+ ratings.' },
  { asin: 'B00HQWONBW', kind: 'big', product: 'Calphalon Classic Stainless Steel 10-Piece Set', why: 'Stainless pots and pans with measuring marks and straining lids. 4.4★ from 5,000+ ratings.' },
  { asin: 'B004KSN8XY', kind: 'big', product: 'T-fal Ultimate Hard Anodized Nonstick 12-Piece Set', why: 'Nonstick everyday set with a heat dot that turns red when the pan is ready. 4.6★ from 8,000+ ratings.' },
  { asin: 'B00008CM67', kind: 'big', product: 'Cuisinart Chef\'s Classic Stainless 7-Piece Set', why: 'A smaller stainless starter set that covers most weeknight dinners. 4.5★.' },
  { asin: 'B00MVWGFP4', kind: 'big', product: 'Cuisinart 8-Cup Food Processor', why: 'Chops onions, shreds cheese and makes pesto in seconds. 4.6★ from 9,000+ ratings.' },
  { asin: 'B00FLYWNYQ', kind: 'big', product: 'Instant Pot Duo 6-Qt 7-in-1', why: 'Pressure cooker and slow cooker in one: chili, shredded chicken and rice on busy nights. 4.7★ from 180,000+ ratings.' },
  { asin: 'B0CYJ5X2FM', kind: 'gift', product: 'bella Stack & Store Mini Waffle Maker', why: 'A 4-inch waffle in minutes, ceramic nonstick, and the makers stack for storage. A fun stocking stuffer.' },
  { asin: 'B010TCP3SC', kind: 'gift', product: 'Dash Mini Waffle Maker', why: 'The tiny waffle maker kids love, 4.6★ from 150,000+ ratings.' },
  { asin: 'B07VYZFQW2', kind: 'gift', product: 'KitchenAid Asteroid Pot Holders (2-Pack)', why: 'Cotton pot holders with silicone grips. Cheap, useful, always needed.' },
  { asin: 'B07XXSYLL8', kind: 'gift', product: 'TempPro TP19H Instant-Read Thermometer', why: 'Reads in about a second, so chicken is done, not dry. 4.7★ from 56,000+ ratings.' },
  { asin: 'B00151WA06', kind: 'gift', product: 'Microplane Classic Zester/Grater', why: 'Lemon zest, garlic, ginger and fluffy parmesan. 4.8★ from 49,000+ ratings.' },
]

export const dealUrl = (d: BlackFridayDeal, tag?: string) => amazonProductUrl(d.asin, tag)
export const newsletterDealUrl = (d: BlackFridayDeal) => amazonProductUrl(d.asin, NEWSLETTER_TAG)

/** Three deals for one family's email: one big, two gifts, rotated so weekly emails don't repeat. */
export function dealsForEmail(seed: number): BlackFridayDeal[] {
  const big = BLACK_FRIDAY_DEALS.filter((d) => d.kind === 'big')
  const gift = BLACK_FRIDAY_DEALS.filter((d) => d.kind === 'gift')
  const s = Math.abs(seed)
  return [big[s % big.length], gift[s % gift.length], gift[(s + 2) % gift.length]]
}
