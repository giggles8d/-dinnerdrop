import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface TrialDay6Props {
  firstName?: string
  nextBillingDate?: string
  unsubscribeUrl?: string
}

export default function TrialDay6({
  firstName = 'there',
  nextBillingDate = 'one week from today',
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
}: TrialDay6Props) {
  return (
    <Html>
      <Head />
      <Preview>Here's what you'll keep when you upgrade to full access</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={urgencyBanner}>
            <Text style={urgencyText}>⏰ Your trial ends in 24 hours</Text>
          </Section>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>Your DinnerDrop free trial ends tomorrow.</Text>
            <Text style={paragraph}>Over the past six days, you've had access to:</Text>
            <Text style={checkItem}>✅ AI-generated weekly dinner plans tailored to your family</Text>
            <Text style={checkItem}>✅ Automatic grocery lists organized by store section</Text>
            <Text style={checkItem}>✅ One-tap grocery handoff to your preferred store</Text>
            <Text style={checkItem}>✅ New meal suggestions every week — no repeats</Text>
            <Text style={paragraph}>
              After your trial ends, your account will be paused. Any meal plans you've saved will
              be waiting for you if you decide to come back.
            </Text>
            <Text style={valueStatement}>
              Keep all of it for $9/month — that's less than one takeout order.
            </Text>
            <Section style={ctaSection}>
              <Button style={primaryButton} href="https://dinnerdrop.app/subscribe?utm_source=email&utm_medium=email&utm_campaign=trial_day6">
                Upgrade to full access →
              </Button>
            </Section>
            <Text style={paragraph}>
              No long-term commitment. Cancel anytime. Your next billing date would be{' '}
              <strong>{nextBillingDate}</strong>.
            </Text>
            <Hr style={hr} />
            <Text style={heading}>Why families stick with DinnerDrop:</Text>
            <Text style={paragraph}>
              The average American family spends 43 minutes per day deciding what to eat.
              DinnerDrop cuts that to under 2 minutes — and eliminates the 6pm "what's for dinner?"
              spiral entirely.
            </Text>
            <Text style={paragraph}>At $9/month, that's <strong>$0.30 per day</strong> to have dinner handled.</Text>
            <Section style={ctaSection}>
              <Button style={secondaryButton} href="https://dinnerdrop.app/subscribe?utm_source=email&utm_medium=email&utm_campaign=trial_day6">
                Continue my subscription →
              </Button>
            </Section>
            <Hr style={hr} />
            <Text style={paragraph}>Questions? Just reply — we're here.</Text>
            <Text style={paragraph}><strong>The DinnerDrop Team</strong></Text>
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
const urgencyBanner = { backgroundColor: '#fef3c7', padding: '12px 24px', borderBottom: '1px solid #fbbf24' }
const urgencyText = { color: '#92400e', fontSize: '14px', fontWeight: '600', margin: '0', textAlign: 'center' as const }
const header = { backgroundColor: '#1a5c38', padding: '24px 32px' }
const logo = { color: '#e8a838', fontSize: '24px', fontWeight: '700', margin: '0' }
const body = { padding: '32px' }
const paragraph = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }
const heading = { color: '#1a5c38', fontSize: '18px', fontWeight: '600', lineHeight: '1.4', margin: '24px 0 12px' }
const checkItem = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 8px' }
const valueStatement = { color: '#1a5c38', fontSize: '20px', fontWeight: '700', lineHeight: '1.4', margin: '24px 0 20px', textAlign: 'center' as const }
const ctaSection = { margin: '24px 0', textAlign: 'center' as const }
const primaryButton = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const secondaryButton = { backgroundColor: '#1a5c38', borderRadius: '6px', color: '#ffffff', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
