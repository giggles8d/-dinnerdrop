# Error Monitoring Setup — DinnerDrop
**Status:** Vercel Analytics LIVE (committed D3H19). Sentry optional (document below).

---

## What's Already Live

### Vercel Analytics (committed — zero setup required from Sarah)
- `@vercel/analytics` added to package.json
- `<Analytics />` added to app/layout.tsx
- Tracks page views, navigation events, and Web Vitals automatically
- **Sarah: Enable in Vercel dashboard → Project → Analytics tab → Enable**
  - Takes 30 seconds. No API key needed.
  - Free tier: 2,500 events/month (plenty for beta)
  - Dashboard at: https://vercel.com/dashboard → DinnerDrop → Analytics

---

## Optional: Sentry (Error Tracking)

For capturing JavaScript errors and API failures in production.

**Free tier:** 5,000 errors/month — sufficient through beta and early growth.

### Setup Steps for Sarah (~10 min)
1. Go to https://sentry.io → Create account with info@dinnerdrop.app
2. Create project → Platform: Next.js → Name: dinnerdrop
3. Copy your DSN (looks like: https://abc123@o12345.ingest.sentry.io/67890)
4. Add to Vercel env vars: `NEXT_PUBLIC_SENTRY_DSN=<your-dsn>`
5. Send Cowork the DSN → Cowork installs @sentry/nextjs and wires it in (~15 min)

### What Sentry catches that Vercel doesn't:
- Unhandled errors in /api/generate-plan, /api/generate-list, /api/stripe/webhook
- Client-side React errors with full stack trace
- Slow API response alerts (performance monitoring)

**Recommendation:** Enable Vercel Analytics now (free, zero setup). Add Sentry when first paying users exist.

---

## Metrics to Watch (Day 1–7)

| Signal | Where to Check | Target |
|--------|---------------|--------|
| Page views on /beta | Vercel Analytics | >50/day by Day 5 |
| /beta → /subscribe conversion | Vercel Analytics funnels | >15% |
| API errors (/api/generate-plan) | Vercel Functions logs | <1% error rate |
| Stripe webhook delivery | Stripe dashboard → Webhooks | 100% delivered |
| Beta spots remaining | https://dinnerdrop.vercel.app/api/stripe/beta-spots | Monitor daily |

**Sarah's daily check: 2 minutes**
- Vercel Analytics dashboard (page views, top pages)
- /api/stripe/beta-spots (beta signups)
- Stripe dashboard (any payments)
