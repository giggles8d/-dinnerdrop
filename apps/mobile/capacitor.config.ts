import type { CapacitorConfig } from '@capacitor/cli'

// DinnerDrop native shell.
// The app loads the production web app (same code as dinnerdrop.app) inside a
// native container and adds what a website cannot: push notifications ("your
// plan is ready", "grocery day"), the native share sheet for meal plans, haptic
// feedback, a home-screen icon with splash, and offline access to the grocery
// list via the site's service worker. Subscriptions are managed on the web —
// the app never sells or links to the subscription (no IAP).
const config: CapacitorConfig = {
  appId: 'app.dinnerdrop.mobile',
  appName: 'DinnerDrop',
  webDir: 'www',
  server: {
    url: 'https://www.dinnerdrop.app/dashboard?utm_source=app',
    // Keep navigation inside the shell for our own domain; checkout/Instacart/
    // Kroger open in the system browser via allowNavigation exclusions.
    allowNavigation: ['www.dinnerdrop.app', 'dinnerdrop.app', '*.supabase.co'],
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#FBF8F1',
    scheme: 'DinnerDrop',
  },
  android: {
    backgroundColor: '#FBF8F1',
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#1a5c38',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1a5c38',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
