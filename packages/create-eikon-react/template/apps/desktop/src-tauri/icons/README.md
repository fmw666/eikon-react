# Tauri icons

This directory ships **placeholder** 1×1 transparent PNGs so `tauri dev`
boots out of the box. Before shipping a release build you must replace
them with real icons sized for each target.

## Regenerate from a source image

The Tauri CLI auto-derives every required size + format from one source
PNG/SVG (≥ 1024×1024 recommended):

```bash
pnpm --filter __PROJECT_NAME__-desktop tauri icon path/to/source.png
```

or, from inside `apps/desktop`:

```bash
pnpm tauri icon path/to/source.png
```

This rewrites `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`
(macOS), and `icon.ico` (Windows) in this directory.

## Why ship placeholders at all

Tauri 2's `tauri.conf.json` requires every entry of `bundle.icon[]` to
exist on disk; missing files fail `tauri dev` at the bundle resolution
step. Shipping near-zero-byte placeholders keeps `pnpm tauri dev` green
on a fresh scaffold while making it obvious in code review that an icon
asset still needs to be wired in.
