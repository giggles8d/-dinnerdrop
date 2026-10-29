import { Body, Button, Column, Container, Head, Hr, Html, Img, Link, Preview, Row, Section, Text } from '@react-email/components'
import * as React from 'react'
import type { WeeklyIssue } from '@/lib/weekly-newsletter'
import { nlLink } from '@/lib/weekly-newsletter'

interface Props {
  issue: WeeklyIssue
  firstName?: string
  unsubscribeUrl?: string
  appStoreUrl?: string | null
}

const recipeUrl = (slug: string, c: string) => nlLink(`/recipes/${slug}`, c)

export default function WeeklyDinners({ issue, firstName, unsubscribeUrl = 'https://www.dinnerdrop.app/unsubscribe', appStoreUrl }: Props) {
  const f = issue.featured
  return (
    <Html>
      <Head />
      <Preview>{issue.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop</Text>
            <Text style={headerSub}>The Sunday Drop · this week&apos;s dinners</Text>
          </Section>

          <Section style={{ padding: '24px 28px 8px' }}>
            <Text style={paragraph}>Hi {firstName || 'there'}, here&apos;s one dinner worth making this week, what to serve with it, and the dinners families kept most.</Text>
          </Section>

          {/* Featured dinner */}
          <Section style={{ padding: '0 28px' }}>
            <Text style={kicker}>THIS WEEK&apos;S DINNER</Text>
            <Link href={recipeUrl(f.slug, 'featured')}>
              <Img src={f.image} alt={f.name} width="544" style={heroImg} />
            </Link>
            <Text style={h1}><Link href={recipeUrl(f.slug, 'featured')} style={titleLink}>{f.name}</Link></Text>
            <Text style={paragraph}>{f.blurb}</Text>
            <Button style={button} href={recipeUrl(f.slug, 'featured')}>Get the recipe →</Button>
          </Section>

          {/* Complete your meal */}
          <Section style={{ padding: '20px 28px 0' }}>
            <Hr style={hr} />
            <Text style={h2}>Complete your meal</Text>
            {f.sides.map((s) => (
              <Text key={s.name} style={sideRow}><strong>{s.name}</strong> — {s.note}</Text>
            ))}
          </Section>

          {/* Trending */}
          {issue.trending.length > 0 && (
            <Section style={{ padding: '8px 28px 0' }}>
              <Hr style={hr} />
              <Text style={h2}>Dinners families kept this week</Text>
              {[0, 2].map((i) => (
                <Row key={i}>
                  {issue.trending.slice(i, i + 2).map((t) => (
                    <Column key={t.slug} style={{ width: '50%', padding: '0 6px 14px', verticalAlign: 'top' }}>
                      <Link href={recipeUrl(t.slug, 'trending')}>
                        <Img src={t.image} alt={t.name} width="260" style={cardImg} />
                      </Link>
                      <Text style={cardTitle}><Link href={recipeUrl(t.slug, 'trending')} style={titleLink}>{t.name}</Link></Text>
                      <Text style={cardMeta}>{t.minutes ? `${t.minutes} min` : ''}{t.cost ? ` · ~$${t.cost.toFixed(0)}` : ''}{t.kept ? ` · kept by ${t.kept} families` : ''}</Text>
                    </Column>
                  ))}
                </Row>
              ))}
            </Section>
          )}

          {/* Plan the week */}
          <Section style={{ padding: '18px 28px' }}><Section style={planBox}>
            <Text style={{ ...h2, color: '#ffffff', margin: '0 0 6px' }}>Want 5 like these, planned for you?</Text>
            <Text style={{ ...paragraph, color: '#e9f2ec', margin: '0 0 14px' }}>DinnerDrop picks 5 dinners for your family and budget, builds one grocery list, and sends it to your Instacart cart in one tap.</Text>
            <Button style={goldButton} href={nlLink('/dashboard', 'plan')}>Plan my week free →</Button>
            {appStoreUrl ? (
              <Text style={{ ...paragraph, margin: '14px 0 0' }}><Link href={appStoreUrl} style={{ color: '#e8a838', fontWeight: 600 }}>Get the DinnerDrop app →</Link></Text>
            ) : null}
          </Section></Section>

          {/* Tip */}
          <Section style={{ padding: '4px 28px 0' }}>
            <Text style={h2}>💡 {issue.tip.title}</Text>
            <Text style={paragraph}>{issue.tip.body}</Text>
            <Hr style={hr} />
            <Text style={h2}>Your turn</Text>
            <Text style={paragraph}>What did your family love this week? Hit reply and tell us. We may share your dinner (first name only, with your OK) in a future Sunday Drop.</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>You&apos;re getting the Sunday Drop because you have a DinnerDrop account or joined our list.</Text>
            <Text style={footerText}>
              <Link href="https://www.dinnerdrop.app/settings" style={footerLink}>Settings</Link>{' · '}
              <Link href={unsubscribeUrl} style={footerLink}>Unsubscribe</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f4ef', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '24px auto', maxWidth: '600px', borderRadius: '12px', overflow: 'hidden' as const }
const header = { backgroundColor: '#1a5c38', padding: '22px 28px' }
const logo = { color: '#e8a838', fontSize: '24px', fontWeight: 700, margin: 0 }
const headerSub = { color: '#ffffff', fontSize: '13px', margin: '4px 0 0', opacity: 0.85 }
const paragraph = { color: '#1f2a24', fontSize: '15px', lineHeight: '1.55', margin: '0 0 12px' }
const kicker = { color: '#1a5c38', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 8px' }
const heroImg = { width: '100%', maxWidth: '544px', height: 'auto', borderRadius: '10px', display: 'block' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#1f2a24', margin: '14px 0 6px', lineHeight: '1.25' }
const h2 = { fontSize: '18px', fontWeight: 700, color: '#1f2a24', margin: '6px 0 10px' }
const titleLink = { color: '#1f2a24', textDecoration: 'none' }
const button = { backgroundColor: '#1a5c38', color: '#ffffff', fontWeight: 600, fontSize: '15px', padding: '12px 20px', borderRadius: '10px', textDecoration: 'none' }
const goldButton = { ...button, backgroundColor: '#e8a838', color: '#1f2a24' }
const sideRow = { ...paragraph, margin: '0 0 8px' }
const cardImg = { width: '100%', maxWidth: '260px', height: 'auto', borderRadius: '8px', display: 'block' }
const cardTitle = { fontSize: '15px', fontWeight: 700, margin: '8px 0 2px', lineHeight: '1.3' }
const cardMeta = { fontSize: '12px', color: '#5b6660', margin: 0 }
const hr = { borderColor: '#e6e2d8', margin: '18px 0' }
const planBox = { backgroundColor: '#1a5c38', padding: '20px 22px', borderRadius: '12px' }
const footer = { padding: '18px 28px 26px' }
const footerText = { color: '#8a8577', fontSize: '12px', margin: '0 0 6px', lineHeight: '1.5' }
const footerLink = { color: '#8a8577' }
