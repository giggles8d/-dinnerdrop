import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface ActivateDay3Props {
  firstName?: string
  unsubscribeUrl?: string
}

// Activation email #2 — sent 3 days after signup to users who still haven't
// generated a plan. Angle: the 5pm problem they signed up to solve.
export default function ActivateDay3({
  firstName = 'there',
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
}: ActivateDay3Props) {
  return (
    <Html>
      <Head />
      <Preview>What&apos;s for dinner tonight? (We already answered that.)</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              It&apos;s almost 5pm somewhere — which means somebody in your house is about
              to ask the question.
            </Text>
            <Text style={paragraph}>
              <strong>&ldquo;What&apos;s for dinner?&rdquo;</strong>
            </Text>
            <Text style={paragraph}>
              That&apos;s the exact moment DinnerDrop was built for. Open your dashboard and
              you&apos;ll have 5 weeknight dinners — with a complete grocery list — in about
              30 seconds. Every meal under 30 minutes, built around a weekly budget.
            </Text>
            <Section style={ctaSection}>
              <Button style={button} href="https://dinnerdrop.app/dashboard">
                Answer the dinner question →
              </Button>
            </Section>
            <Text style={heading}>Make it yours in 2 minutes</Text>
            <Text style={paragraph}>
              Once you&apos;ve seen your first plan, tap <strong>Personalize</strong> — tell us
              your family size, budget, and what flavors your crew loves, and every plan
              after that is built for your exact household.
            </Text>
            <Hr style={hr} />
            <Text style={paragraph}>
              Questions? Reply to this email — I read every one.
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
const heading = { color: '#1a5c38', fontSize: '18px', fontWeight: '600', lineHeight: '1.4', margin: '24px 0 12px' }
const ctaSection = { margin: '28px 0', textAlign: 'center' as const }
const button = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
