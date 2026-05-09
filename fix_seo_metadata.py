import os

BASE = r'C:\Users\setzl\dinnerdrop-ops'

# ── 1. terms/page.tsx ──────────────────────────────────────────────────────────
path = os.path.join(BASE, 'app', 'terms', 'page.tsx')
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()
old = (
    "export const metadata: Metadata = {\n"
    "  title: 'Terms of Service — DinnerDrop',\n"
    "  description: 'DinnerDrop terms of service and user agreement.',\n"
    "}"
)
new = (
    "export const metadata: Metadata = {\n"
    "  title: 'Terms of Service — DinnerDrop',\n"
    "  description: 'DinnerDrop terms of service and user agreement.',\n"
    "  openGraph: {\n"
    "    title: 'Terms of Service — DinnerDrop',\n"
    "    description: 'DinnerDrop terms of service and user agreement.',\n"
    "    url: 'https://dinnerdrop.app/terms',\n"
    "    siteName: 'DinnerDrop',\n"
    "    type: 'website',\n"
    "  },\n"
    "}"
)
if old in src:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src.replace(old, new, 1))
    print('OK: terms/page.tsx')
else:
    print('MISS: terms/page.tsx — snippet not found')

# ── 2. privacy/page.tsx ────────────────────────────────────────────────────────
path = os.path.join(BASE, 'app', 'privacy', 'page.tsx')
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()
old = (
    "export const metadata: Metadata = {\n"
    "  title: 'Privacy Policy — DinnerDrop',\n"
    "  description: 'DinnerDrop privacy policy — how we collect, use, and protect your data.',\n"
    "}"
)
new = (
    "export const metadata: Metadata = {\n"
    "  title: 'Privacy Policy — DinnerDrop',\n"
    "  description: 'DinnerDrop privacy policy — how we collect, use, and protect your data.',\n"
    "  openGraph: {\n"
    "    title: 'Privacy Policy — DinnerDrop',\n"
    "    description: 'DinnerDrop privacy policy — how we collect, use, and protect your data.',\n"
    "    url: 'https://dinnerdrop.app/privacy',\n"
    "    siteName: 'DinnerDrop',\n"
    "    type: 'website',\n"
    "  },\n"
    "}"
)
if old in src:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src.replace(old, new, 1))
    print('OK: privacy/page.tsx')
else:
    print('MISS: privacy/page.tsx — snippet not found')

# ── 3. beta/layout.tsx ─────────────────────────────────────────────────────────
path = os.path.join(BASE, 'app', 'beta', 'layout.tsx')
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()
old = (
    '  openGraph: {\n'
    '    title: "Join the DinnerDrop Beta — 6 Months Free",\n'
    '    description: "First 100 families get 6 months of AI-powered dinner planning completely free. No credit card required.",\n'
    '    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DinnerDrop Beta" }],\n'
    '  },\n'
    '};'
)
new = (
    '  openGraph: {\n'
    '    title: "Join the DinnerDrop Beta — 6 Months Free",\n'
    '    description: "First 100 families get 6 months of AI-powered dinner planning completely free. No credit card required.",\n'
    '    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DinnerDrop Beta — 6 Months Free" }],\n'
    '    url: "https://dinnerdrop.app/beta",\n'
    '    siteName: "DinnerDrop",\n'
    '    type: "website",\n'
    '  },\n'
    '  twitter: {\n'
    '    card: "summary_large_image",\n'
    '    title: "Join the DinnerDrop Beta — 6 Months Free",\n'
    '    description: "First 100 families get 6 months of AI-powered dinner planning completely free. No credit card required.",\n'
    '    images: ["/og-image.png"],\n'
    '  },\n'
    '};'
)
if old in src:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src.replace(old, new, 1))
    print('OK: beta/layout.tsx')
else:
    print('MISS: beta/layout.tsx — snippet:')
    print(repr(src))

# ── 4. subscribe/layout.tsx ────────────────────────────────────────────────────
path = os.path.join(BASE, 'app', 'subscribe', 'layout.tsx')
content = (
    "import type { Metadata } from 'next'\n"
    "\n"
    "export const metadata: Metadata = {\n"
    "  title: 'Start Your Free Trial — DinnerDrop',\n"
    "  description: 'Join DinnerDrop free. AI-powered dinner planning for busy families — 5 personalized meals and a grocery list in one tap. 7-day free trial.',\n"
    "  openGraph: {\n"
    "    title: 'Start Your Free Trial — DinnerDrop',\n"
    "    description: 'Get 5 personalized dinners + one-tap grocery list. First 100 beta families get 6 months completely free. No credit card required.',\n"
    "    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop — Start Free Trial' }],\n"
    "    url: 'https://dinnerdrop.app/subscribe',\n"
    "    siteName: 'DinnerDrop',\n"
    "    type: 'website',\n"
    "  },\n"
    "  twitter: {\n"
    "    card: 'summary_large_image',\n"
    "    title: 'Start Your Free Trial — DinnerDrop',\n"
    "    description: '5 dinners planned in 30 seconds. One-tap grocery list. 7-day free trial.',\n"
    "    images: ['/og-image.png'],\n"
    "  },\n"
    "}\n"
    "\n"
    "export default function SubscribeLayout({ children }: { children: React.ReactNode }) {\n"
    "  return <>{children}</>\n"
    "}\n"
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK: subscribe/layout.tsx (created)')

# ── 5. (auth)/login/layout.tsx ─────────────────────────────────────────────────
login_dir = os.path.join(BASE, 'app', '(auth)', 'login')
os.makedirs(login_dir, exist_ok=True)
path = os.path.join(login_dir, 'layout.tsx')
content = (
    "import type { Metadata } from 'next'\n"
    "\n"
    "export const metadata: Metadata = {\n"
    "  title: 'Log In — DinnerDrop',\n"
    "  description: 'Log in to your DinnerDrop account to access your personalized dinner plans and grocery lists.',\n"
    "  robots: { index: false, follow: false },\n"
    "}\n"
    "\n"
    "export default function LoginLayout({ children }: { children: React.ReactNode }) {\n"
    "  return <>{children}</>\n"
    "}\n"
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK: (auth)/login/layout.tsx (created, noindex)')

# ── 6. (auth)/signup/layout.tsx ────────────────────────────────────────────────
signup_dir = os.path.join(BASE, 'app', '(auth)', 'signup')
os.makedirs(signup_dir, exist_ok=True)
path = os.path.join(signup_dir, 'layout.tsx')
content = (
    "import type { Metadata } from 'next'\n"
    "\n"
    "export const metadata: Metadata = {\n"
    "  title: 'Create Your Account — DinnerDrop',\n"
    "  description: 'Create your DinnerDrop account and start your free 7-day trial. AI-powered dinner planning for busy families.',\n"
    "  robots: { index: false, follow: false },\n"
    "}\n"
    "\n"
    "export default function SignupLayout({ children }: { children: React.ReactNode }) {\n"
    "  return <>{children}</>\n"
    "}\n"
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK: (auth)/signup/layout.tsx (created, noindex)')

# ── 7. unsubscribe/layout.tsx ──────────────────────────────────────────────────
path = os.path.join(BASE, 'app', 'unsubscribe', 'layout.tsx')
content = (
    "import type { Metadata } from 'next'\n"
    "\n"
    "export const metadata: Metadata = {\n"
    "  title: 'Unsubscribe — DinnerDrop',\n"
    "  description: 'Unsubscribe from DinnerDrop email notifications.',\n"
    "  robots: { index: false, follow: false },\n"
    "}\n"
    "\n"
    "export default function UnsubscribeLayout({ children }: { children: React.ReactNode }) {\n"
    "  return <>{children}</>\n"
    "}\n"
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('OK: unsubscribe/layout.tsx (created, noindex)')

print('\nAll 7 changes applied.')
