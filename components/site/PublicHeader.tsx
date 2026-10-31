import Link from 'next/link'

type Section = 'blog' | 'shop' | 'recipes' | 'cookware' | 'gift'

/** Header for public pages: the same links as the homepage, so the menu doesn't change page to page. */
export default function PublicHeader({ active }: { active?: Section }) {
  const cls = (on: boolean, bp = 'sm') => `hidden ${bp}:block text-sm font-medium transition-colors ${on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`
  return (
    <header className="border-b border-border bg-white">
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent mt-0.5" />
          <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link href="/blog" className={cls(active === 'blog')}>Blog</Link>
          <Link href="/shop" className={cls(active === 'shop')}>Shop</Link>
          <Link href="/recipes" className={cls(active === 'recipes')}>Recipes</Link>
          <Link href="/cookware" className={cls(active === 'cookware')}>Cookware</Link>
          <Link href="/gift" className={cls(active === 'gift', 'md')}>Gift</Link>
          <Link href="/start" className="hidden md:block px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors" style={{ borderColor: '#e8a838', color: '#1a5c38' }}>Pricing</Link>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
          <Link href="/signup" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Start free</Link>
        </nav>
      </div>
    </header>
  )
}
