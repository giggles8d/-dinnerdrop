import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface ActivateDay3Props {
  firstName?: string
  unsubscribeUrl?: string
  shopUrl?: string
  /** The no-sign-in list (/list), the main button for in-store families. */
  listUrl?: string
  inStore?: boolean
  dinners?: string[]
}

// Activation email #2 — sent 3 days after signup to every family that hasn't sent a list yet (since Nov 22 2026,
// also the ones who opened a recipe or the list: they are the ones closest to sending).
// Nov 22 2026 review, Part 6 fix 1 (Sarah approved): the main button is the one-tap send, no sign-in. "Swap a dinner"
// (a sign-in page) is a small link under it. The texting P.S. is gone: one job per email.
const SWAP = 'https://www.dinnerdrop.app/dashboard?utm_source=email&utm_medium=activation&utm_campaign=day3-swap'

export default function ActivateDay3({
  firstName = 'there',
  unsubscribeUrl = 'https://www.dinnerdrop.app/unsubscribe',
  shopUrl,
  listUrl,
  inStore = false,
  dinners = [],
}: ActivateDay3Props) {
  const mainHref = inStore ? (listUrl ?? shopUrl ?? SWAP) : (shopUrl ?? listUrl ?? SWAP)
  return (
    <Html>
      <Head />
      <Preview>{inStore ? 'It’s sorted by aisle. Open it on your phone in the store, no sign-in.' : 'One tap puts it in your Instacart cart. You see the total and check out there.'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              Your dinners for this week are planned{dinners.length ? ':' : '.'}
            </Text>
            {dinners.length > 0 && (
              <Text style={{ ...paragraph, margin: '0 0 16px 8px' }}>
                {dinners.slice(0, 7).map((d, i) => <React.Fragment key={i}>• {d}<br /></React.Fragment>)}
              </Text>
            )}
            {inStore ? (
              <Text style={paragraph}>
                The grocery list is built and sorted by aisle. Tap below to open it on your phone in the store and check
                items off as you go. No sign-in needed. Want a different dinner first? Swap it and the list updates.
              </Text>
            ) : (
              <Text style={paragraph}>
                The grocery list is built. Tap below and it goes into your Instacart cart. You see the total, remove
                anything you have, and check out there. Want a different dinner first? Swap it and the list updates.
              </Text>
            )}
            <Section style={ctaSection}>
              <Button style={button} href={mainHref}>
                {inStore ? 'Open my grocery list' : 'Send my groceries to Instacart'}
              </Button>
              <Text style={{ ...paragraph, textAlign: 'center' as const, marginTop: '10px' }}>
                <Link href={SWAP} style={{ color: '#1a5c38', textDecoration: 'underline' }}>Swap a dinner first</Link>
              </Text>
            </Section>
            <Hr style={hr} />
            <Text style={paragraph}>
              Stuck on anything? Reply here. It goes to my inbox and I answer myself.
            </Text>
            <Text style={paragraph}>— Sarah, founder of DinnerDrop</Text>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>
              <Link href="https://www.dinnerdrop.app/account" style={footerLink}>Manage your account</Link>
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
const ctaSection = { margin: '28px 0', textAlign: 'center' as const }
const button = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
