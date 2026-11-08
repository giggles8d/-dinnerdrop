import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components'
import * as React from 'react'

/** The Sunday Drop v3 (lib/sunday-drop builds the props). Four blocks: your week, one dinner, one kitchen pick, one tip. */
export interface DropProps {
  segment: 'shop' | 'vote' | 'picked' | 'done' | 'comeback' | 'list'
  preview?: string
  greeting: string
  weekLabel: string
  dinners: Array<{ day: string; name: string }>
  moreCount: number
  estimate: number | null
  vote: { voted: number; members: number; leaders: string[] } | null
  main: { label: string; href: string } | null
  secondary: Array<{ label: string; href: string }>
  hero: { name: string; image: string; minutes: number; cost: number | null; kept: number; blurb: string; href: string; cta: string; ctaIsButton: boolean } | null
  pick: { product: string; why: string; href: string } | null
  tip: { text: string; label: string | null; href: string | null } | null
  unsubscribeUrl: string
  settingsUrl: string
  address: string
}

export default function SundayDrop(p: DropProps) {
  const voteLine = p.vote
    ? p.vote.voted
      ? `${p.vote.voted}${p.vote.members ? ` of ${p.vote.members}` : ''} have voted.${p.vote.leaders.length ? ` ${p.vote.leaders.join(' and ')} ${p.vote.leaders.length > 1 ? 'are' : 'is'} leading.` : ''}`
      : 'The dinner ideas went out by text. No votes yet.'
    : null
  const meta = p.hero ? [p.hero.minutes ? `${p.hero.minutes} min` : '', p.hero.cost ? `about $${Math.round(p.hero.cost)}` : '', p.hero.kept >= 3 ? `kept by ${p.hero.kept} families` : ''].filter(Boolean).join(' · ') : ''
  return (
    <Html>
      <Head />
      {p.preview ? <Preview>{p.preview}</Preview> : null}
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>DinnerDrop <span style={headerSub}>&nbsp;The Sunday Drop · {p.weekLabel}</span></Text>
          </Section>

          {/* 1. Your week */}
          <Section style={sec}>
            <Text style={para}>{p.greeting}</Text>
            {p.dinners.map((d, i) => (
              <Text key={i} style={row}><span style={day}>{d.day}</span>{d.name}</Text>
            ))}
            {p.moreCount > 0 ? <Text style={row}><span style={day}>&nbsp;</span>+ {p.moreCount} more</Text> : null}
            {voteLine ? <Text style={para}>{voteLine}</Text> : null}
            {p.estimate ? <Text style={small}>Estimated groceries for these dinners: about ${p.estimate}</Text> : null}
            {(p.segment === 'picked' || p.segment === 'comeback') ? <Text style={small}>Swap anything you don&apos;t love. Then one tap builds your grocery list.</Text> : null}
            {p.main ? <Button style={button} href={p.main.href}>{p.main.label}</Button> : null}
            {p.secondary.length ? (
              <Text style={links}>{p.secondary.map((s, i) => (
                <React.Fragment key={s.label}>{i ? '  ·  ' : ''}<Link href={s.href} style={textLink}>{s.label}</Link></React.Fragment>
              ))}</Text>
            ) : null}
            <Hr style={hr} />
          </Section>

          {/* 2. One dinner worth trying */}
          {p.hero ? (
            <Section style={sec}><Section style={heroBox}>
              <Text style={kicker}>{p.segment === 'done' ? 'A NEW IDEA FOR NEXT WEEK' : p.segment === 'list' ? 'AN EASY DINNER TO TRY' : 'A NEW DINNER TO TRY'}</Text>
              {p.segment !== 'list' ? <Text style={notOnList}>{p.segment === 'done' ? 'Not on your list. Save it for next week if it sounds good.' : "This one is not on your list. It's an extra idea: add it to your week only if it sounds good."}</Text> : null}
              <Link href={p.hero.href}><Img src={p.hero.image} alt={p.hero.name} width="520" style={heroImg} /></Link>
              <Text style={h2}><Link href={p.hero.href} style={titleLink}>{p.hero.name}</Link></Text>
              {meta ? <Text style={small}>{meta}</Text> : null}
              <Text style={para}>{p.hero.blurb}</Text>
              {p.hero.ctaIsButton
                ? <Button style={button} href={p.hero.href}>{p.hero.cta}</Button>
                : <Text style={{ ...para, margin: 0 }}><Link href={p.hero.href} style={textLink}>{p.hero.cta} →</Link></Text>}
            </Section></Section>
          ) : null}

          {/* 3. Kitchen pick (Amazon) — a text link so it never competes with the main button */}
          {p.pick ? (
            <Section style={sec}>
              <Section style={pickBox}>
                <Text style={{ ...kicker, margin: '0 0 4px' }}>KITCHEN PICK FOR THIS DINNER</Text>
                <Text style={{ ...h3 }}>{p.pick.product}</Text>
                <Text style={{ ...para, fontSize: '14px' }}>{p.pick.why}</Text>
                <Text style={{ ...para, margin: '0' }}><Link href={p.pick.href} style={textLink}>See it on Amazon →</Link></Text>
                <Text style={disc}>Paid link. As an Amazon Associate, DinnerDrop earns from qualifying purchases.</Text>
              </Section>
            </Section>
          ) : null}

          {/* 4. Tip + sign-off */}
          <Section style={sec}>
            {p.tip ? (
              <Text style={para}><strong>Tip:</strong> {p.tip.text}{p.tip.href && p.tip.label ? <> <Link href={p.tip.href} style={textLink}>{p.tip.label}</Link></> : null}</Text>
            ) : null}
            <Text style={para}>What should we fix? Hit reply. I read every one.<br />— Sarah</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>You&apos;re getting the Sunday Drop because you signed up for DinnerDrop. <Link href={p.settingsUrl} style={footerLink}>Email settings</Link> · <Link href={p.unsubscribeUrl} style={footerLink}>Unsubscribe</Link></Text>
            {p.address ? <Text style={footerText}>DinnerDrop · {p.address}</Text> : null}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const green = '#1a5c38'
const main = { backgroundColor: '#f6f4ef', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '20px auto', maxWidth: '560px', borderRadius: '12px', overflow: 'hidden' as const }
const header = { backgroundColor: green, padding: '14px 20px' }
const logo = { color: '#e8a838', fontSize: '19px', fontWeight: 700, margin: 0 }
const headerSub = { color: '#ffffff', fontSize: '12px', fontWeight: 400, opacity: 0.85 }
const sec = { padding: '16px 20px 0' }
const para = { color: '#1f2a24', fontSize: '15px', lineHeight: '1.5', margin: '0 0 10px' }
const small = { color: '#5b6660', fontSize: '13px', lineHeight: '1.4', margin: '6px 0 12px' }
const row = { color: '#1f2a24', fontSize: '15px', lineHeight: '1.35', margin: 0, padding: '7px 0', borderBottom: '1px solid #eee9df' }
const day = { color: '#8a8577', fontSize: '13px', display: 'inline-block', width: '42px' }
const button = { backgroundColor: green, color: '#ffffff', fontWeight: 700, fontSize: '16px', padding: '14px 18px', borderRadius: '10px', textDecoration: 'none', display: 'block', textAlign: 'center' as const, margin: '6px 0 0' }
const links = { textAlign: 'center' as const, fontSize: '14px', margin: '12px 0 4px' }
const textLink = { color: green, fontWeight: 700, textDecoration: 'none' }
const hr = { borderColor: '#e6e2d8', margin: '14px 0 0' }
const kicker = { color: green, fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 8px' }
const heroImg = { width: '100%', maxWidth: '500px', height: 'auto', borderRadius: '10px', display: 'block' }
const h2 = { fontSize: '19px', fontWeight: 700, color: '#1f2a24', margin: '12px 0 2px', lineHeight: '1.25' }
const h3 = { fontSize: '16px', fontWeight: 700, color: '#1f2a24', margin: '0 0 6px', lineHeight: '1.3' }
const titleLink = { color: '#1f2a24', textDecoration: 'none' }
const heroBox = { border: '2px dashed #d9d3c4', borderRadius: '12px', padding: '14px 14px 12px' }
const notOnList = { color: '#7a5a12', backgroundColor: '#fdf3dc', fontSize: '13px', lineHeight: '1.4', margin: '0 0 10px', padding: '8px 10px', borderRadius: '8px' }
const pickBox = { backgroundColor: '#f6f4ef', borderRadius: '10px', padding: '14px 16px' }
const disc = { color: '#7a7568', fontSize: '12px', lineHeight: '1.4', margin: '6px 0 0' }
const footer = { padding: '14px 20px 20px' }
const footerText = { color: '#8a8577', fontSize: '12px', margin: '0 0 4px', lineHeight: '1.5' }
const footerLink = { color: '#8a8577' }
