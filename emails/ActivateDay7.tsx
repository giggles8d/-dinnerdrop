import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface ActivateDay7Props {
  firstName?: string
  unsubscribeUrl?: string
}

// Activation email #3 — sent 7 days after signup, last nudge in the sequence.
// Honest founder note + the founding-family hook.
export default function ActivateDay7({
  firstName = 'there',
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
}: ActivateDay7Props) {
  return (
    <Html>
      <Head />
      <Preview>60 seconds, one grocery list, your week back</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              A week ago you signed up for DinnerDrop, and I&apos;m guessing life got in
              the way — that&apos;s exactly the problem we&apos;re trying to solve.
            </Text>
            <Text style={paragraph}>
              So here&apos;s the whole pitch, one last time: give us 60 seconds and
              you&apos;ll walk away with <strong>5 weeknight dinners and a complete grocery
              list</strong>, planned around your budget. That&apos;s the entire ask.
            </Text>
            <Section style={ctaSection}>
              <Button style={button} href="https://dinnerdrop.app/dashboard">
                Get my week of dinners →
              </Button>
            </Section>
            <Text style={paragraph}>
              And because you joined during our founding-family window, everything is
              free for you — no card, no catch. You&apos;re helping us build this; the
              least we can do is plan your dinners.
            </Text>
            <Hr style={hr} />
            <Text style={paragraph}>
              If DinnerDrop isn&apos;t for you, no hard feelings — the unsubscribe link is
              below and we won&apos;t keep nudging. But if dinner is still a nightly
              scramble, we&apos;d love another shot.
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
