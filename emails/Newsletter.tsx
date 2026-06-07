import {
  Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import * as React from 'react'
import type { NewsletterIssue, FeatureSpotlight } from '@/lib/newsletter-content'

interface BlogPostSummary {
  title: string
  description: string
  slug: string
}

interface NewsletterProps {
  firstName?: string
  isBetaMember?: boolean
  issue: NewsletterIssue
  feature: FeatureSpotlight
  blogPosts?: BlogPostSummary[]
  unsubscribeUrl?: string
}

export default function Newsletter({
  firstName = 'there',
  isBetaMember = false,
  issue,
  feature,
  blogPosts = [],
  unsubscribeUrl = 'https://dinnerdrop.app/unsubscribe',
}: NewsletterProps) {
  return (
    <Html>
      <Head />
      <Preview>{issue.themeTitle} — 5 dinner ideas, one smart grocery tip</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
            <Text style={headerSub}>The Sunday Drop · biweekly dinner intel</Text>
          </Section>
          <Section style={body}>
            <Text style={paragraph}>Hi {firstName},</Text>
            <Text style={paragraph}>{issue.intro}</Text>

            <Text style={heading}>🍽️ This issue&apos;s 5-dinner idea: {issue.themeTitle}</Text>
            {issue.dinners.map((d, i) => (
              <Text key={i} style={dinnerRow}>
                <strong>{i + 1}. {d.name}</strong> — {d.note}
              </Text>
            ))}
            <Section style={ctaSection}>
              <Button style={button} href="https://dinnerdrop.app/dashboard">
                Generate my own 5-dinner plan →
              </Button>
            </Section>

            <Hr style={hr} />
            <Text style={heading}>💡 One smart grocery tip: {issue.tip.title}</Text>
            <Text style={paragraph}>{issue.tip.body}</Text>

            {blogPosts.length > 0 && (
              <>
                <Hr style={hr} />
                <Text style={heading}>📰 New on the blog</Text>
                {blogPosts.map((p) => (
                  <Text key={p.slug} style={paragraph}>
                    <Link href={`https://dinnerdrop.app/blog/${p.slug}`} style={blogLink}>
                      {p.title}
                    </Link>
                    <br />
                    {p.description}
                  </Text>
                ))}
              </>
            )}

            <Hr style={hr} />
            <Text style={heading}>⚙️ Feature spotlight: {feature.title}</Text>
            <Text style={paragraph}>{feature.body}</Text>
            <Text style={paragraph}>
              <Link href={feature.ctaUrl} style={blogLink}>{feature.ctaLabel} →</Link>
            </Text>

            <Hr style={hr} />
            {isBetaMember ? (
              <>
                <Text style={heading}>💬 Founding corner</Text>
                <Text style={paragraph}>
                  You&apos;re one of our founding families, and your feedback genuinely shapes
                  what gets built next. Hit reply with anything — a meal that missed, a feature
                  you wish existed, a grocery-handoff hiccup. I read every response.
                </Text>
                <Text style={paragraph}>
                  Know a family drowning in the 5pm scramble? Founding spots are still open —{' '}
                  <Link href="https://dinnerdrop.app/beta" style={blogLink}>
                    send them to the 6-months-free offer
                  </Link>.
                </Text>
                <Text style={paragraph}>— Sarah, founder</Text>
              </>
            ) : (
              <>
                <Text style={heading}>🎉 Founding-family spots are still open</Text>
                <Text style={paragraph}>
                  DinnerDrop plans 5 personalized weeknight dinners and drops your whole grocery
                  list into your Instacart or Kroger cart in one tap. The first 100 families get
                  6 months completely free — no credit card.
                </Text>
                <Section style={ctaSection}>
                  <Button style={button} href="https://dinnerdrop.app/beta">
                    Claim my 6 months free →
                  </Button>
                </Section>
              </>
            )}
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>
              You&apos;re receiving The Sunday Drop because you have a DinnerDrop account or
              signed up on dinnerdrop.app.
            </Text>
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
const headerSub = { color: '#ffffff', fontSize: '13px', margin: '4px 0 0', opacity: 0.85 }
const body = { padding: '32px' }
const paragraph = { color: '#374151', fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }
const dinnerRow = { color: '#374151', fontSize: '15px', lineHeight: '1.5', margin: '0 0 10px', paddingLeft: '8px' }
const heading = { color: '#1a5c38', fontSize: '18px', fontWeight: '600', lineHeight: '1.4', margin: '24px 0 12px' }
const ctaSection = { margin: '24px 0', textAlign: 'center' as const }
const button = { backgroundColor: '#e8a838', borderRadius: '6px', color: '#1a1a1a', display: 'inline-block', fontSize: '16px', fontWeight: '600', padding: '14px 28px', textDecoration: 'none' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const blogLink = { color: '#1a5c38', fontWeight: '600', textDecoration: 'underline' }
const footerSection = { backgroundColor: '#f9fafb', padding: '20px 32px', borderTop: '1px solid #e5e7eb' }
const footerText = { color: '#9ca3af', fontSize: '13px', margin: '0 0 8px', textAlign: 'center' as const }
const footerLink = { color: '#6b7280', textDecoration: 'underline' }
