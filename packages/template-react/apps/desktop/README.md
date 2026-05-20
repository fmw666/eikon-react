# Desktop shell — Tauri 2

This directory wraps the project's web bundle in a **Tauri 2** desktop
window: the React app you scaffolded under `src/` is loaded into the
host OS's system WebView (WebKit on macOS, WebView2 on Windows, WebKitGTK
on Linux), driven by a Rust core that produces 3-5 MB binaries instead
of Electron's 50-100 MB.

## Prerequisites

Tauri 2 needs a working Rust toolchain. Install via [rustup.rs](https://rustup.rs):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Windows: download from https://rustup.rs and run rustup-init.exe
```

After install, verify with `rustc --version` (should be ≥ 1.77).

Platform extras:

| OS      | Extra requirement                                           |
| ------- | ----------------------------------------------------------- |
| macOS   | Xcode Command Line Tools (`xcode-select --install`)         |
| Windows | Microsoft C++ Build Tools + WebView2 (Windows 11 has it)    |
| Linux   | `webkit2gtk-4.1`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev` |

See the official Tauri 2 prerequisites guide for current details:
<https://v2.tauri.app/start/prerequisites/>.

## Develop

From the project root:

```bash
pnpm tauri:dev
```

This:

1. Starts the Vite dev server on `http://localhost:5173` (declared in
   `tauri.conf.json` as `devUrl`).
2. Spawns a native desktop window pointing at that URL.
3. Hot-reloads the frontend via Vite; Rust changes trigger a `cargo
   build` + window restart.

## Bundle a release

```bash
pnpm tauri:build
```

Outputs platform-specific installers under
`apps/desktop/src-tauri/target/release/bundle/`:

- `*.app` + `*.dmg` (macOS)
- `*.msi` + `*.exe` (Windows)
- `*.AppImage` + `*.deb` (Linux)

⚠️ **Replace the placeholder icons first** — see `src-tauri/icons/README.md`.
A release built with the 1×1 placeholders will have an empty app icon.

## Customise

- **Window** — `src-tauri/tauri.conf.json` → `app.windows[0]`.
- **Identifier** — change `app.eikon.<project>` to your own reverse-DNS
  bundle ID. macOS code-signing depends on this being unique.
- **Rust commands** — register `#[tauri::command]` functions in
  `src-tauri/src/lib.rs` and chain them onto `Builder::default()` via
  `.invoke_handler(tauri::generate_handler![…])`. Call from React with
  `import { invoke } from '@tauri-apps/api/core'`.
