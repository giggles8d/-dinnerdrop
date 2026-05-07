import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface WelcomeBetaProps {
  firstName?: string
  trialEndsDate?: string
  unsubscribeUrl?: string
}

export default function WelcomeBeta({
  firstName = 'there',
  trialEndsDate = 'in 7 days',
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
}: WelcomeBetaProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to DinnerDrop — your first meal plan is ready</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>

          {/* Beta badge */}
          <Section style={badgeSection}>
            <Text style={badge}>🎉 BETA MEMBER — 6 months completely free</Text>
          </Section>

          {/* Body */}
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              You're in. Welcome to the DinnerDrop beta — and thank you for being one of the first
              100 families to trust us with your dinner table.
            </Text>
            <Text style={paragraph}>
              Your 7-day free trial is now active (trial ends {trialEndsDate}), and your 6-month
              beta membership is already locked in. You won't be charged anything for 6 months.
            </Text>

            <Hr style={hr} />

            <Text style={heading}>Here's how to get your first meal plan in 3 minutes:</Text>

            <div style={stepRow}>
              <Text style={stepNumber}>01</Text>
              <div style={stepContent}>
                <Text style={stepTitle}>Complete your family profile</Text>
                <Text style={stepDesc}>
                  Tell us your family size, budget, dietary needs, and cook time. Takes 2 minutes
                  and makes every meal plan actually work for your life.
                </Text>
              </div>
            </div>

            <div style={stepRow}>
              <Text style={stepNumber}>02</Text>
              <div style={stepContent}>
                <Text style={stepTitle}>Generate your first week of dinners</Text>
                <Text style={stepDesc}>
                  Tap "Generate plan" — AI will build 5 budget-friendly meals your family
                  will want to eat. Takes about 20 seconds.
                </Text>
              </div>
            </div>

            <div style={stepRow}>
              <Text style={stepNumber}>03</Text>
              <div style={stepContent}>
                <Text style={stepTitle}>Send your grocery list to your store</Text>
                <Text style={stepDesc}>
                  One tap sends your full, organized grocery list to Walmart, Amazon Fresh,
                  Instacart, or your preferred store. No more copying items by hand.
                </Text>
              </div>
            </div>

            <Section style={ctaSection}>
              <Button style={button} href="https://dinnerdrop.app/dashboard">
                Get my first meal plan →
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={heading}>What beta members told us to tell you:</Text>
            <Text style={quoteText}>
              <em>
                "The grocery handoff saved me 25 minutes on my first trip. I thought it was a
                gimmick — it's not."
              </em>
              <br />— Beta member, family of 4
            </Text>

            <Hr style={hr} />

            <Text style={smallText}>
              <strong>A note from Sarah:</strong> I built DinnerDrop because I was doing the
              dinner-decision math every Sunday and failing it every time. You're not just a beta
              user — you're helping shape what this product becomes. If anything doesn't work
              perfectly, please reply to this email. I read every message.
            </Text>

            <Text style={paragraph}>
              Enjoy your dinners,
              <br />
              <strong>Sarah at DinnerDrop</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Your beta access is confirmed and locked in. You won't be charged for 6 months.
            </Text>
            <Text style={footerText}>
              <Link href="https://dinnerdrop.app/dashboard" style={footerLink}>
                Go to dashboard
              </Link>
              {' · '}
              <Link href="https://dinnerdrop.app/privacy" style={footerLink}>
                Privacy
              </Link>
              {' · '}
              <Link href={unsubscribeUrl} style={footerLink}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  marginTop: '40px',
  marginBottom: '40px',
}
const header = { backgroundColor: '#1a5c38', padding: '24px 32px' }
const logo = { color: '#e8a838', fontSize: '24px', fontWeight: '700', margin: '0' }
const badgeSection = { backgroundColor: '#e8a838', padding: '10px 32px' }
const badge = {
  color: '#1a5c38',
  fontSize: '13px',
  fontWeight: '700',
  margin: '0',
  textAlign: 'center' as const,
  letterSpacing: '0.03em',
}
const body = { padding: '32px' }
const paragraph = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }
const heading = {
  color: '#1a5c38',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.4',
  margin: '24px 0 16px',
}
const stepRow = { display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'flex-start' }
const stepNumber = {
  color: '#e8a838',
  fontSize: '28px',
  fontWeight: '800',
  lineHeight: '1',
  margin: '0',
  minWidth: '36px',
}
const stepContent = { flex: '1' }
const stepTitle = { color: '#111827', fontSize: '15px', fontWeight: '600', margin: '0 0 4px' }
const stepDesc = { color: '#6b7280', fontSize: '14px', lineHeight: '1.5', margin: '0' }
const ctaSection = { margin: '28px 0', textAlign: 'center' as const }
const button = {
  backgroundColor: '#1a5c38',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 32px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const quoteText = {
  color: '#6b7280',
  fontSize: '15px',
  fontStyle: 'italic' as const,
  lineHeight: '1.6',
  margin: '0 0 16px',
  paddingLeft: '16px',
  borderLeft: '3px solid #e8a838',
}
const smallText = {
  color: '#4b5563',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 20px',
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
}
const footerSection = {
  backgroundColor: '#f9fafb',
  padding: '20px 32px',
  borderTop: '1px solid #e5e7eb',
}
const footerText = {
  color: '#9ca3af',
  fontSize: '13px',
  margin: '0 0 4px',
  textAlign: 'center' as const,
}
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
