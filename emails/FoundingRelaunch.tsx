import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface Props {
  firstName?: string
  loginUrl?: string
  unsubscribeUrl?: string
  /** This week's real five-store read, cheapest first, e.g. [['Aldi', 91], ['Weis', 98], ...] */
  stores?: Array<[string, number]>
}

// One-shot "come try it this week" email (October 2026) to 50 founding families.
// Sent via /api/admin/founding-relaunch. Every promise below must be TRUE at send time:
// portions sized to the family (10/18), sales-aware planning, real-price store comparison + split,
// rest-of-the-shop aisles, family text-to-vote, Family plan free for founding families through Oct 2027.
export default function FoundingRelaunch({
  firstName = 'there',
  loginUrl = 'https://www.dinnerdrop.app/login?utm_source=email&utm_medium=email&utm_campaign=founding-relaunch-oct26',
  unsubscribeUrl = 'https://www.dinnerdrop.app/unsubscribe',
  stores = [],
}: Props) {
  const cheapest = stores[0], priciest = stores[stores.length - 1]
  return (
    <Html>
      <Head />
      <Preview>Same grocery list, five stores, real prices — DinnerDrop now tells you which one to pick</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              You were one of the first families to sign up for DinnerDrop, and I owe you an update,
              because the version you saw back then and the one that exists today are not the same product.
            </Text>
            <Text style={paragraph}>
              I&apos;m a working mom in upstate New York, feeding a family of five. I placed my own family&apos;s order
              through DinnerDrop this morning. Here is what it does now:
            </Text>
            <Text style={bullet}>
              <strong>It prices your whole list at every store you shop.</strong> Every Sunday morning it reads
              Instacart&apos;s real prices{cheapest && priciest ? ` — this week my list was $${cheapest[1].toFixed(0)} at ${cheapest[0]} and $${priciest[1].toFixed(0)} at ${priciest[0]}` : ''}.
              Pick the cheapest, or let it split the list between two stores.
            </Text>
            <Text style={bullet}>
              <strong>It plans around the sales.</strong> Snap a photo of the flyer (or text it to DinnerDrop) and
              the week is built around what&apos;s on sale.
            </Text>
            <Text style={bullet}>
              <strong>It actually feeds your family.</strong> Portions are sized to the number of people you set,
              with real per-person amounts — not &ldquo;serves 4&rdquo; stretched to seven.
            </Text>
            <Text style={bullet}>
              <strong>The whole shop rides in one cart.</strong> Fruit, snacks, lunches, the dog&apos;s food — tap
              and it goes on the same list, into the same Instacart cart.
            </Text>
            <Text style={bullet}>
              <strong>Your family votes by text.</strong> DinnerDrop texts the week&apos;s ideas to everyone; they
              reply &ldquo;1 3 5&rdquo;; the week builds itself. It also texts them the day before shopping to ask
              if they want anything.
            </Text>
            <Section style={ctaSection}>
              <Button style={button} href={loginUrl}>
                Plan this week&apos;s dinners →
              </Button>
            </Section>
            <Text style={smallNote}>
              No password — enter your email and we send a one-tap sign-in link. About two minutes to your first list.
            </Text>
            <Text style={paragraph}>
              <strong>As a founding family, the Family plan is yours free through October 2027</strong> — the texting,
              per-person profiles and reminders included. Nothing to enter, it&apos;s already on your account.
            </Text>
            <Hr style={hr} />
            <Text style={heading}>One favor</Text>
            <Text style={paragraph}>
              Do one week. Then hit reply and tell me two things: what the order came to, and the one thing that
              annoyed you. I read every reply myself, and the annoying thing usually gets fixed the same week.
            </Text>
            <Text style={paragraph}>— Sarah, founder of DinnerDrop</Text>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>
              <Link href="https://www.dinnerdrop.app" style={footerLink}>dinnerdrop.app</Link>
              {' · '}
              <Link href={unsubscribeUrl} style={footerLink}>Unsubscribe</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', maxWidth: '600px', borderRadius: '8px', overflow: 'hidden', marginTop: '40px', marginBottom: '40px' }
const header = { backgroundColor: '#1a5c38', padding: '24px 32px' }
const logo = { color: '#e8a838', fontSize: '24px', fontWeight: '700', margin: '0' }
const body = { padding: '32px' }
const paragraph = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }
const bullet = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 12px', paddingLeft: '14px', borderLeft: '3px solid #e8a838' }
const heading = { color: '#1a5c38', fontSize: '18px', fontWeight: '600', lineHeight: '1.4', margin: '24px 0 12px' }
const ctaSection = { margin: '28px 0 12px', textAlign: 'center' as const }
const button = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const smallNote = { color: '#6b7280', fontSize: '13px', lineHeight: '1.5', margin: '0 0 20px', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
