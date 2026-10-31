import type { CapacitorConfig } from '@capacitor/cli'

// DinnerDrop native shell.
// The app loads the production web app (same code as dinnerdrop.app) inside a
// native container and adds what a website cannot: on-device dinner reminders
// (local notifications built from the week's plan), the native camera for the
// pantry scan and receipt capture, an offline grocery list that still works
// in the store with no signal, the native share sheet, haptics, and push. Subscriptions are managed on the web —
// the app never sells or links to the subscription (no IAP).
const config: CapacitorConfig = {
  appId: 'app.dinnerdrop.mobile',
  appName: 'DinnerDrop',
  // Lets the web app (server + client) recognise the native shell and hide
  // anything that sells the subscription (App Store guideline 3.1.1).
  appendUserAgent: 'DinnerDropApp',
  webDir: 'www',
  server: {
    url: 'https://www.dinnerdrop.app/dashboard?utm_source=app',
    // Keep navigation inside the shell for our own domain; checkout/Instacart/
    // Kroger open in the system browser via allowNavigation exclusions.
    allowNavigation: ['www.dinnerdrop.app', 'dinnerdrop.app', '*.supabase.co'],
    cleartext: false,
    // Offline: the shell shows the locally bundled grocery list (cached on the
    // device by the web app) instead of a WebView error page.
    errorPath: 'offline.html',
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
    LocalNotifications: {
      // Dinner reminders ("Tonight: Sheet Pan Street Corn Chicken") are
      // scheduled on the device from the week's plan — no server involved.
      iconColor: '#1a5c38',
    },
  },
}

export default config
