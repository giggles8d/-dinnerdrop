import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'

interface InstacartLiveProps {
  firstName?: string
  /** true = one of the first families in (their free months stand) */
  isFoundingMember?: boolean
  /** true = joined the waitlist, never created an account */
  isWaitlist?: boolean
  ctaUrl?: string
  unsubscribeUrl?: string
}

// One-shot announcement (Oct 2026): the Instacart production integration is
// live. Sent via /api/admin/instacart-live to every signup + waitlist contact.
// Every promise here must be TRUE at send time: the one-tap Instacart list is
// on production; early families keep their free months, everyone else gets the free plan.
export default function InstacartLive({
  firstName = 'there',
  isFoundingMember = false,
  isWaitlist = false,
  ctaUrl = 'https://www.dinnerdrop.app/start?utm_source=email&utm_medium=instacart_live',
  unsubscribeUrl = 'https://www.dinnerdrop.app/unsubscribe',
}: InstacartLiveProps) {
  const preview = isFoundingMember
    ? 'Your grocery list now lands in your Instacart cart in one tap — and Family is free for you for a full year'
    : 'One tap, your whole grocery list in your Instacart cart. It is live.'

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>

            <Text style={paragraph}>
              Quick one, because it changes the whole product: <strong>the one-tap Instacart cart is live.</strong>
            </Text>
            <Text style={paragraph}>
              Pick your week of dinners, tap <em>Shop ingredients</em>, and your full grocery list opens in
              Instacart with every item already loaded. Choose your store, check out, done. No retyping,
              no forgotten onions. (Kroger shoppers: you can push straight into your Kroger cart too.)
            </Text>

            {isFoundingMember && (
              <>
                <Text style={heading}>Family is yours, free, for a full year</Text>
                <Text style={paragraph}>
                  You were one of the first families in. As a thank-you, the <strong>Family plan is free for
                  you through October 18, 2027</strong> — nothing to do, nothing to add, no card needed. That
                  includes the Kroger cart push and every new family feature as it ships: the week&apos;s
                  dinners texted to everyone to vote on, a shared list anyone can text foods to, and
                  per-person preferences. Sign in and plan this week.
                </Text>
              </>
            )}

            {!isFoundingMember && isWaitlist && (
              <>
                <Text style={heading}>You asked us to let you know — the door is open</Text>
                <Text style={paragraph}>
                  DinnerDrop is now <strong>free, no card needed</strong>: five dinners planned for your
                  family and budget every week, and your grocery list in your Instacart cart in one tap.
                  Takes two minutes to set up.
                </Text>
              </>
            )}

            {!isFoundingMember && !isWaitlist && (
              <>
                <Text style={heading}>It&apos;s free now, too</Text>
                <Text style={paragraph}>
                  You signed up a while back, before the cart was ready. It is now, and planning plus the
                  Instacart cart are <strong>free, no card needed</strong> — five dinners planned for your
                  family and budget, grocery list in your cart in one tap. Sign in and plan this week.
                </Text>
              </>
            )}

            <Section style={ctaSection}>
              <Button style={button} href={ctaUrl}>
                {isFoundingMember ? 'Plan this week’s dinners →' : 'Plan this week’s dinners →'}
              </Button>
              <Text style={ctaSubtext}>
                {isFoundingMember
                  ? 'One-click sign in · no password · still free'
                  : 'Free · no card · takes 2 minutes'}
              </Text>
            </Section>

            <Text style={paragraph}>
              If something does not work the way you expect, reply to this email — it comes straight to me.
            </Text>
            <Text style={paragraph}>— Sarah, founder of DinnerDrop</Text>
          </Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              DinnerDrop plans around your saved dietary preferences — always check ingredient labels before cooking or checkout.
            </Text>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={footerLink}>Unsubscribe</Link>
              {' · '}
              <Link href="https://www.dinnerdrop.app/privacy" style={footerLink}>Privacy</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '0', maxWidth: '560px', borderRadius: '12px', overflow: 'hidden' }
const header = { backgroundColor: '#1a5c38', padding: '20px 32px' }
const logo = { color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: 0 }
const body = { padding: '28px 32px 8px' }
const heading = { color: '#1a5c38', fontSize: '17px', fontWeight: 700, margin: '20px 0 6px' }
const paragraph = { color: '#333333', fontSize: '15px', lineHeight: '24px', margin: '0 0 14px' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0 8px' }
const button = { backgroundColor: '#1a5c38', color: '#ffffff', fontSize: '16px', fontWeight: 700, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const ctaSubtext = { color: '#888888', fontSize: '12px', margin: '10px 0 0' }
const hr = { borderColor: '#eeeeee', margin: '8px 32px 0' }
const footer = { padding: '12px 32px 24px' }
const footerText = { color: '#999999', fontSize: '12px', lineHeight: '18px', margin: '6px 0' }
const footerLink = { color: '#999999', textDecoration: 'underline' }
