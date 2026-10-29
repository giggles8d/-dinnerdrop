import { NextResponse } from 'next/server'

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
