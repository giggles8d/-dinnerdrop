import Link from 'next/link'
import { MessageSquareText, Users, ListPlus, BellRing } from 'lucide-react'
import HeroClip from '@/components/HeroClip'

/**
 * "The whole family picks" — shows the Family plan's texting vote actually working.
 * Used on / and /start. The clip is a real DinnerDrop text thread (same wording the app sends).
 */
export default function FamilyTextingSection({ ctaHref }: { ctaHref: string }) {
  const points = [
    { icon: MessageSquareText, title: 'Everyone gets the ideas by text', body: 'On the day you choose, DinnerDrop texts 8 dinner ideas to each person in your house. They reply with the numbers they want.' },
    { icon: Users, title: 'The top picks become the week', body: 'When everyone has answered, the most-voted five are your week — assigned to your cook nights, grocery list built. You get a text that it\u2019s done.' },
    { icon: ListPlus, title: 'Anyone can add to the list', body: 'Text "ADD oat milk, bananas" or a photo of the box and it lands on the grocery list with a quantity.' },
    { icon: BellRing, title: 'Reminders when they help', body: 'A text when the plan is ready, when it\u2019s time to shop, and on cook nights.' },
  ]
  return (
    <section className="container mx-auto px-4 py-20 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div className="order-2 lg:order-1 flex justify-center">
          <div className="w-[280px] sm:w-[300px] rounded-[2.2rem] overflow-hidden shadow-2xl ring-1 ring-black/5">
            <HeroClip name="vote-clip" width={540} height={1080} label="A family voting on the week\u2019s dinners by text, then the planner getting the finished week" className="w-full h-auto block" />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Family plan</p>
          <h2 className="text-4xl font-heading font-bold text-foreground mb-4 leading-tight">The whole family picks. You just approve the cart.</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">No app for the kids to install, no group chat to manage. DinnerDrop texts the ideas, counts the votes, and sets the week — this is the actual thread it sends.</p>
          <div className="space-y-6">
            {points.map((p) => (
              <div key={p.title} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary text-primary flex items-center justify-center"><p.icon className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-heading font-bold text-foreground mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href={ctaHref} className="px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-md">Try Family free for 14 days &rarr;</Link>
            <p className="text-sm text-muted-foreground">$4.99/mo or $39/yr after. Cancel anytime.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
