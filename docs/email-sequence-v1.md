# DinnerDrop — Trial-to-Paid Email Sequence v1

**Purpose:** Convert free trial users to paid subscribers ($9/month)
**Trigger:** User starts 7-day free trial (Stripe subscription created)
**Platform:** Resend (recommended — see docs/email-platform-recommendation.md)
**From:** DinnerDrop <hello@dinnerdrop.app>
**Unsubscribe:** Required in all emails (CAN-SPAM / GDPR compliance)

---

## Sequence Overview

| Email | Send Day | Subject | Goal |
|-------|----------|---------|------|
| Email 1 | Day 3 | "How are your dinners going this week?" | Value reinforcement + feature discovery |
| Email 2 | Day 6 | "One day left in your free trial" | Soft conversion push + urgency |
| Email 3 | Day 7 | "Your DinnerDrop trial ends tonight" | Hard conversion + last-chance urgency |

**A/B test recommendation:** Test Email 3 subject line variants:
- Variant A: "Your DinnerDrop trial ends tonight"
- Variant B: "Don't lose your meal plan — upgrade now"

---

## EMAIL 1 — Day 3 of Trial

**Send:** 72 hours after trial_start timestamp
**Send time:** 9:00 AM user local time (or 10:00 AM EST fallback)
**Goal:** Reinforce value, surface unused features, build weekly habit

---

**Subject:** How are your dinners going this week? 🍽️
**Preview text:** A quick check-in + one feature you might have missed


---

**BODY COPY:**

Hi {{first_name}},

You're three days into your DinnerDrop trial — which means you've probably already had a few dinners handled for you. 🎉

We just wanted to check in.

**Here's what most families discover by Day 3:**

The best part isn't the meal plan itself — it's the grocery list. Instead of wandering the store or forgetting an ingredient, everything is organized by category and ready to send straight to your preferred store in one tap.

**Have you tried the grocery handoff yet?**

After DinnerDrop generates your meal plan, head to **Grocery List** and tap the "Shop at [your store]" button. It opens a pre-filled search at Walmart, Amazon Fresh, Instacart, or wherever you shop — no more copying items by hand.

[→ Try the grocery list now](https://dinnerdrop.app/grocery-list)

---

**What's working for other families this week:**

> *"I used to spend 20 minutes every Sunday figuring out what to make. Now I just open DinnerDrop on my phone while I have coffee."*
> — Early beta user

---

If you have any questions or something isn't working right, just reply to this email. We read every response.

Enjoy your dinners,
**The DinnerDrop Team**

[Manage your account](https://dinnerdrop.app) · [Unsubscribe]({{unsubscribe_url}})

---

**DESIGN NOTES:**
- Forest green header (#1a5c38) with DinnerDrop logo
- White body, max-width 600px
- Gold CTA button (#e8a838) — "Try the grocery list now"
- Clean single-column layout, no images required (text-first)
- Mobile font size: 16px body, 22px heading


---

## EMAIL 2 — Day 6 of Trial

**Send:** 144 hours (6 days) after trial_start timestamp
**Send time:** 10:00 AM user local time (or 10:00 AM EST fallback)
**Goal:** Soft conversion push, remind of value received, make upgrade easy

---

**Subject:** One day left in your free trial
**Preview text:** Here's what you'll keep when you upgrade to full access

---

**BODY COPY:**

Hi {{first_name}},

Your DinnerDrop free trial ends tomorrow.

Over the past six days, you've had access to:

✅ AI-generated weekly dinner plans tailored to your family
✅ Automatic grocery lists organized by store section
✅ One-tap grocery handoff to your preferred store
✅ New meal suggestions every week — no repeats

After your trial ends, your account will be paused. Any meal plans you've saved will be waiting for you if you decide to come back.

**Keep all of it for $9/month — that's less than one takeout order.**

[→ Upgrade to full access](https://dinnerdrop.app/subscribe)

No long-term commitment. Cancel anytime. Your next billing date would be **{{next_billing_date}}**.

---

**Why families stick with DinnerDrop:**

The average American family spends 43 minutes per day deciding what to eat. DinnerDrop cuts that to under 2 minutes — and eliminates the 6pm "what's for dinner?" spiral entirely.

At $9/month, that's $0.30 per day to have dinner handled.

[→ Continue my subscription](https://dinnerdrop.app/subscribe)

---

Questions? Just reply — we're here.

**The DinnerDrop Team**

[Manage your account](https://dinnerdrop.app) · [Unsubscribe]({{unsubscribe_url}})

---

**DESIGN NOTES:**
- Checklist items use gold checkmarks (✅ or custom SVG in gold #e8a838)
- "Less than one takeout order" — bold, 18px
- Two CTA buttons: primary gold ("Upgrade to full access"), secondary text link ("Continue my subscription")
- Add urgency banner at top: "⏰ Your trial ends in 24 hours"


---

## EMAIL 3 — Day 7 (Last Chance)

**Send:** 167 hours after trial_start (1 hour before trial expiry)
**Send time:** Dynamic — 1 hour before their specific trial_end timestamp
**Goal:** Maximum urgency, hard conversion push, handle final objections

---

**Subject:** Your DinnerDrop trial ends tonight
**Preview text:** Keep your meal plan + grocery list — upgrade in 30 seconds

**Variant B subject (A/B test):** Don't lose your meal plan — upgrade now
**Variant B preview:** Your trial ends in a few hours. Here's how to keep everything.

---

**BODY COPY:**

Hi {{first_name}},

Your 7-day free trial ends in **a few hours**.

After that, your DinnerDrop account will be paused and your meal plans will be archived.

**Upgrade now and keep everything — $9/month, cancel anytime.**

[→ Complete my upgrade now](https://dinnerdrop.app/subscribe)

---

**Still on the fence? Here's the honest version:**

DinnerDrop isn't for everyone. If you only need a meal plan once in a while, the free trial was probably enough.

But if the past week felt easier — if you opened the app instead of staring at the fridge, if your grocery run was faster, if dinner just *happened* — then $9/month is a pretty easy call.

Most families who cancel say the same thing: *"I wish I'd kept it."*

---

**What you get at $9/month:**

- Weekly AI dinner plans (personalized to your family size and preferences)
- Auto-generated grocery lists with store handoff
- Unlimited meal regeneration — don't like a suggestion? Swap it
- New plans every week, never the same twice
- Priority support

**[→ Upgrade before my trial expires](https://dinnerdrop.app/subscribe)**

---

If you have a reason you're not upgrading, reply to this email. We'd genuinely like to know — and we'll do our best to help.

**The DinnerDrop Team**

P.S. — If the timing just isn't right, no hard feelings. Your account will be here when you're ready.

[Manage your account](https://dinnerdrop.app) · [Unsubscribe]({{unsubscribe_url}})

---

**DESIGN NOTES:**
- Red urgency banner at top: "⏰ Trial expires tonight"
- Hero section: large clock icon or countdown visual
- Primary CTA: gold button, full width on mobile, "Complete my upgrade now"
- "Still on the fence" section: gray background box, slightly smaller text — humanizes the email
- P.S. line: italic, smaller text — softens the pressure while keeping the door open
- Send exactly 1 hour before trial_end for maximum urgency without feeling spammy


---

## Implementation Notes

### Template Variables
| Variable | Source | Notes |
|----------|--------|-------|
| `{{first_name}}` | Supabase profiles.full_name | Fall back to "there" if null |
| `{{unsubscribe_url}}` | Resend built-in | Auto-generated per send |
| `{{next_billing_date}}` | Stripe subscription | trial_end + 1 day |

### Trigger Logic (Supabase Edge Function)
```
ON INSERT to subscriptions WHERE status = 'trialing'
  → Schedule Email 1 at created_at + 72 hours
  → Schedule Email 2 at created_at + 144 hours
  → Schedule Email 3 at trial_end - 1 hour
```

### Suppression Rules
- Do NOT send Email 2 or 3 if user has already upgraded (status = 'active')
- Do NOT send if user has manually unsubscribed from marketing emails
- Check subscription status at send time, not schedule time

### Metrics to Track
- Email 1: Open rate (target >40%), Click rate on grocery list CTA (target >15%)
- Email 2: Open rate (target >50%), Upgrade click rate (target >8%)
- Email 3: Open rate (target >55%), Conversion rate (target >12%)
- Overall sequence conversion: target 20% trial-to-paid

### Next Steps
- See docs/email-platform-recommendation.md for Resend setup guide
- See docs/email-integration-code.md for Supabase edge function implementation
