import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SampleWeek from '@/components/SampleWeek'
import MealCardImage from '@/components/MealCardImage'
import { getSampleWeek, sampleWeekTotal } from '@/lib/sample-weeks'
import { libraryIndex } from '@/lib/recipe-index'
import type { LibRow } from '@/lib/recipe-filters'
import { createClient } from '@supabase/supabase-js'
import { styleByKey } from '@/lib/styles'

/** Per-serving nutrition from the recipe library (estimated), for the plan-style hubs. */
type Nut = { carbs?: number; sugar?: number; fiber?: number; sodium?: number; satFat?: number; calories?: number }
async function nutritionById(): Promise<Map<string, Nut>> {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const out = new Map<string, Nut>()
  for (let from = 0; from < 5000; from += 1000) {
    const { data } = await admin.from('recipes').select('id, nutrition').eq('is_public', true).not('nutrition', 'is', null).order('id').range(from, from + 999)
    for (const r of data ?? []) out.set(r.id as string, r.nutrition as Nut)
    if (!data || data.length < 1000) break
  }
  return out
}
import SocialLinks from '@/components/SocialLinks'

export const revalidate = 3600

/**
 * Dietary / situation landing pages (Tier 1.6): each one shows a real-format
 * example week for that situation with Recipe schema, then the free CTA.
 */

interface Topic {
  slug: string
  week?: string                 // a sample week (lib/sample-weeks), shown when set
  /** Recipe hub (Nov 7 2026): real library recipes for the search this page answers, each linking to its recipe page. */
  hub?: { heading: string; blurb: string; match: (r: LibRow, n: Nut | null) => boolean; limit: number; nutrition?: boolean }
  /** Plan style (lib/styles) this page sells: its sign-up links pre-pick that style in the setup walkthrough. */
  style?: string
  bulletsHeading?: string
  title: string
  h1: string
  intro: string
  description: string
  bullets: string[]
  faq: Array<{ q: string; a: string }>
}

const TOPICS: Topic[] = [
  {
    slug: 'gluten-free-family-dinners',
    week: 'glutenfree',
    title: 'Gluten-Free Family Dinners, Planned Weekly — Free',
    h1: 'Gluten-free family dinners, planned for you every week',
    intro: 'Five naturally gluten-free dinners a week, built around your family size, budget, and cook time — with one grocery list that goes straight into your Instacart cart. No specialty aisle, no reading every label twice.',
    description: 'Weekly gluten-free dinner plans for families: five naturally gluten-free dinners, one combined grocery list, and a one-tap Instacart cart. Free, no card.',
    bullets: [
      'Every dinner is built gluten-free from the start — rice, potatoes, corn tortillas, tamari instead of soy sauce — rather than a regular recipe with swaps bolted on.',
      'Mixed households: the plan feeds everyone the same dinner, so nobody cooks twice.',
      'Dietary needs stack: gluten-free plus dairy-free, nut allergies, vegetarian, and more, on every plan.',
      'Always check labels — sauces, broths, and seasoning mixes vary by brand. DinnerDrop picks ingredients that are usually gluten-free; your store’s packaging is the final word.',
    ],
    faq: [
      { q: 'Does it avoid cross-contamination ingredients like oats?', a: 'Plans avoid wheat, barley, and rye outright and lean on naturally gluten-free staples. If you need certified-GF oats or a specific brand, add it as a dietary note and swap any dinner in one tap.' },
      { q: 'Can I combine gluten-free with other needs?', a: 'Yes. Gluten-free, dairy-free, vegetarian, vegan, nut-free, and keto can all be set together; every plan respects all of them.' },
    ],
  },
  {
    slug: 'picky-eater-dinners',
    week: 'kid',
    title: 'Picky-Eater Dinners the Whole Family Eats — Planned Weekly, Free',
    h1: 'Dinners your picky eater will actually eat, planned every week',
    intro: 'Familiar flavors, one safe thing on every plate, and build-your-own nights so kids feel in control. Five dinners a week around your budget and cook time, with the grocery list already in your cart.',
    description: 'Weekly dinner plans for families with picky eaters: familiar, deconstructed, build-your-own dinners with one grocery list and a one-tap Instacart cart. Free, no card.',
    bullets: [
      'Swap any dinner in one tap. DinnerDrop learns what your family keeps and what it skips, and plans around it.',
      'Deconstructed by default: tacos, bowls, and sheet-pan dinners where every component is visible and optional.',
      'Keep the winners: favorite any dinner and it rotates back in instead of being replaced by something new every week.',
      'Five dinners, not seven. A leftover night and a takeout night are part of real life, so the plan leaves room for them.',
    ],
    faq: [
      { q: 'What if my kids only eat five things?', a: 'Add those five as favorites (type the names; DinnerDrop rebuilds them as full recipes) and the planner builds weeks around them, introducing one new dinner at a time.' },
      { q: 'Does it handle different preferences in one house?', a: 'Yes. Family size and dietary needs shape every plan, and Family members get a profile for each person — each kid’s likes, won’t-eats, allergies, and safe foods — that the planner follows every week.' },
    ],
  },
  {
    slug: 'dinners-under-30-minutes',
    week: 'fast',
    hub: { heading: '30-minute family dinners from our recipe library', blurb: 'Every one is 30 minutes or less from first chop to the table, sized for a family.', match: (r) => r.time > 0 && r.time <= 30, limit: 48 },
    title: 'Weeknight Dinners Under 30 Minutes, Planned Weekly — Free',
    h1: 'Weeknight dinners under 30 minutes, planned for you',
    intro: 'Set your cook time once — 20 minutes, 30 minutes, whatever your weeknights allow — and every dinner fits it, prep included. One grocery list, one tap to your Instacart cart.',
    description: 'Weekly plans of weeknight dinners under 30 minutes (or under 20), built to your family size and budget, with one grocery list and a one-tap Instacart cart. Free, no card.',
    bullets: [
      'Times are total, from first chop to the table, not just the cook step.',
      'Shortcuts that hold up: rotisserie chicken, microwave rice, refrigerated tortellini, bagged salad kits.',
      'Leftover-aware pairs: Tuesday’s chicken becomes Thursday’s flatbreads.',
      'Busy-night scheduling: give each cook night its own minutes in Settings — a 15-minute dinner on practice night, a 40-minute one on Sunday — and the planner matches each dinner to its night.',
    ],
    faq: [
      { q: 'Are the times realistic?', a: 'Each recipe lists prep and cook time separately and the plan respects your limit for the total. If one runs long for you, swap it in one tap and the planner learns.' },
      { q: 'Can I set different limits for different nights?', a: 'Yes. In Settings you pick your cook nights and give each one its own minutes — 20 on soccer night, 45 on Sunday — and the planner matches each dinner to its night.' },
    ],
  },
  {
    slug: 'family-dinners-under-100',
    week: 'budget',
    hub: { heading: 'Cheap family dinners from our recipe library', blurb: 'Each costs about $2.50 a serving or less at typical US grocery prices.', match: (r) => r.servings > 0 && r.cost > 0 && r.cost / r.servings <= 2.5, limit: 48 },
    title: 'Family Dinners Under $100 a Week, Planned — Free',
    h1: 'Five family dinners for under $100 a week, planned and in your cart',
    intro: 'Tell DinnerDrop your weekly dinner budget and every plan is built to fit it — overlapping ingredients, pantry staples, and a running estimate before you shop. The list goes straight into your Instacart cart in one tap.',
    description: 'Weekly budget dinner plans for families: five dinners built to your grocery budget with a running estimate, one combined list, and a one-tap Instacart cart. Free, no card.',
    bullets: [
      'Set the number — $75, $100, $150 — and the planner targets it with an estimate per dinner and for the week.',
      'Ingredients overlap on purpose: one bag of rice, one onion, one jar of sauce across several dinners.',
      'Pantry scan: photograph what you have and the plan uses it first.',
      'Store prices and package sizes set the final total; the estimate is honest, not a guarantee.',
    ],
    faq: [
      { q: 'How accurate is the estimate?', a: 'It is a recipe-level estimate at typical US grocery prices, shown before you shop. The Instacart cart shows your store’s real prices before you check out, and you can swap anything.' },
      { q: 'Does it work with Walmart or Aldi?', a: 'The list works anywhere — in store, on your phone. The one-tap cart fills Instacart (which delivers from many chains) or, on the Family plan, Kroger.' },
    ],
  },
  {
    slug: 'easy-chicken-dinners',
    hub: { heading: 'Easy chicken dinners for families', blurb: 'Weeknight chicken dinners, 45 minutes or less, with honest times and a one-tap grocery list.', match: (r) => r.pg === 'chicken' && r.time > 0 && r.time <= 45, limit: 60 },
    title: 'Easy Chicken Dinners for Families — Weeknight Recipes | DinnerDrop',
    h1: 'Easy chicken dinners your family will actually eat',
    intro: 'Chicken is the weeknight workhorse: cheap, quick, and almost every kid eats it. Here are family-sized chicken dinners from our library, each 45 minutes or less, with the grocery list one tap from your Instacart cart.',
    description: 'Easy weeknight chicken dinners for families: sheet-pan, skillet, slow cooker and kid-friendly chicken recipes in 45 minutes or less, with a one-tap grocery list.',
    bullets: [
      'Thighs are cheaper and more forgiving than breasts: they stay juicy if they cook a few minutes long. Breasts are best pounded thin or sliced so they cook fast and evenly.',
      'Cook chicken to 165°F in the thickest part. An instant-read thermometer ends the cutting-into-it guesswork.',
      'One pack, two dinners: roast extra on Monday and it becomes Wednesday\'s tacos, quesadillas or fried rice.',
      'DinnerDrop plans chicken into your week as often as you want it (every week, every other week) and keeps it from repeating the same dinner.',
    ],
    faq: [
      { q: 'How do I keep chicken breast from drying out?', a: 'Pound or slice it to an even thickness, cook it hot and fast, pull it at 165°F, and let it rest 5 minutes before cutting. Or use boneless thighs, which stay juicy.' },
      { q: 'Can I use frozen chicken?', a: 'Thaw it in the fridge overnight (or in cold water, changing the water every 30 minutes) for skillet and sheet-pan recipes. Slow cookers should start with thawed chicken so it heats through safely.' },
      { q: 'How many chicken dinners a week is too many?', a: 'That\'s up to your family. In DinnerDrop you set how many chicken nights you want a week, and the planner fills the rest with beef, pork, fish or meatless dinners.' },
    ],
  },
  {
    slug: 'ground-beef-dinners',
    hub: { heading: 'Ground beef dinners for families', blurb: 'Tacos, pasta, skillets, casseroles and burgers: budget-friendly weeknight dinners built on ground beef.', match: (r) => r.pg === 'beef' && /ground beef|lean ground|ground chuck|hamburger/.test(r.ing), limit: 60 },
    title: 'Cheap Ground Beef Dinners for Families — Easy Recipes | DinnerDrop',
    h1: 'Easy, cheap ground beef dinners for busy families',
    intro: 'A pound of ground beef stretches into a lot of family dinners: tacos, chili, pasta, skillets and casseroles. Here are the ground beef dinners in our library, sized for a family, with a one-tap grocery list.',
    description: 'Cheap, easy ground beef dinners for families: tacos, skillets, pasta, chili and casseroles with honest times and cost, plus a one-tap Instacart grocery list.',
    bullets: [
      '80/20 has the most flavor; 90/10 means less to drain. For tacos and chili, either works. Drain the fat for casseroles so they don\'t turn greasy.',
      'Stretch it: beans, rice, lentils or diced vegetables let one pound feed a bigger family for less.',
      'Brown a double batch and freeze half flat in a zip-top bag. It thaws in minutes for the next taco night.',
      'Cook ground beef to 160°F, until no pink remains.',
    ],
    faq: [
      { q: 'How much ground beef per person?', a: 'Plan about 4 to 6 ounces per adult for dishes where beef is the star (burgers), and about 3 to 4 ounces where it\'s mixed with beans, pasta or rice.' },
      { q: 'Can I swap ground turkey?', a: 'Yes, in almost every recipe here. Add a little oil since turkey is leaner, and season a bit more boldly.' },
      { q: 'How long does cooked ground beef keep?', a: 'Three to four days in the fridge, or about three months in the freezer.' },
    ],
  },
  {
    slug: 'diabetic-friendly-dinners',
    style: 'diabetic',
    hub: { heading: 'Diabetic-friendly family dinners from our recipe library', blurb: 'Each one is 45 g of carbs or less, 10 g of sugar or less and at least 4 g of fiber per serving (estimated).', match: (_r, n) => !!n && n.carbs != null && n.carbs <= 45 && (n.sugar ?? 99) <= 10 && (n.fiber ?? 0) >= 4, limit: 48, nutrition: true },
    title: 'Diabetic-Friendly Family Dinners, Planned Weekly | DinnerDrop',
    h1: 'Diabetic-friendly dinners the whole family eats, planned every week',
    intro: 'Pick the Diabetic-friendly plan and every dinner keeps carbs modest, skips added sugar and leans on vegetables, beans and lean protein. It is regular family food, not a separate “diet” plate, and the grocery list goes to your cart in one tap.',
    description: 'Weekly diabetic-friendly dinner plans for families: modest carbs, no added sugar, more fiber, one grocery list and a one-tap Instacart, Walmart or Kroger cart. Free to start.',
    bulletsHeading: 'How the Diabetic-friendly plan works',
    bullets: [
      'Every dinner aims for 45 g of carbs or less per serving, with no added sugar or sweet sauces. Carbs come from vegetables, beans and whole grains in measured portions.',
      'Each recipe shows estimated calories, carbs, fiber, sugar and sodium per serving, so you can see the numbers before you cook.',
      'One dinner for everyone: the kids eat the same meal, so nobody cooks twice.',
      'Need a carb target for one person? Family members can each have their own health needs, and the planner fits each dinner around them.',
      'This is meal planning, not medical advice. Nutrition numbers are estimates; follow the plan your doctor or dietitian gave you.',
    ],
    faq: [
      { q: 'Is this a medical diet?', a: 'No. It is a family meal plan built around common diabetes-friendly guidelines: modest carbs, no added sugar, more fiber and lean protein. Your doctor or dietitian has the final word on your own targets.' },
      { q: 'Can I combine it with other plans?', a: 'Yes. Diabetic-friendly works together with Gluten-free, Heart-healthy, Slow cooker, 30-minute and the other plan styles, and with any allergies in your family.' },
      { q: 'Where do the nutrition numbers come from?', a: 'Each recipe is estimated from its ingredients and serving size. They are close, not lab-tested, so treat them as a guide.' },
    ],
  },
  {
    slug: 'heart-healthy-dinners',
    style: 'heart',
    hub: { heading: 'Heart-healthy family dinners from our recipe library', blurb: 'Each one is under 600 mg of sodium and under 6 g of saturated fat per serving (estimated).', match: (_r, n) => !!n && n.sodium != null && n.satFat != null && n.sodium < 600 && n.satFat < 6, limit: 48, nutrition: true },
    title: 'Heart-Healthy Family Dinners, Planned Weekly | DinnerDrop',
    h1: 'Heart-healthy family dinners, planned for you every week',
    intro: 'Pick the Heart-healthy plan and every dinner stays lower in sodium and saturated fat: fish, poultry, beans, olive oil and plenty of vegetables. Five dinners your family will actually eat, with the grocery list in your cart in one tap.',
    description: 'Weekly heart-healthy dinner plans for families: lower sodium and saturated fat, fish, poultry and beans, one grocery list and a one-tap Instacart, Walmart or Kroger cart. Free to start.',
    bulletsHeading: 'How the Heart-healthy plan works',
    bullets: [
      'Every dinner aims for under 600 mg of sodium and under 6 g of saturated fat per serving.',
      'No bacon, sausage, deli meat or salty sauces. Flavor comes from herbs, garlic, citrus and spices instead.',
      'Each recipe shows estimated sodium, saturated fat and calories per serving.',
      'Everyday dinners, not diet food: sheet-pan salmon, turkey chili, chicken fajitas and pasta with lots of vegetables.',
      'This is meal planning, not medical advice. If your doctor gave you a sodium or fat target, follow theirs.',
    ],
    faq: [
      { q: 'How much sodium is in each dinner?', a: 'The plan aims for under 600 mg per serving, and each recipe page shows its estimate. Choosing low-sodium broth and canned beans at the store lowers it further.' },
      { q: 'Will my kids eat it?', a: 'That is the point. The dinners are familiar family meals made with leaner proteins and less salt, and you can swap any dinner in one tap.' },
    ],
  },
  {
    slug: 'mediterranean-family-dinners',
    style: 'mediterranean',
    hub: { heading: 'Mediterranean family dinners from our recipe library', blurb: 'Olive oil, fish, chicken, beans, vegetables, lemon and herbs.', match: (r) => r.cg === 'mediterranean', limit: 48 },
    title: 'Mediterranean Family Dinners, Planned Weekly | DinnerDrop',
    h1: 'Mediterranean dinners for the whole family, planned every week',
    intro: 'Pick the Mediterranean plan and your week fills with olive oil, fish, chicken, beans, vegetables and fresh herbs, with red meat at most once. Kid-friendly versions of the dishes, one combined grocery list, and your cart filled in one tap.',
    description: 'Weekly Mediterranean diet dinner plans for families: fish, chicken, beans, olive oil and vegetables, one grocery list and a one-tap Instacart, Walmart or Kroger cart. Free to start.',
    bulletsHeading: 'How the Mediterranean plan works',
    bullets: [
      'Fish or beans most nights, chicken on others, red meat at most once a week.',
      'Kid-friendly versions: chicken souvlaki with pita, Greek sheet-pan chicken and potatoes, lemon orzo, salmon with rice.',
      'Pantry staples repeat on purpose (olive oil, lemons, feta, chickpeas), so the grocery bill stays down.',
      'Combine it with 30-minute, Budget or Gluten-free if you need dinners to be quick, cheap or wheat-free too.',
    ],
    faq: [
      { q: 'Is the Mediterranean diet expensive?', a: 'It does not have to be. Beans, lentils, chicken thighs, canned fish and seasonal vegetables carry most dinners, and you set the weekly budget.' },
      { q: 'Can I still have pasta and bread?', a: 'Yes. Whole-grain pasta, pita and crusty bread are part of the Mediterranean pattern; the plan just keeps portions sensible and adds vegetables.' },
    ],
  },
  {
    slug: 'slow-cooker-family-dinners',
    style: 'slowcooker',
    hub: { heading: 'Slow cooker family dinners from our recipe library', blurb: 'About 15 minutes of morning prep, dinner done when you get home.', match: (r) => r.tags.includes('slow-cooker'), limit: 48 },
    title: 'Slow Cooker Family Dinners, Planned Weekly | DinnerDrop',
    h1: 'Slow cooker dinners, planned for your busiest nights',
    intro: 'Pick the Slow cooker plan and at least two dinners a week go in the slow cooker in the morning and are ready when you walk in. The rest stay quick weeknight meals, and the whole grocery list lands in your cart in one tap.',
    description: 'Weekly slow cooker dinner plans for families: set it in the morning, dinner is ready at night. One grocery list and a one-tap Instacart, Walmart or Kroger cart. Free to start.',
    bulletsHeading: 'How the Slow cooker plan works',
    bullets: [
      'At least two slow cooker dinners each week, about 15 minutes of morning prep and 6 to 8 hours on low.',
      'Swap any dinner in one tap if the week changes.',
      'Big batches on purpose: many slow cooker dinners double as next-day lunches or a leftover night.',
      'Prefer an Instant Pot? Pick the Instant Pot plan instead, or both.',
    ],
    faq: [
      { q: 'Can I prep the night before?', a: 'Yes. Most slow cooker dinners can be loaded into the crock the night before and kept in the fridge, then started in the morning.' },
      { q: 'How many slow cooker dinners will I get?', a: 'At least two a week. You can set how many all-day dinners you want in Settings.' },
    ],
  },
]

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }))
}

export function generateMetadata({ params }: { params: { topic: string } }): Metadata {
  const t = TOPICS.find((x) => x.slug === params.topic)
  if (!t) return {}
  const url = `https://www.dinnerdrop.app/dinners/${t.slug}`
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: url },
    openGraph: { title: t.title, description: t.description, url, siteName: 'DinnerDrop', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: t.title, description: t.description, images: ['/og-image.png'] },
  }
}

export default async function TopicPage({ params }: { params: { topic: string } }) {
  const t = TOPICS.find((x) => x.slug === params.topic)
  if (!t) notFound()
  const week = t.week ? getSampleWeek(t.week) : null
  if (t.week && !week) notFound()
  const total = week ? sampleWeekTotal(week) : 0
  let hubRows: LibRow[] = []
  if (t.hub) {
    try {
      const nut = t.hub.nutrition ? await nutritionById() : null
      hubRows = (await libraryIndex()).filter((r) => t.hub!.match(r, nut?.get(r.id) ?? null)).slice(0, t.hub.limit)
    } catch { hubRows = [] }
  }
  const signupHref = t.style ? `/signup?style=${t.style}` : '/signup'
  const style = t.style ? styleByKey(t.style) : null
  const itemList = hubRows.length ? {
    '@context': 'https://schema.org', '@type': 'ItemList', name: t.hub!.heading,
    itemListElement: hubRows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: `https://www.dinnerdrop.app/recipes/${r.slug}`, name: r.name })),
  } : null

  // No Recipe markup on these topic pages (Nov 8 2026): Search Console flagged the 15 sample-week dinners as invalid
  // recipes (no photo, no own page). Recipe rich results come from each /recipes/<slug> page; this page lists them.
  const weekList = week?.meals?.length ? {
    '@context': 'https://schema.org', '@type': 'ItemList', name: `${t.slug.replace(/-/g, ' ')}: a sample week`,
    itemListElement: week.meals.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.name })),
  } : null
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqSchema, ...(weekList ? [weekList] : []), ...(itemList ? [itemList] : [])]) }} />
      <header className="border-b border-border bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link href={signupHref} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">Start free</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-6xl">
        <section className="pt-14 pb-10 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground leading-tight mb-5">{t.h1}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">{t.intro}</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Link href={signupHref} className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-md text-center">Start free &mdash; no card needed &rarr;</Link>
            <span className="text-sm text-muted-foreground">{style ? `${style.emoji} The ${style.name} plan is picked for you at sign-up. Free to start.` : 'Free forever for planning and your Instacart cart.'}</span>
          </div>
        </section>

        {t.hub && hubRows.length > 0 && (
          <section className="pb-14">
            <h2 className="text-2xl font-heading font-bold text-foreground mb-1">{t.hub.heading}</h2>
            <p className="text-muted-foreground mb-6">{t.hub.blurb} {hubRows.length} recipes.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {hubRows.map((r) => (
                <Link key={r.id} href={`/recipes/${r.slug}`} className="rounded-xl border border-border bg-card overflow-hidden group hover:shadow-md transition-shadow block">
                  <MealCardImage mealName={r.name} dayLabel="" imageUrl={r.image_url ?? undefined} />
                  <div className="p-4">
                    <h3 className="font-heading font-semibold leading-tight text-card-foreground group-hover:text-primary">{r.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{r.time} min · {r.servings} servings{r.cost > 0 && r.servings > 0 ? ` · about $${(r.cost / r.servings).toFixed(2)} a serving` : ''}</p>
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-sm"><Link href="/recipes" className="text-primary underline">Browse all {t.slug.includes('chicken') ? 'chicken ' : ''}recipes in the library →</Link></p>
          </section>
        )}

        {week && t.week && (
          <section className="pb-14">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Example week</p>
            <h2 className="text-2xl font-heading font-bold text-foreground mb-6">Five dinners, about ${Math.round(total)} in groceries, one list</h2>
            <SampleWeek keys={[t.week]} hideToggle />
          </section>
        )}

        <section className="pb-14 max-w-3xl">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-5">{t.bulletsHeading ?? (t.week ? 'How DinnerDrop handles it' : 'Tips that make it easier')}</h2>
          <ul className="space-y-3">
            {t.bullets.map((b) => (
              <li key={b} className="flex gap-3 text-foreground leading-relaxed"><span className="text-primary font-bold">&#10003;</span><span>{b}</span></li>
            ))}
          </ul>
        </section>

        <section className="pb-14 max-w-3xl">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-5">Questions</h2>
          <div className="space-y-4">
            {t.faq.map((f) => (
              <div key={f.q} className="rounded-2xl border border-border p-5">
                <h3 className="font-heading font-semibold text-foreground mb-1">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-20 text-center">
          <Link href={signupHref} className="inline-block px-10 py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-md">Plan my week free &rarr;</Link>
          <p className="text-sm text-muted-foreground mt-3">Two minutes to set up. Your first week is ready right away.</p>
          <p className="text-sm text-muted-foreground mt-6">
            More: {TOPICS.filter((x) => x.slug !== t.slug).map((x, i) => (
              <span key={x.slug}>{i > 0 ? ' · ' : ''}<Link href={`/dinners/${x.slug}`} className="text-primary underline">{x.h1}</Link></span>
            ))}
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="container mx-auto px-4 py-6 max-w-6xl flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-heading font-bold text-sm text-primary">DinnerDrop</span>
          <p>&copy; 2026 DinnerDrop</p>
          <SocialLinks />
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
