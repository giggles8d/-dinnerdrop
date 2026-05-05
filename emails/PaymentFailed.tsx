import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface PaymentFailedProps {
  firstName?: string;
  updatePaymentUrl?: string;
}

export default function PaymentFailed({
  firstName = 'there',
  updatePaymentUrl = 'https://dinnerdrop.app/account',
}: PaymentFailedProps) {
  return (
    <Html>
      <Head />
      <Preview>Action needed: update your payment method to keep DinnerDrop active</Preview>
      <Body style={main}>
        <Container style={container}>

          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>DinnerDrop</Text>
          </Section>

          {/* Alert Banner */}
          <Section style={alertBanner}>
            <Text style={alertText}>⚠️  Payment issue — action needed</Text>
          </Section>

          {/* Body */}
          <Section style={bodySection}>
            <Heading style={h1}>Hi {firstName},</Heading>

            <Text style={paragraph}>
              We weren't able to process your recent DinnerDrop payment. This
              can happen with an expired card, updated billing info, or a
              one-time bank decline — totally fixable in about 30 seconds.
            </Text>

            <Text style={paragraph}>
              Your account is currently on hold. Update your payment method to
              restore full access to your weekly meal plans, grocery lists, and
              one-tap store cart handoff.
            </Text>

            <Section style={ctaSection}>
              <Button style={ctaButton} href={updatePaymentUrl}>
                Update payment method →
              </Button>
            </Section>

            <Hr style={divider} />

            {/* What's paused box */}
            <Section style={loseBox}>
              <Text style={loseTitle}>Currently paused on your account:</Text>
              <Text style={loseItem}>• Weekly meal plan generation</Text>
              <Text style={loseItem}>• Grocery list builder</Text>
              <Text style={loseItem}>• One-tap Walmart / Amazon Fresh cart handoff</Text>
              <Text style={loseItem}>• Saved preferences and meal history</Text>
            </Section>

            <Text style={paragraph}>
              Once your payment is updated, everything picks right back up — your
              preferences, saved meals, and household settings are all still there.
            </Text>

            <Section style={ctaSection}>
              <Button style={ctaButtonSecondary} href={updatePaymentUrl}>
                Fix my payment now →
              </Button>
            </Section>

            <Text style={founderNote}>
              — Sarah at DinnerDrop
            </Text>
          </Section>

          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Email{' '}
              <Link href="mailto:info@dinnerdrop.app" style={footerLink}>
                info@dinnerdrop.app
              </Link>
            </Text>
            <Text style={footerText}>
              DinnerDrop · dinnerdrop.app
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const main = {
  backgroundColor: '#f5f5f5',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};
const container = {
  margin: '0 auto',
  maxWidth: '600px',
  backgroundColor: '#ffffff',
};
const header = {
  backgroundColor: '#1a5c38',
  padding: '20px 32px',
};
const logoText = {
  color: '#e8a838',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
};
const alertBanner = {
  backgroundColor: '#dc2626',
  padding: '12px 32px',
};
const alertText = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  textAlign: 'center' as const,
};
const bodySection = { padding: '32px' };
const h1 = {
  color: '#1a5c38',
  fontSize: '22px',
  fontWeight: '700',
  marginBottom: '16px',
};
const paragraph = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.6',
  marginBottom: '16px',
};
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' };
const ctaButton = {
  backgroundColor: '#1a5c38',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 32px',
  textDecoration: 'none',
};
const ctaButtonSecondary = {
  backgroundColor: '#e8a838',
  borderRadius: '6px',
  color: '#1a1a1a',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 28px',
  textDecoration: 'none',
};
const divider = { borderColor: '#e5e7eb', margin: '24px 0' };
const loseBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '20px',
};
const loseTitle = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '600',
  marginBottom: '8px',
};
const loseItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '1.7',
  margin: '2px 0',
};
const founderNote = {
  color: '#6b7280',
  fontSize: '14px',
  fontStyle: 'italic',
  marginTop: '24px',
};
const footer = { padding: '0 32px 24px' };
const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  lineHeight: '1.6',
};
const footerLink = { color: '#1a5c38' };
