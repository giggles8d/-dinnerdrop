import { NextResponse } from 'next/server'
import { lineItemFor } from '@/lib/instacart'

// THROWAWAY (preview only, never merged): which line-item shape makes Instacart put 2 packages in the cart?
export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') return NextResponse.json({ error: 'preview only' }, { status: 404 })
  const key = process.env.INSTACART_API_KEY
  const env = (process.env.INSTACART_API_ENV || 'sandbox').toLowerCase()
  if (!key) return NextResponse.json({ error: 'no key on preview', env })
  const base = env === 'production' ? 'https://connect.instacart.com' : 'https://connect.dev.instacart.tools'
  const variants: Record<string, unknown[]> = {
    A_package: [
      { name: 'large eggs 12 ct', quantity: 2, unit: 'package', display_text: 'A eggs 2 pkg' },
      { name: 'thick cut bacon 16 oz', quantity: 2, unit: 'package', display_text: 'A bacon 2 pkg' },
      { name: 'grated parmesan cheese 8 oz', quantity: 2, unit: 'package', display_text: 'A parm 2 pkg' },
    ],
    B_each: [
      { name: 'large eggs 12 ct', quantity: 2, unit: 'each', display_text: 'B eggs 2 each' },
      { name: 'thick cut bacon 16 oz', quantity: 2, unit: 'each', display_text: 'B bacon 2 each' },
      { name: 'grated parmesan cheese 8 oz', quantity: 2, unit: 'each', display_text: 'B parm 2 each' },
    ],
    C_measurements: [
      { name: 'large eggs', display_text: 'C eggs 24 each', line_item_measurements: [{ quantity: 24, unit: 'each' }] },
      { name: 'thick cut bacon', display_text: 'C bacon 32 oz', line_item_measurements: [{ quantity: 32, unit: 'ounce' }, { quantity: 2, unit: 'pound' }] },
      { name: 'grated parmesan cheese', display_text: 'C parm 16 oz', line_item_measurements: [{ quantity: 16, unit: 'ounce' }] },
    ],
    D_weight: [
      { name: 'large eggs', quantity: 24, unit: 'each', display_text: 'D eggs 24 each' },
      { name: 'thick cut bacon', quantity: 32, unit: 'ounce', display_text: 'D bacon 32 oz' },
      { name: 'grated parmesan cheese', quantity: 16, unit: 'ounce', display_text: 'D parm 16 oz' },
    ],
  }
  const marion: Array<[string, string, string, string]> = [["Garlic","1 head","count","fresh garlic bulb"],["Limes","2","count","limes"],["Cornstarch","1/2","cup","cornstarch"],["Hoisin sauce","1 1/2","tbsp","hoisin sauce"],["Frozen sweet corn","12","oz","frozen sweet corn"],["Frozen sweet peas","2 1/4","cup","frozen sweet peas"],["Broccoli florets","1 1/4","lb","fresh broccoli florets"],["Boneless skinless chicken thighs","2 3/4","lb","boneless skinless chicken thighs"],["Yellow onion","2","count","yellow onion"],["Ground beef","1 1/4","lb","85% lean ground beef"],["Thick cut bacon","18","oz","thick cut bacon"],["Cotija cheese","3","oz","cotija cheese"],["Eggs","15","count","large eggs"],["Grated Parmesan cheese","3","cup","grated parmesan cheese"],["Instant brown rice","1 3/4","cup","instant brown rice"],["Ramen noodles","5","count","dried ramen noodle cakes"],["Chicken broth","9","cup","low sodium chicken broth"],["Crushed tomatoes","2","can","28 oz crushed tomatoes"],["Black beans","2","cans","black beans"],["Spaghetti","3 1/2","lb","spaghetti pasta"]]
  variants.E_new = marion.map(([name, quantity, unit, searchTerm]) => { const li = lineItemFor({ name, quantity, unit, searchTerm }); return { name: li.name, quantity: li.quantity, unit: li.unit, display_text: `E ${name} want ${li.label}` } })
  for (const k of ['A_package', 'B_each', 'C_measurements', 'D_weight']) delete variants[k]
  const out: Record<string, unknown> = { env }
  for (const [k, line_items] of Object.entries(variants)) {
    const r = await fetch(`${base}/idp/v1/products/products_link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ title: `DD unit test ${k}`, link_type: 'shopping_list', expires_in: 1, line_items, landing_page_configuration: { enable_pantry_items: false } }),
    })
    const j = await r.json().catch(() => ({}))
    out[k] = { status: r.status, url: (j as { products_link_url?: string }).products_link_url ?? null, err: r.ok ? undefined : j }
  }
  return NextResponse.json(out)
}
