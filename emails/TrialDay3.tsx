import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface TrialDay3Props {
  firstName?: string
  unsubscribeUrl?: string
}

export default function TrialDay3({
  firstName = 'there',
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
}: TrialDay3Props) {
  return (
    <Html>
      <Head />
      <Preview>A quick check-in + one feature you might have missed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              You're three days into your DinnerDrop beta — which means you've probably already
              had a few dinners handled for you. 🎉
            </Text>
            <Text style={paragraph}>We just wanted to check in.</Text>
            <Text style={heading}>Here's what most families discover by Day 3:</Text>
            <Text style={paragraph}>
              The best part isn't the meal plan itself — it's the grocery list. Everything is
              organized, deduplicated, and ready to drop straight into your Instacart cart in one tap.
            </Text>
            <Text style={heading}>Have you tried the Instacart hand-off yet?</Text>
            <Text style={paragraph}>
              After DinnerDrop generates your meal plan, head to <strong>Grocery List</strong> and
              tap the <strong>"Send to Instacart"</strong> button. Your full week's groceries land
              in your Instacart cart, pre-loaded and ready to check out. Kroger cart push is
              also available if you've linked your Kroger account.
            </Text>
            <Section style={ctaSection}>
              <Button style={button} href="https://dinnerdrop.app/grocery-list">
                Try the grocery list now →
              </Button>
            </Section>
            <Hr style={hr} />
            <Text style={quoteText}>
              <em>"I used to spend 20 minutes every Sunday figuring out what to make. Now I just
              open DinnerDrop on my phone while I have coffee."</em>
              <br />— Early beta user
            </Text>
            <Hr style={hr} />
            <Text style={paragraph}>
              If you have any questions or something isn't working right, just reply to this email.
              We read every response.
            </Text>
            <Text style={paragraph}>Enjoy your dinners,<br /><strong>The DinnerDrop Team</strong></Text>
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
const heading = { color: '#1a5c38', fontSize: '18px', fontWeight: '600', lineHeight: '1.4', margin: '24px 0 12px' }
const ctaSection = { margin: '28px 0', textAlign: 'center' as const }
const button = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const quoteText = { color: '#6b7280', fontSize: '15px', fontStyle: 'italic', lineHeight: '1.6', margin: '0 0 16px', paddingLeft: '16px', borderLeft: '3px solid #e8a838' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
