import { amazonSearchUrl, type AffiliateGroup } from '@/lib/amazon-affiliate'

/**
 * Presentational affiliate block. Renders categorized Amazon links as chips.
 * Works in both server and client component trees (no hooks).
 */
export function AmazonRestock({
  groups,
  heading = 'Restock your essentials',
  subheading,
}: {
  groups: AffiliateGroup[]
  heading?: string
  subheading?: string
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="font-heading font-bold text-lg text-foreground">{heading}</h2>
        {subheading && (
          <p className="text-sm text-muted-foreground mt-1">{subheading}</p>
        )}
      </div>

      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              <span className="mr-1">{group.emoji}</span>
              {group.title}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <a
                  key={item.name}
                  href={amazonSearchUrl(item.search)}
                  target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border bg-background text-sm text-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {item.name}
                  <span aria-hidden className="text-muted-foreground">↗</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-5 leading-snug">
        As an Amazon Associate, DinnerDrop earns from qualifying purchases. Links open at Amazon; prices and availability are shown there.
      </p>
    </section>
  )
}
