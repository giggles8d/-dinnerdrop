import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface TrialDay7Props {
  firstName?: string
  unsubscribeUrl?: string
}

export default function TrialDay7({
  firstName = 'there',
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
}: TrialDay7Props) {
  return (
    <Html>
      <Head />
      <Preview>Keep your meal plan + grocery list — upgrade in 30 seconds</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={urgencyBanner}>
            <Text style={urgencyText}>⏰ Trial expires tonight</Text>
          </Section>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>Your 7-day free trial ends in <strong>a few hours</strong>.</Text>
            <Text style={paragraph}>
              After that, your DinnerDrop account will be paused and your meal plans will be archived.
            </Text>
            <Text style={upgradeStatement}>Upgrade now and keep everything — $9/month, cancel anytime.</Text>
            <Section style={ctaSection}>
              <Button style={button} href="https://dinnerdrop.app/subscribe">Complete my upgrade now →</Button>
            </Section>
            <Hr style={hr} />
            <Section style={fenceSection}>
              <Text style={fenceHeading}>Still on the fence? Here's the honest version:</Text>
              <Text style={fenceText}>
                DinnerDrop isn't for everyone. If you only need a meal plan once in a while, the
                free trial was probably enough.
              </Text>
              <Text style={fenceText}>
                But if the past week felt easier — if you opened the app instead of staring at the
                fridge, if your grocery run was faster, if dinner just <em>happened</em> — then
                $9/month is a pretty easy call.
              </Text>
              <Text style={fenceText}>Most families who cancel say the same thing: <em>"I wish I'd kept it."</em></Text>
            </Section>
            <Hr style={hr} />
            <Text style={benefitsHeading}>What you get at $9/month:</Text>
            <Text style={benefitItem}>→ Weekly AI dinner plans (personalized to your family size and preferences)</Text>
            <Text style={benefitItem}>→ Auto-generated grocery lists with store handoff</Text>
            <Text style={benefitItem}>→ Unlimited meal regeneration — don't like a suggestion? Swap it</Text>
            <Text style={benefitItem}>→ New plans every week, never the same twice</Text>
            <Text style={benefitItem}>→ Priority support</Text>
            <Section style={ctaSection}>
              <Button style={button} href="https://dinnerdrop.app/subscribe">Upgrade before my trial expires →</Button>
            </Section>
            <Hr style={hr} />
            <Text style={paragraph}>
              If you have a reason you're not upgrading, reply to this email. We'd genuinely like
              to know — and we'll do our best to help.
            </Text>
            <Text style={paragraph}><strong>The DinnerDrop Team</strong></Text>
            <Text style={psText}>
              P.S. — If the timing just isn't right, no hard feelings. Your account will be here when you're ready.
            </Text>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>
              <Link href="https://dinnerdrop.app" style={footerLink}>Manage your account</Link>
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
const urgencyBanner = { backgroundColor: '#fee2e2', padding: '12px 24px', borderBottom: '1px solid #fca5a5' }
const urgencyText = { color: '#991b1b', fontSize: '14px', fontWeight: '700', margin: '0', textAlign: 'center' as const }
const header = { backgroundColor: '#1a5c38', padding: '24px 32px' }
const logo = { color: '#e8a838', fontSize: '24px', fontWeight: '700', margin: '0' }
const body = { padding: '32px' }
const paragraph = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }
const upgradeStatement = { color: '#1a5c38', fontSize: '20px', fontWeight: '700', lineHeight: '1.4', margin: '24px 0 20px', textAlign: 'center' as const }
const ctaSection = { margin: '24px 0', textAlign: 'center' as const }
const button = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const fenceSection = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '24px', margin: '0 0 8px' }
const fenceHeading = { color: '#374151', fontSize: '17px', fontWeight: '600', lineHeight: '1.4', margin: '0 0 12px' }
const fenceText = { color: '#6b7280', fontSize: '15px', lineHeight: '1.6', margin: '0 0 12px' }
const benefitsHeading = { color: '#1a5c38', fontSize: '17px', fontWeight: '600', lineHeight: '1.4', margin: '0 0 12px' }
const benefitItem = { color: '#374151', fontSize: '15px', lineHeight: '1.6', margin: '0 0 8px' }
const psText = { color: '#9ca3af', fontSize: '14px', fontStyle: 'italic', lineHeight: '1.5', margin: '16px 0 0' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
