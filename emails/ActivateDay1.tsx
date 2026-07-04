import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface ActivateDay1Props {
  firstName?: string
  unsubscribeUrl?: string
}

// Activation email #1 — sent 1 day after signup to users who haven't
// generated a meal plan yet. One job: get them back to the dashboard,
// where their first plan now auto-generates.
export default function ActivateDay1({
  firstName = 'there',
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
}: ActivateDay1Props) {
  return (
    <Html>
      <Head />
      <Preview>Your 5 dinners for this week are one tap away</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              You signed up for DinnerDrop yesterday — and your first week of dinners
              is sitting there waiting for you.
            </Text>
            <Text style={paragraph}>
              No quiz, no setup. Open your dashboard and our AI builds{' '}
              <strong>5 weeknight dinners</strong> around a family budget while you watch —
              takes about 30 seconds.
            </Text>
            <Section style={ctaSection}>
              <Button style={button} href="https://dinnerdrop.app/dashboard">
                Show me my dinners →
              </Button>
            </Section>
            <Text style={paragraph}>
              From there it&apos;s one more tap to a full, deduplicated grocery list —
              organized by aisle, budget-tracked, ready for the store.
            </Text>
            <Hr style={hr} />
            <Text style={paragraph}>
              Stuck on anything? Just reply to this email — it comes straight to me.
            </Text>
            <Text style={paragraph}>— Sarah, founder of DinnerDrop</Text>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>
              <Link href="https://dinnerdrop.app/account" style={footerLink}>Manage your account</Link>
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
