import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface WinBackProps {
  firstName?: string
  unsubscribeUrl?: string
  amazonPickUrl?: string
}

// One-shot win-back email (July 2026) to every signup who never generated a
// plan. Sent via /api/admin/winback. Key promises must be TRUE at send time:
// dashboard auto-generates the first plan (P1 deploy) and login is one-click
// magic link.
export default function WinBack({
  firstName = 'there',
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
  amazonPickUrl = 'https://www.amazon.com/s?k=nonstick+sheet+pan+set&tag=dinnerdrop-20',
}: WinBackProps) {
  return (
    <Html>
      <Head />
      <Preview>We rebuilt DinnerDrop — your week of dinners now takes 30 seconds</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              You signed up for DinnerDrop a little while back, and honestly? The version
              you saw made you work too hard before showing you anything good. That was
              our mistake, and we fixed it.
            </Text>
            <Text style={heading}>Here&apos;s what&apos;s different now</Text>
            <Text style={paragraph}>
              Sign in and your first week of dinners <strong>builds itself</strong> —
              5 weeknight meals, every one under 30 minutes, planned around a family
              budget, with a complete grocery list organized by aisle. No quiz, no setup.
              About 30 seconds, start to finish.
            </Text>
            <Section style={ctaSection}>
              <Button style={button} href="https://dinnerdrop.app/login">
                See my week of dinners →
              </Button>
            </Section>
            <Text style={smallNote}>
              No password needed — enter your email and we&apos;ll send you a one-click
              sign-in link.
            </Text>
            <Text style={paragraph}>
              And you&apos;re one of our founding families, so everything is still{' '}
              <strong>completely free for 6 months</strong>. No card, no catch — you were
              here first, and that promise stands.
            </Text>
            <Hr style={hr} />
            <Text style={heading}>One thing worth owning this week 🍳</Text>
            <Text style={paragraph}>
              Half the dinners we plan land on a sheet pan — it&apos;s the fastest,
              lowest-cleanup way to cook for a family. If yours is warped and sticky,{' '}
              <Link href={amazonPickUrl} style={inlineLink}>a basic nonstick sheet-pan set</Link>{' '}
              (~$20) is the single best kitchen upgrade we know.
            </Text>
            <Text style={disclosure}>
              As an Amazon Associate, DinnerDrop earns from qualifying purchases.
            </Text>
            <Hr style={hr} />
            <Text style={paragraph}>
              If dinner&apos;s still the hardest part of your day, give us 30 seconds —
              that&apos;s the whole ask. And if anything&apos;s broken or confusing, reply
              to this email. It comes straight to me.
            </Text>
            <Text style={paragraph}>— Sarah, founder of DinnerDrop</Text>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>
              <Link href="https://dinnerdrop.app" style={footerLink}>dinnerdrop.app</Link>
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
const ctaSection = { margin: '28px 0 12px', textAlign: 'center' as const }
const button = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const smallNote = { color: '#6b7280', fontSize: '13px', lineHeight: '1.5', margin: '0 0 20px', textAlign: 'center' as const }
const inlineLink = { color: '#1a5c38', textDecoration: 'underline', fontWeight: '600' }
const disclosure = { color: '#9ca3af', fontSize: '12px', lineHeight: '1.5', margin: '0 0 16px' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
