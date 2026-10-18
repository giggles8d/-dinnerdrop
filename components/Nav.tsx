'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Heart, UtensilsCrossed, ShoppingCart, Package, Clock, User, Settings2, BookOpen } from 'lucide-react'

const links = [
  { href: '/dashboard', label: 'Meals', icon: UtensilsCrossed },
  { href: '/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/favorites', label: 'Favorites', icon: Heart },
  { href: '/grocery-list', label: 'Grocery List', icon: ShoppingCart },
  { href: '/pantry', label: 'Pantry', icon: Package },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/settings', label: 'Settings', icon: Settings2 },
  { href: '/account', label: 'Account', icon: User },
]

export default function Nav() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  // null = unknown (first paint), false = signed out, true = signed in
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user))
  }, [supabase])

  // Public pages (the recipe library) get a marketing-style header when nobody is signed in.
  if (signedIn === false) {
    return (
      <nav className="border-b border-border bg-white">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent mt-0.5" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link href="/recipes" className={`hidden sm:block font-medium ${pathname.startsWith('/recipes') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Recipes</Link>
            <Link href="/blog" className="hidden sm:block font-medium text-muted-foreground hover:text-foreground">Blog</Link>
            <Link href="/start" className="hidden sm:block font-medium text-muted-foreground hover:text-foreground">Pricing</Link>
            <Link href="/login" className="font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Start free</Link>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b border-border bg-white">
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent mt-0.5" />
          <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-secondary text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
