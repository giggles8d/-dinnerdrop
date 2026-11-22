import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface ActivateDay1Props {
  firstName?: string
  unsubscribeUrl?: string
  shopUrl?: string
  /** The no-sign-in list (/list): the main button for in-store families, "see my list first" for the rest. */
  listUrl?: string
  inStore?: boolean
  dinners?: string[]
}

// Activation email #1 — sent the morning after signup to families who haven't
// sent a list to a store yet. One job: get them from "I have a plan" to the
// grocery list, where one tap loads the whole list into Instacart.
// Nov 22 2026 review (Sarah approved): the real number of dinners (it always said 5), the no-sign-in list link,
// an in-store version, and a reply line that's true now that replies go to Sarah (lib/activation-email).
export default function ActivateDay1({
  firstName = 'there',
  unsubscribeUrl = 'https://www.dinnerdrop.app/unsubscribe',
  shopUrl,
  listUrl,
  inStore = false,
  dinners = [],
}: ActivateDay1Props) {
  const n = dinners.length
  const what = n ? `${n} dinner${n === 1 ? ' is' : 's are'}` : 'dinners are'
  const listHref = listUrl ?? 'https://www.dinnerdrop.app/grocery-list?utm_source=email&utm_medium=lifecycle&utm_campaign=activate_day1'
  return (
    <Html>
      <Head />
      <Preview>{inStore ? `Your ${what} planned. Your list is ready to take to the store, no sign-in.` : `Your ${what} planned. One tap puts the groceries in your Instacart cart.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>
              Your <strong>{what}</strong> planned, and everything they need is
              already on one grocery list, combined and sorted by aisle.
            </Text>
            {inStore ? (
              <Text style={paragraph}>
                Open it on your phone in the store and check items off as you go. No sign-in needed.
              </Text>
            ) : (
              <Text style={paragraph}>
                Tap the button and the whole list lands in your Instacart cart, ready for delivery or pickup.
                No sign-in needed. Already have some of it? Remove it in Instacart, or open your list first and check it off.
              </Text>
            )}
            <Section style={ctaSection}>
              <Button style={button} href={inStore ? listHref : (shopUrl ?? listHref)}>
                {inStore ? 'Open my grocery list →' : 'Send my groceries to Instacart →'}
              </Button>
              {!inStore && (
                <Text style={{ ...paragraph, textAlign: 'center', marginTop: '10px' }}>
                  <Link href={listHref} style={inlineLink}>See my grocery list first</Link>
                </Text>
              )}
            </Section>
            <Text style={paragraph}>
              Want different dinners? Swap any of them on your{' '}
              <Link href="https://www.dinnerdrop.app/dashboard?utm_source=email&utm_medium=lifecycle&utm_campaign=activate_day1" style={inlineLink}>dinner plan</Link>
              {' '}and the list updates.
            </Text>
            <Hr style={hr} />
            <Text style={paragraph}>
              Stuck on anything? Reply here. It goes to my inbox and I answer myself.
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
const ctaSection = { margin: '28px 0', textAlign: 'center' as const }
const button = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const inlineLink = { color: '#1a5c38', textDecoration: 'underline' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
