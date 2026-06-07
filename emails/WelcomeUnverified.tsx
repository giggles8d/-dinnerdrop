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

interface WelcomeUnverifiedProps {
  unsubscribeUrl?: string
}

export default function WelcomeUnverified({
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
}: WelcomeUnverifiedProps) {
  return (
    <Html>
      <Head />
      <Preview>Thanks for signing up — check your inbox for the verification link</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>

          <Section style={body}>
            <Text style={paragraph}>Hi there,</Text>
            <Text style={paragraph}>
              Thanks for starting your DinnerDrop signup! You&apos;re one step away from your
              6 free months.
            </Text>
            <Text style={paragraph}>
              <strong>What to do next:</strong> Look for a second email from us (it comes from{' '}
              <code style={code}>noreply@mail.app.supabase.io</code> because that&apos;s our
              authentication provider). Click the link in that email to verify your address,
              then your 6 free months are locked in.
            </Text>

            <Section style={ctaBox}>
              <Text style={ctaBoxHeading}>📬 Heads up — check spam too</Text>
              <Text style={ctaBoxText}>
                The verification email sometimes lands there. If you find it, please mark it as
                &ldquo;Not Spam&rdquo; so future DinnerDrop emails reach you.
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={heading}>Why we use email verification:</Text>
            <Text style={paragraph}>
              We confirm your email so no one can sign up using someone else&apos;s address.
              Takes 30 seconds and protects your spot.
            </Text>

            <Text style={paragraph}>
              Once verified, you&apos;ll go through a 2-minute quiz so we know your family
              size, dietary needs, and budget, then your first weekly meal plan is ready.
            </Text>

            <Hr style={hr} />

            <Text style={smallText}>
              <strong>Stuck?</strong> Reply to this email directly and Sarah (the solo founder)
              will help you finish signing up.
            </Text>

            <Text style={paragraph}>
              See you on the inside,
              <br />
              <strong>The DinnerDrop team</strong>
            </Text>
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
const heading = { color: '#1a5c38', fontSize: '18px', fontWeight: '600', lineHeight: '1.4', margin: '24px 0 16px' }
const code = { backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '14px', color: '#1a5c38' }
const ctaBox = { backgroundColor: '#fef9ee', border: '1px solid #e8a838', borderRadius: '8px', padding: '16px 20px', margin: '20px 0' }
const ctaBoxHeading = { color: '#1a5c38', fontSize: '15px', fontWeight: '700', margin: '0 0 6px' }
const ctaBoxText = { color: '#4b5563', fontSize: '14px', lineHeight: '1.5', margin: '0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const smallText = { color: '#4b5563', fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0 0 4px', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
