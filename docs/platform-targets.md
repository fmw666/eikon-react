# Platform targets

Eikon for React scaffolds **one React app**, then optionally wraps it in a
desktop shell (Tauri 2) or a mobile shell (Capacitor 6). The web bundle
under `src/` stays identical across all three targets — only the host
that loads it differs. Layout choices and a small handful of build-mode
switches adapt the same code to the device shape it ends up on.

This doc covers:

1. [Three targets, one app](#three-targets-one-app)
2. [Picking a target](#picking-a-target)
3. [Layout × platform matrix](#layout--platform-matrix)
4. [Desktop (Tauri 2) — prerequisites & workflow](#desktop-tauri-2--prerequisites--workflow)
5. [Mobile (Capacitor 6) — prerequisites & workflow](#mobile-capacitor-6--prerequisites--workflow)
6. [How the strip works](#how-the-strip-works)

---

## Three targets, one app

| Target  | Host                              | Output             | Where it lives in a scaffolded project |
| ------- | --------------------------------- | ------------------ | --------------------------------------- |
| `web`   | Browser (any vendor)              | Vite `dist/`       | _(no extra directory)_                  |
| `desktop` | System WebView via Tauri 2 (Rust) | `*.app` / `*.msi` / `*.AppImage` (3-5 MB) | `apps/desktop/`        |
| `mobile`  | iOS WKWebView / Android System WebView via Capacitor 6 | `*.ipa` / `*.aab`   | `apps/mobile/`         |

Mini-program targets (WeChat / Alipay / Douyin) are **not** supported —
they require a full UI-layer rewrite (their runtime doesn't ship a real
DOM) and aren't a strip-or-keep proposition. If you need one of those,
look at Taro or Remax instead.

## Picking a target

```bash
# Interactive — the CLI asks platform first, then narrows the layout list.
npx create-eikon-react my-app

# Non-interactive
npx create-eikon-react my-app --platform desktop --yes
npx create-eikon-react my-app --platform mobile --yes
npx create-eikon-react my-app --platform web --yes        # default; flag optional
```

The same `my-app` directory always contains the React source under
`src/`. Only the optional shell directories differ:

```
my-app/
├── src/                         # React app (same code on every target)
├── apps/
│   ├── desktop/                 # ← only present for --platform desktop
│   │   ├── src-tauri/           #   Rust core, tauri.conf.json, icons/
│   │   ├── package.json
│   │   └── README.md
│   └── mobile/                  # ← only present for --platform mobile
│       ├── capacitor.config.ts
│       ├── package.json
│       └── README.md
├── package.json                 # tauri:* OR cap:* scripts, never both
└── …
```

You can also change your mind later by hand: copy the desired shell
directory + the matching `tauri:*` / `cap:*` scripts out of the
template repo into your project. The strip pass is idempotent — there's
no hidden state in the rest of the tree.

## Layout × platform matrix

The `--layout` flag and the playground's layout dropdown narrow per
platform:

| Layout           | Web | Desktop | Mobile | Notes                                              |
| ---------------- | :-: | :-----: | :----: | -------------------------------------------------- |
| `stacked`        | ✅ default | ✅       | —      | Topbar + centered content. Auth shells, marketing. |
| `sidebar`        | ✅  | ✅ default | —    | Linear / Notion shape.                             |
| `topbar-sidebar` | ✅  | ✅       | —      | Top brand + persistent left nav.                   |
| `centered`       | ✅  | ✅       | ✅      | Auth-style centered card. Mobile-friendly.         |
| `mobile-drawer`  | —   | —       | ✅ default | Topbar + hamburger → left Sheet drawer.       |
| `bottom-tabs`    | —   | —       | ✅      | Fixed bottom tab bar (Spotify / Reddit shape).     |
| `bottom-tabs-fab` | —  | —       | ✅      | Bottom tabs + central FAB (Twitter / WeChat).      |

Switching platforms in the playground UI auto-snaps the layout dropdown
to the new platform's effective default — the rule lives in
[packages/preview-site/src/lib/params-store.ts](../packages/preview-site/src/lib/params-store.ts)
(`snapToPlatform`) and is mirrored on the CLI by
`PLATFORM_OVERRIDES` in [packages/create-eikon-react/src/index.ts](../packages/create-eikon-react/src/index.ts).

## Desktop (Tauri 2) — prerequisites & workflow

### Why Tauri 2 (and not Electron)

- **Binary size** — 3-5 MB Tauri vs. 50-100 MB Electron, because Tauri
  uses the host OS's WebView instead of bundling Chromium.
- **Memory** — single-digit MB at idle vs. 100+ MB.
- **Security** — Rust core, granular permissions, no Node in the renderer.
- **First-class on macOS / Windows / Linux** — and Tauri 2 added
  experimental iOS / Android targets if you ever want one binary for all
  five OSes.

### One-time setup

```bash
# Install Rust (≥ 1.77).
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Windows: download rustup-init.exe from https://rustup.rs

# Per-platform extras — see https://v2.tauri.app/start/prerequisites/
# macOS:   xcode-select --install
# Windows: Microsoft C++ Build Tools + WebView2 (built into Win11)
# Linux:   webkit2gtk-4.1, libssl-dev, libgtk-3-dev, libayatana-appindicator3-dev
```

### Develop & ship

```bash
pnpm tauri:dev      # spawns Vite dev server + native window
pnpm tauri:build    # writes installers under apps/desktop/src-tauri/target/release/bundle/
```

⚠️ Replace the placeholder icons under `apps/desktop/src-tauri/icons/`
before producing a release. Generate from any source PNG/SVG with:

```bash
pnpm --filter <project>-desktop tauri icon path/to/source.png
```

## Mobile (Capacitor 6) — prerequisites & workflow

### Why Capacitor (and not React Native)

- **Same code** — your React app runs unchanged inside a WebView. No
  separate "mobile UI tree" to maintain.
- **Familiar** — CSS / Tailwind / Radix all just work; you debug in
  Safari Web Inspector / Chrome DevTools just like the web build.
- **Native plugins** — `@capacitor/camera`, `@capacitor/geolocation`,
  `@capacitor/haptics` and the wider plugin ecosystem give you native
  capability access without a JSI shim.

If you need 60 FPS hand-rolled gestures or deep navigation animations
that have to feel like AppKit/SwiftUI, **prefer React Native** — that's
not what this template optimises for.

### One-time setup

| Target  | Required tooling                                              |
| ------- | ------------------------------------------------------------- |
| iOS     | macOS host, Xcode ≥ 15, CocoaPods (`sudo gem install cocoapods`) |
| Android | Android Studio (Hedgehog or newer), JDK 17, Android SDK Platform 34 |

The template ships **without** the `ios/` and `android/` subdirectories
because they embed your `appId`, certificates, and target SDK choices —
generate them locally:

```bash
pnpm build              # write dist/ once so capacitor.config.ts's webDir resolves
pnpm cap:add:ios        # creates apps/mobile/ios/
pnpm cap:add:android    # creates apps/mobile/android/
```

### Develop & ship

```bash
pnpm build && pnpm cap:sync    # always re-sync after a web build
pnpm cap:open:ios              # opens Xcode for archive / sign
pnpm cap:open:android          # opens Android Studio for signed bundle
```

Live-reload from a real device requires pointing `server.url` at the
LAN IP of your dev machine — see the comment in
`apps/mobile/capacitor.config.ts`.

## How the strip works

`stripFeatures` (in
[packages/create-eikon-react/src/strip-features.ts](../packages/create-eikon-react/src/strip-features.ts))
runs three platform-aware passes on top of the existing feature/variant
strip:

1. **Whole-directory removal** — `apps/desktop/` is removed unless
   `platform === 'desktop'`; `apps/mobile/` is removed unless
   `platform === 'mobile'`. Mirrors how `src/shared/supabase/` is
   removed when Supabase is disabled.
2. **`prunePackageScripts`** — drops the `tauri:*` scripts from the
   root `package.json` for every non-`desktop` platform, and the
   `cap:*` scripts for every non-`mobile` platform. JSON doesn't accept
   block comments so this can't be done with the usual marker grammar
   — it's a discrete pass.
3. **`__PROJECT_NAME__` substitution** — `copy-template.ts` rewrites
   the placeholder in `apps/desktop/src-tauri/{Cargo.toml,tauri.conf.json,…}`
   and `apps/mobile/{capacitor.config.ts,package.json,…}` to the user's
   chosen project name.

The preview playground applies all three passes too, so the file tree
shown in the playground iframe / file explorer matches what
`create-eikon-react` would scaffold on disk for the same flags. This is
a deliberate switch from the earlier `keepShells: true` opt-out: a
single tree that always carried both shells was cheaper to cache but
hid the CLI's actual platform-stripping behaviour from users skimming
the preview. Each platform now gets its own physical cache directory
(it already had its own cache hash); the option remains available on
`stripFeatures` for callers that explicitly want the union shape.
