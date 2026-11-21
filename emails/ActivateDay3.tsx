import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface ActivateDay3Props {
  firstName?: string
  unsubscribeUrl?: string
  shopUrl?: string
  dinners?: string[]
}

// Activation email #2 — sent 3 days after signup to families who haven't sent a list yet.
// Angle (Nov 21 2026 review): swap a dinner, then send — these families haven't shopped yet, so the cart comes
// first; family texting (Oct 31 angle) moves to a short P.S.
export default function ActivateDay3({
  firstName = 'there',
  unsubscribeUrl = 'https://www.dinnerdrop.app/unsubscribe',
  shopUrl,
  dinners = [],
}: ActivateDay3Props) {
  return (
    <Html>
      <Head />
      <Preview>Then the whole list goes to Instacart or Walmart in one tap.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              Your dinners for the week are still planned{dinners.length ? ':' : '.'}
            </Text>
            {dinners.length > 0 && (
              <Text style={{ ...paragraph, margin: '0 0 16px 8px' }}>
                {dinners.slice(0, 7).map((d, i) => <React.Fragment key={i}>• {d}<br /></React.Fragment>)}
              </Text>
            )}
            <Text style={paragraph}>
              Not feeling one of them? Swap it in one tap for something your family will actually eat. Then the whole
              grocery list goes to your Instacart or Walmart cart, every item matched.
            </Text>
            <Section style={ctaSection}>
              <Button style={button} href="https://www.dinnerdrop.app/dashboard?utm_source=email&utm_medium=activation&utm_campaign=day3-swap">
                Swap a dinner →
              </Button>
            </Section>
            {shopUrl && (
              <Text style={{ ...paragraph, textAlign: 'center' as const }}>
                Happy with them? <Link href={shopUrl} style={{ color: '#1a5c38', fontWeight: 700 }}>Send my groceries to Instacart →</Link>
              </Text>
            )}
            <Text style={paragraph}>
              <em>P.S. Want the family to pick? Add their numbers and DinnerDrop texts everyone the dinner ideas to vote on,
              and anyone can text &ldquo;ADD milk&rdquo; to the list. <Link href="https://www.dinnerdrop.app/dashboard?texting=1&utm_source=email&utm_medium=activation&utm_campaign=day3-texting" style={{ color: '#1a5c38' }}>Set it up in a minute</Link>.</em>
            </Text>
            <Hr style={hr} />
            <Text style={paragraph}>
              Questions? Reply to this email — I read every one.
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
