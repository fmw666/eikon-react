# Mobile shell — Capacitor 6

This directory wraps the project's web bundle in a **Capacitor 6** native
shell: the same React app you scaffolded under `src/` runs inside a
WKWebView (iOS) or System WebView (Android), with native plugins
available for camera / geolocation / haptics / etc. via `@capacitor/*`
packages.

## Prerequisites

| Target  | Required tooling                                                           |
| ------- | -------------------------------------------------------------------------- |
| iOS     | macOS host, Xcode ≥ 15, CocoaPods (`sudo gem install cocoapods`)           |
| Android | Android Studio (Hedgehog or newer), JDK 17, Android SDK Platform 34        |
| Both    | Node ≥ 20.10 (already required by the template)                            |

See <https://capacitorjs.com/docs/getting-started/environment-setup> for
the canonical environment-setup walkthrough.

## First-time setup

The template ships **without** the `ios/` and `android/` subdirectories
because they're large (~50 MB of native project files apiece) and they
embed your `appId`, certificates, and target SDK choices that should be
generated locally rather than checked into the template repo.

From the project root:

```bash
# Build the web bundle once so capacitor.config.ts's `webDir` resolves.
pnpm build

# Add whichever platform(s) you need. Each command writes the matching
# subdirectory under apps/mobile/ and copies the current dist/ into it.
pnpm cap:add:ios       # creates apps/mobile/ios/
pnpm cap:add:android   # creates apps/mobile/android/
```

After this you'll typically commit `apps/mobile/ios/` and
`apps/mobile/android/` to source control (they're treated as part of
your project, not as generated artifacts).

## Develop

```bash
# Re-build web → re-sync into native projects.
pnpm build && pnpm cap:sync

# Open the IDE for the platform you're targeting.
pnpm --filter __PROJECT_NAME__-mobile open:ios
pnpm --filter __PROJECT_NAME__-mobile open:android
```

For live-reload from the device, see the comment on `server.url` in
`capacitor.config.ts`.

## Bundle a release

Capacitor produces standard native artifacts; the actual signing /
upload happens in Xcode / Android Studio. The web bundle inside the
native project comes from `dist/` at sync time, so always:

```bash
pnpm build && pnpm cap:sync
```

before opening Xcode / Android Studio for an Archive / Generate Signed
Bundle workflow.

## Mobile-specific notes

- **Vite base path** — `vite.config.ts` switches to `base: ''`
  (relative) when invoked with `--mode capacitor`. WebView's
  `file://` origin can't resolve absolute paths like `/assets/foo.js`,
  so the build pass that targets the mobile shell uses relative URLs.
- **Safe-area insets** — already handled by the mobile RootLayout
  variants (mobile-drawer / bottom-tabs / bottom-tabs-fab) via
  `env(safe-area-inset-*)`. Make sure `viewport-fit=cover` stays in
  `index.html` (it's there by default).
