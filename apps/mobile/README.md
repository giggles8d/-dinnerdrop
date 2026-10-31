# DinnerDrop mobile shell

Capacitor 8 wrapper around https://www.dinnerdrop.app for the App Store and Google Play.

- `capacitor.config.ts` — loads the production web app (`server.url`) and adds the native layer.
- **Native features (what makes this more than a web view — App Store guideline 4.2):**
  - Dinner reminders: on-device local notifications ("Tonight: …") scheduled from the week's plan at the family's chosen time; tapping opens the recipe. `components/DinnerReminders.tsx`, `lib/native.ts`.
  - Native camera / photo picker for the pantry scan and receipt capture (`@capacitor/camera`).
  - Offline grocery list: the web app caches the list on the device (`@capacitor/preferences`); with no signal the shell shows `www/offline.html` (`server.errorPath`) where items can still be checked off, and the check-offs sync when back online.
  - Native share sheet (plan + recipes), haptics, splash/status bar, push (APNs key still to be added).
- `android/`, `ios/` — generated native projects (committed so CI builds are reproducible). Re-run `npx cap sync` after changing config or plugins.
- Builds run in GitHub Actions: `.github/workflows/mobile-android.yml` (Ubuntu) and `.github/workflows/mobile-ios.yml` (macOS). Sarah's machine is Windows, so iOS is never built locally.
- Subscriptions are web-only. The app never sells or links to the subscription (no IAP); the account page says to manage billing on dinnerdrop.app.
- Inside the iOS shell the web app hides "Continue with Google" (`lib/native.ts`) so Sign in with Apple is not required; email magic link remains.

## Secrets needed in GitHub → Settings → Secrets → Actions
Android: `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD` (upload key, alias `dinnerdrop-upload`), optional `PLAY_SERVICE_ACCOUNT_JSON` for automatic Play uploads.
iOS: `APPLE_TEAM_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_P8_B64`.

## Store facts
- Android package: `app.dinnerdrop.mobile`; versionCode = GitHub run number.
- iOS bundle id: `app.dinnerdrop.mobile`; build number = GitHub run number.
- Google Play personal accounts: 12 testers opted in for 14 continuous days on a closed track before production access.
