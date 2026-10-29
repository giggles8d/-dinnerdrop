import Link from 'next/link'

/** Header for standalone public pages (cookware, gift): same links as the homepage. */
export default function PublicHeader({ active }: { active?: 'cookware' | 'gift' }) {
  const cls = (on: boolean) => `hidden sm:block font-medium ${on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`
  return (
    <header className="border-b border-border bg-white">
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent mt-0.5" />
          <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 text-sm">
          <Link href="/recipes" className={cls(false)}>Recipes</Link>
          <Link href="/cookware" className={cls(active === 'cookware')}>Cookware</Link>
          <Link href="/gift" className={cls(active === 'gift')}>Gift</Link>
          <Link href="/start" className={cls(false)}>Pricing</Link>
          <Link href="/signup" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Start free</Link>
        </nav>
      </div>
    </header>
  )
}
