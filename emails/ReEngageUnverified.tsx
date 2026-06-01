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

interface ReEngageProps {
  firstName?: string
  betaSpotsRemaining?: number
  unsubscribeUrl?: string
}

export default function ReEngageUnverified({
  firstName = 'there',
  betaSpotsRemaining = 99,
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
}: ReEngageProps) {
  return (
    <Html>
      <Head />
      <Preview>You started signing up for DinnerDrop — finish here and lock in your 6 months free</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>

          <Section style={badgeSection}>
            <Text style={badge}>{betaSpotsRemaining} BETA SPOTS LEFT — 6 MONTHS FREE</Text>
          </Section>

          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              You started signing up for DinnerDrop a few days ago but never confirmed your email,
              so your beta spot isn&apos;t locked in yet.
            </Text>
            <Text style={paragraph}>
              I&apos;m emailing you directly so this doesn&apos;t end up in spam like the last one
              might have. We hold a beta spot for 14 days after you sign up — yours is still available.
            </Text>

            <Hr style={hr} />

            <Text style={heading}>What you get for free for 6 months:</Text>
            <Text style={bulletItem}>
              ✓ AI plans 5 weeknight dinners for your family in 30 seconds
            </Text>
            <Text style={bulletItem}>
              ✓ Full grocery list, auto-deduplicated and organized
            </Text>
            <Text style={bulletItem}>
              ✓ One tap sends the whole list to your Instacart cart
            </Text>
            <Text style={bulletItem}>
              ✓ Works around picky eaters, dietary needs, your budget
            </Text>

            <Section style={ctaSection}>
              <Button style={button} href="https://dinnerdrop.app/signup?beta=1&utm_source=resend&utm_campaign=re_engage_v1">
                Finish my signup →
              </Button>
              <Text style={ctaSubtext}>No credit card · 6 months free · Cancel anytime</Text>
            </Section>

            <Hr style={hr} />

            <Text style={smallText}>
              <strong>From Sarah, the solo founder:</strong> If anything in the signup flow was confusing
              or broken, just reply to this email and tell me. I built DinnerDrop because I was doing
              the &ldquo;what&apos;s for dinner&rdquo; math every Sunday and failing it. Your feedback
              shapes the product directly.
            </Text>

            <Text style={paragraph}>
              Hoping to feed your family soon,
              <br />
              <strong>Sarah at DinnerDrop</strong>
            </Text>
          </Section>

          <Section style={footerSection}>
            <Text style={footerText}>
              You&apos;re receiving this because you started a DinnerDrop signup but never verified
              your email. We won&apos;t email you again unless you complete signup.
            </Text>
            <Text style={footerText}>
              <Link href="https://dinnerdrop.app" style={footerLink}>dinnerdrop.app</Link>
              {' · '}
              <Link href={unsubscribeUrl} style={footerLink}>Don&apos;t email me again</Link>
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
const badgeSection = { backgroundColor: '#e8a838', padding: '10px 32px' }
const badge = { color: '#1a5c38', fontSize: '13px', fontWeight: '700', margin: '0', textAlign: 'center' as const, letterSpacing: '0.05em' }
const body = { padding: '32px' }
const paragraph = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }
const heading = { color: '#1a5c38', fontSize: '18px', fontWeight: '600', lineHeight: '1.4', margin: '24px 0 16px' }
const bulletItem = { color: '#374151', fontSize: '15px', lineHeight: '1.6', margin: '0 0 8px' }
const ctaSection = { margin: '28px 0', textAlign: 'center' as const }
const ctaSubtext = { color: '#9ca3af', fontSize: '13px', margin: '12px 0 0' }
const button = { backgroundColor: '#1a5c38', borderRadius: '6px', color: '#ffffff', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 32px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const smallText = { color: '#4b5563', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0 0 4px', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
