import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface ActivateDay3Props {
  firstName?: string
  unsubscribeUrl?: string
}

// Activation email #2 — sent 3 days after signup to families who haven't opened the list yet.
// Angle (Oct 31 2026): family texting — the feature almost nobody finds in Settings.
export default function ActivateDay3({
  firstName = 'there',
  unsubscribeUrl = 'https://www.dinnerdrop.app/unsubscribe',
}: ActivateDay3Props) {
  return (
    <Html>
      <Head />
      <Preview>Text the family the week&apos;s dinners — they vote, you shop once</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              Here&apos;s the part of DinnerDrop most families don&apos;t find on their own, and it&apos;s the
              part that ends the &ldquo;what&apos;s for dinner?&rdquo; texts for good.
            </Text>
            <Text style={heading}>Let the family pick — by text</Text>
            <Text style={paragraph}>
              Add a couple of phone numbers and DinnerDrop texts everyone the week&apos;s dinner options.
              They reply with numbers. The top picks become the week. No group chat, no app for them to install.
            </Text>
            <Text style={paragraph}>
              <strong>Anyone can text &ldquo;ADD milk&rdquo;</strong> and it lands on the grocery list.
              And right before you order, one tap sends everyone a <strong>&ldquo;last call&rdquo;</strong> —
              &ldquo;ordering in 20 minutes, need anything?&rdquo; Their replies go straight onto the list.
            </Text>
            <Section style={ctaSection}>
              <Button style={button} href="https://www.dinnerdrop.app/dashboard?texting=1&utm_source=email&utm_medium=activation&utm_campaign=day3-texting">
                Set up family texting (1 minute) →
              </Button>
            </Section>
            <Text style={paragraph}>
              It&apos;s part of the Family plan — 14 days free, cancel in one tap. Your grocery list and this
              week&apos;s dinners are still waiting on your dashboard either way.
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
const heading = { color: '#1a5c38', fontSize: '18px', fontWeight: '600', lineHeight: '1.4', margin: '24px 0 12px' }
const ctaSection = { margin: '28px 0', textAlign: 'center' as const }
const button = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
