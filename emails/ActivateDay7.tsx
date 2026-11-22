import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface ActivateDay7Props {
  firstName?: string
  unsubscribeUrl?: string
  shopUrl?: string
  /** The no-sign-in list (/list), the main button for in-store families. */
  listUrl?: string
  inStore?: boolean
  dinners?: string[]
}

// Activation email #3 — sent 7 days after signup, last of the setup emails.
// Nov 22 2026 review, Part 6 fix 3 (Sarah approved): a plain note from Sarah. Drops "we won't keep nudging" (the
// weekly dinners email and other notes do follow) and says plainly what still comes and how to stop it.
export default function ActivateDay7({
  firstName = 'there',
  unsubscribeUrl = 'https://www.dinnerdrop.app/unsubscribe',
  shopUrl,
  listUrl,
  inStore = false,
  dinners = [],
}: ActivateDay7Props) {
  const lead = dinners.length ? `${dinners[0]}${dinners.length > 1 ? ` and ${dinners.length - 1} more` : ''} ${dinners.length > 1 ? 'are' : 'is'} still planned.` : 'Your dinners are still planned.'
  const dash = 'https://www.dinnerdrop.app/dashboard?utm_source=email&utm_medium=lifecycle&utm_campaign=activate_day7'
  const mainHref = inStore ? (listUrl ?? shopUrl ?? dash) : (shopUrl ?? listUrl ?? dash)
  return (
    <Html>
      <Head />
      <Preview>{inStore ? `${lead} Your list opens on your phone in the store, no sign-in.` : `${lead} One tap puts the groceries in your Instacart cart.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              You signed up a week ago and your dinners are still planned{dinners.length ? ':' : '.'}
            </Text>
            {dinners.length > 0 && (
              <Text style={{ ...paragraph, margin: '0 0 16px 8px' }}>
                {dinners.slice(0, 7).map((d, i) => <React.Fragment key={i}>• {d}<br /></React.Fragment>)}
              </Text>
            )}
            <Text style={paragraph}>
              {inStore
                ? 'Your grocery list is ready for the store. It opens on your phone with no sign-in, and you check items off as you shop.'
                : 'One tap puts every ingredient in your Instacart cart, and you check out there.'}
              {' '}Planning and the {inStore ? 'grocery list' : 'cart link'} are free. No card needed.
            </Text>
            <Section style={ctaSection}>
              <Button style={button} href={mainHref}>
                {inStore ? 'Open my grocery list' : 'Send my groceries to Instacart'}
              </Button>
              <Text style={{ ...paragraph, textAlign: 'center', marginTop: '10px' }}>
                <Link href={dash} style={{ color: '#1a5c38' }}>See or swap the dinners first</Link>
              </Text>
            </Section>
            <Text style={paragraph}>
              If these dinners are wrong for your family, reply and tell me what you&apos;d rather eat.
              I&apos;ll redo the week myself.
            </Text>
            <Text style={paragraph}>Sarah</Text>
            <Hr style={hr} />
            <Text style={{ ...paragraph, fontSize: '14px', color: '#6b7280' }}>
              This is the last of these setup emails. You&apos;ll still get your weekly dinners email, and now and then
              a note from me. <Link href={unsubscribeUrl} style={{ color: '#6b7280', textDecoration: 'underline' }}>Turn them off here</Link>.
            </Text>
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
const ctaSection = { margin: '28px 0', textAlign: 'center' as const }
const button = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
