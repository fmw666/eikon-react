import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { type ParamsStore } from '@/lib/params-store';

import { DeviceShell, type DevicePlatform } from './device-shell';
import { MOBILE_SCREEN, DESKTOP_SCREEN, PHONE_GEOMETRY } from './device-shell/types';
import { TITLE_BAR_HEIGHT } from './device-shell/DesktopShell';
import { CHROME_TAB_BAR_HEIGHT, CHROME_TOOLBAR_HEIGHT } from './device-shell/WebShell';
import { useShellStore, useUiStore } from './store';
import type { FrameSize } from './store';

type BuildStatus = 'ready' | 'building' | 'error';

interface BuildState {
  hash: string;
  status: BuildStatus;
  error?: string;
}

interface BuildInputs {
  platform: string;
  supabase: boolean;
}

/**
 * Phase G: design / ui / layout / toastPosition no longer affect the
 * built bundle (they're switched at runtime via CSS class on `<html>`,
 * a React Context, and component state). They live in their own
 * snapshot here so the build effect doesn't re-fire when the user only
 * changed a runtime axis — a runtime-axis flip is a single
 * postMessage, not an HTTP round-trip.
 */
interface RuntimeVariantInputs {
  design: string;
  ui: string;
  layout: string;
  toastPosition: string;
}

const KNOWN_PLATFORMS: ReadonlySet<DevicePlatform> = new Set([
  'web',
  'desktop',
  'mobile',
]);

const SCROLLBAR_STYLE_ID = 'eikon-device-scrollbar';

function getDeviceScrollbarCSS(platform: DevicePlatform): string {
  if (platform === 'mobile') {
    return `
      html, body, * {
        scrollbar-width: none !important;
      }
      ::-webkit-scrollbar {
        display: none !important;
      }
    `;
  }
  if (platform === 'desktop') {
    return `
      * { scrollbar-width: thin; scrollbar-color: rgba(120,120,128,0.3) transparent; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background: rgba(120,120,128,0.25);
        border-radius: 999px;
        border: 1.5px solid transparent;
        background-clip: padding-box;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(120,120,128,0.5);
        border: 1.5px solid transparent;
        background-clip: padding-box;
      }
      ::-webkit-scrollbar-corner { background: transparent; }
    `;
  }
  // web — Chrome style
  return `
    * { scrollbar-width: thin; scrollbar-color: rgba(100,100,110,0.35) rgba(240,240,240,0.4); }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: rgba(240,240,242,0.5); border-radius: 999px; }
    ::-webkit-scrollbar-thumb {
      background: rgba(100,100,110,0.3);
      border-radius: 999px;
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(100,100,110,0.55);
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    ::-webkit-scrollbar-corner { background: transparent; }
  `;
}

function injectScrollbarStyle(iframe: HTMLIFrameElement, platform: DevicePlatform): void {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;
    let style = doc.getElementById(SCROLLBAR_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement('style');
      style.id = SCROLLBAR_STYLE_ID;
      doc.head.appendChild(style);
    }
    style.textContent = getDeviceScrollbarCSS(platform);
  } catch {
    // Cross-origin or iframe not ready — silently skip
  }
}

/**
 * Coerce the param-store's free-form `platform` string into the union
 * `DeviceShell` expects. Anything unknown falls back to `web` so the
 * shell still renders something sensible — the schema's coercion guard
 * already filters bad values out of the URL, but we double-check here
 * because the playground sometimes hot-loads a stored state from a
 * previous session that pre-dates today's enum.
 */
function coercePlatform(raw: string): DevicePlatform {
  return KNOWN_PLATFORMS.has(raw as DevicePlatform)
    ? (raw as DevicePlatform)
    : 'web';
}

/**
 * Outer padding around the device shell so it doesn't sit flush against
 * the pane edges. iPhone-style chrome casts the most prominent shadow
 * and benefits from a touch more breathing room.
 *
 * Mobile viewports (≤ 640px) get tighter padding because every pixel
 * the chrome eats is a pixel the simulated device screen loses — at
 * 360px viewport width, a 24px gutter on each side leaves only 312px
 * for the iPhone mockup that itself wants to render at 375px. We
 * scale down to a 6-8px margin so the device is the dominant
 * citizen and the user actually sees the rendered template.
 */
function pickShellPadding(platform: DevicePlatform, isMobileViewport: boolean): number {
  if (isMobileViewport) {
    return platform === 'mobile' ? 8 : 6;
  }
  return platform === 'mobile' ? 24 : 16;
}

/**
 * React hook wrapping `pickShellPadding` so the padding adapts in
 * real time when the user rotates a phone (portrait ↔ landscape) or
 * resizes the desktop window across the 640px breakpoint.
 *
 * SSR-safe: initialises from `matchMedia` synchronously when `window`
 * exists (this is a Vite SPA, no SSR), otherwise defaults to the
 * desktop padding.
 */
function useShellOuterPadding(platform: DevicePlatform): number {
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return false;
    }
    return window.matchMedia('(max-width: 640px)').matches;
  });
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return pickShellPadding(platform, isMobileViewport);
}

function getShellNaturalSize(platform: DevicePlatform, size: FrameSize): { width: number; height: number } {
  if (platform === 'mobile') {
    const screen = MOBILE_SCREEN[size];
    const geo = PHONE_GEOMETRY[size];
    // MobileShell uses content-box with padding:bezel, so rendered size
    // = (screen + bezel*2) [content] + bezel*2 [padding]
    return {
      width: screen.width + geo.bezel * 4,
      height: screen.height + geo.bezel * 4,
    };
  }
  const screen = DESKTOP_SCREEN[size];
  if (platform === 'desktop') {
    return { width: screen.width, height: screen.height + TITLE_BAR_HEIGHT };
  }
  return { width: screen.width, height: screen.height + CHROME_TAB_BAR_HEIGHT + CHROME_TOOLBAR_HEIGHT };
}

function ScaledShellWrapper({ platform, size, children }: { platform: DevicePlatform; size: FrameSize; children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [enableTransition, setEnableTransition] = useState(false);
  const prevPlatformRef = useRef(platform);
  const natural = getShellNaturalSize(platform, size);

  // Disable transition on platform change so scale snaps instantly
  useLayoutEffect(() => {
    if (prevPlatformRef.current !== platform) {
      prevPlatformRef.current = platform;
      setEnableTransition(false);
    }
  }, [platform]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const recalc = () => {
      // Use offsetWidth/offsetHeight instead of getBoundingClientRect()
      // because the workbench card has a scroll-driven scale animation
      // and BCR reflects ancestor transforms, giving wrong values.
      const w = wrapper.offsetWidth;
      const h = wrapper.offsetHeight;
      if (!w || !h) return;
      const s = Math.min(1, w / natural.width, h / natural.height);
      setScale(s);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [natural.width, natural.height]);

  // Enable transition after layout settles
  useEffect(() => {
    if (!enableTransition) {
      const timer = setTimeout(() => setEnableTransition(true), 400);
      return () => clearTimeout(timer);
    }
  }, [enableTransition]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0, transform: `scale(${scale})`, transformOrigin: 'center center', transition: enableTransition ? 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none' }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Snapshot the iframe's current location relative to `/preview/<hash>/` so we
 * can preserve the user's in-template route when swapping to a new hash.
 *
 * Returns '' if the iframe hasn't loaded, has a cross-origin document (it
 * shouldn't — we serve same-origin), or the URL doesn't look like a preview
 * URL. Falling back to '' just sends the new iframe to the variant's root.
 */
function readIframeSubUrl(iframe: HTMLIFrameElement | null): string {
  if (!iframe?.contentWindow) return '';
  try {
    const loc = iframe.contentWindow.location;
    const sub = loc.pathname.replace(/^\/preview\/[^/]+\/?/, '');
    return sub + loc.search + loc.hash;
  } catch {
    return '';
  }
}

const REV_POLL_INTERVAL_MS = 2000;
const BUILD_POLL_INITIAL_MS = 200;
const BUILD_POLL_MIN_MS = 500;
const BUILD_POLL_MAX_MS = 4000;
// Fallback window for the iframe-ready postMessage. The template
// normally posts within ~50ms of root.render; 6s is generous enough
// to cover slow CI machines and still bound the user-visible "stuck
// overlay" experience if the template crashes during boot.
const READY_FALLBACK_MS = 6000;

function isDocumentVisible(): boolean {
  return (
    typeof document === 'undefined' || document.visibilityState !== 'hidden'
  );
}

/**
 * Resolve when the tab becomes visible again. Used to gate background
 * polling so a backgrounded preview tab stops hammering the dev server
 * (we observed ~18k /api/template-rev fetches over a 10h dev session).
 */
function waitForVisible(): Promise<void> {
  return new Promise((resolve) => {
    if (isDocumentVisible()) {
      resolve();
      return;
    }
    const onChange = (): void => {
      if (isDocumentVisible()) {
        document.removeEventListener('visibilitychange', onChange);
        resolve();
      }
    };
    document.addEventListener('visibilitychange', onChange);
  });
}

/**
 * Centre stage iframe with on-demand template builds.
 *
 *   - Params change → POST /api/build → poll → swap iframe.src.
 *   - Cold builds keep the previous variant mounted under a translucent
 *     "Building variant…" overlay so the user always has visual context.
 *   - Hash swaps preserve the iframe's current sub-route (e.g. /counter),
 *     so editing variants doesn't kick the user back to the home page.
 *   - A background poll of /api/template-rev gives HMR-like behaviour:
 *     editing template-react/src bumps the rev, which forces a rebuild and
 *     re-mounts the iframe with the same params + same sub-route.
 */
/**
 * Project a `ParamsStore` snapshot down to ONLY the fields that contribute
 * to the build hash. Lifted out of the component so the function identity
 * is stable across renders (a fresh closure would defeat the point of
 * `useShallow` — it compares the *returned* shape).
 *
 * Phase G shrunk this to `(platform, supabase)` only. The four
 * runtime-switchable axes have their own selector below.
 */
function selectBuildInputs(s: ParamsStore): BuildInputs {
  return {
    platform: String(s.state.platform),
    supabase: !!s.state.supabase,
  };
}

/**
 * Project a `ParamsStore` snapshot down to the four runtime-switchable
 * axes. Identity-stable for the same reason as `selectBuildInputs`:
 * `useShallow` compares the returned shape, so a fresh closure here
 * would re-render on every store change.
 */
function selectRuntimeVariants(s: ParamsStore): RuntimeVariantInputs {
  return {
    design: String(s.state.design),
    ui: String(s.state.ui),
    layout: String(s.state.layout),
    toastPosition: String(s.state.toastPosition),
  };
}

export function PreviewFrame() {
  // Subscribe to ONLY the 2 fields that actually go into the build hash.
  // Toggling `pm` mutates the CLI snippet but must NOT re-trigger a build
  // effect — the package manager only matters at scaffold time.
  // Phase G: design / ui / layout / toastPosition are runtime-only and
  // tracked via `runtimeVariants` below.
  const buildInputs = useShellStore(useShallow(selectBuildInputs));
  const runtimeVariants = useShellStore(useShallow(selectRuntimeVariants));
  const setCurrentHash = useUiStore((s) => s.setCurrentHash);
  const setBuildStatus = useUiStore((s) => s.setBuildStatus);
  const setIframeReadyHash = useUiStore((s) => s.setIframeReadyHash);
  const reloadKey = useUiStore((s) => s.reloadKey);
  const navRequest = useUiStore((s) => s.navRequest);
  const clearNavRequest = useUiStore((s) => s.clearNavRequest);
  const [lastReadyHash, setLastReadyHash] = useState<string | null>(null);
  const [subUrl, setSubUrl] = useState<string>('');
  const [templateRev, setTemplateRev] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const prevPlatformRef = useRef(buildInputs.platform);
  const platformChangedRef = useRef(false);
  // Mirror lastReadyHash into a ref so the postMessage listener can
  // read the freshest hash without re-subscribing on every change —
  // the listener is registered once at mount.
  const lastReadyHashRef = useRef<string | null>(null);
  useEffect(() => {
    lastReadyHashRef.current = lastReadyHash;
  }, [lastReadyHash]);
  // Mirror the runtime variant snapshot so the `eikon:preview-ready`
  // handler can push the current values into a freshly-mounted iframe
  // without re-subscribing the listener on every variant change.
  const runtimeVariantsRef = useRef(runtimeVariants);
  useEffect(() => {
    runtimeVariantsRef.current = runtimeVariants;
  }, [runtimeVariants]);

  // Reset sub-route when platform changes — the new build may not
  // have the same routes, and the iframe remounts anyway (shell swap).
  useEffect(() => {
    if (prevPlatformRef.current !== buildInputs.platform) {
      prevPlatformRef.current = buildInputs.platform;
      setSubUrl('');
      platformChangedRef.current = true;
    }
  }, [buildInputs.platform]);

  // ---- iframe-ready signal -----------------------------------------------
  //
  // The template's `main.tsx` posts `{type:'eikon:preview-ready'}` to its
  // parent AFTER React mounts. We treat that as the "real" ready signal
  // for the shell-level overlay — `iframe.onLoad` is too early, since it
  // fires when the HTML is parsed but the dark `<body>` hasn't been
  // overwritten by any React-rendered content yet, producing a 1-3s
  // black flash on every variant switch.
  //
  // Belt-and-suspenders timeout: if the template fails to mount (build
  // crash, runtime error in App), the postMessage never arrives and the
  // overlay would be stuck. Fall back to clearing on `lastReadyHash`
  // change after `READY_FALLBACK_MS` so the user at least sees whatever
  // the iframe DID paint (the build error overlay, the partial page).
  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: unknown } | null;
      if (!data || data.type !== 'eikon:preview-ready') return;
      const h = lastReadyHashRef.current;
      if (h) setIframeReadyHash(h);
      // Push the playground's current runtime-axis snapshot into the
      // newly-mounted iframe. The template's `index.html` already carries
      // the *initial* values via class / data attributes, but the user
      // may have changed any of the four runtime axes between when the
      // build started and when the iframe finished booting. Sending this
      // immediately on `eikon:preview-ready` keeps the freshly-painted
      // iframe in sync with the param store without an extra round-trip.
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      const v = runtimeVariantsRef.current;
      win.postMessage(
        {
          type: 'eikon:set-variant',
          design: v.design,
          ui: v.ui,
          layout: v.layout,
          toastPosition: v.toastPosition,
        },
        '*'
      );
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // setIframeReadyHash is stable; deliberately empty deps so the
    // listener mounts once and survives every iframe remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback: if the postMessage never arrives within READY_FALLBACK_MS
  // of `lastReadyHash` becoming a new value, mark the iframe ready
  // anyway so the overlay clears and any error UI inside the iframe
  // becomes visible.
  useEffect(() => {
    if (!lastReadyHash) return;
    const timer = setTimeout(() => {
      setIframeReadyHash(lastReadyHash);
    }, READY_FALLBACK_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastReadyHash]);

  // ---- Runtime variant push ---------------------------------------------
  //
  // Phase G: design / ui / layout / toastPosition are switched at runtime
  // inside the iframe. Whenever the user flips any of these in the
  // playground, we postMessage the new values into the live iframe so it
  // updates in place — no rebuild, no remount, no flash. The template's
  // `main.tsx` listens for `eikon:set-variant` (gated to dev + same-origin
  // iframes) and applies the change via CSS class / Context dispatch.
  //
  // We don't gate on `lastReadyHash` here: when the iframe hasn't booted
  // yet, `contentWindow` simply isn't there to receive the message and
  // the postMessage no-ops. The `eikon:preview-ready` handler above
  // re-pushes the current snapshot once boot completes, so the iframe
  // catches up regardless of the relative ordering of "user flipped a
  // toggle" vs "iframe finished mounting".
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: 'eikon:set-variant',
        design: runtimeVariants.design,
        ui: runtimeVariants.ui,
        layout: runtimeVariants.layout,
        toastPosition: runtimeVariants.toastPosition,
      },
      '*'
    );
  }, [runtimeVariants]);

  // ---- /api/template-rev polling (HMR-like) ------------------------------
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let ctrl: AbortController | null = null;

    async function poll(): Promise<void> {
      // Hidden tabs don't need to know about template changes — pause
      // until the user comes back.
      await waitForVisible();
      if (cancelled) return;
      ctrl = new AbortController();
      try {
        const r = await fetch('/api/template-rev', { signal: ctrl.signal });
        if (cancelled) return;
        const j = (await r.json()) as { rev?: string };
        if (j.rev) {
          setTemplateRev((prev) => (prev === j.rev ? prev : j.rev!));
        }
      } catch {
        // Server might be restarting; just wait and retry.
      } finally {
        if (!cancelled) {
          timer = setTimeout(() => void poll(), REV_POLL_INTERVAL_MS);
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      ctrl?.abort();
    };
  }, []);

  // ---- Build orchestration ----------------------------------------------
  //
  // We re-run on `buildInputs` (hash-affecting params only) and `templateRev`
  // (the watcher's "source changed, rebuild" signal). Tooling params like
  // `pm` deliberately don't drive this effect — they only change the
  // suggested CLI command, not the rendered project.
  useEffect(() => {
    const seq = ++requestSeq.current;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let pollDelay = BUILD_POLL_MIN_MS;
    const ctrl = new AbortController();

    function adopt(next: BuildState): void {
      // Mirror the build lifecycle into the shared store so the App-level
      // overlay covers the whole `<main>` (Files + Editor + Preview)
      // instead of just the iframe panel. We surface 'building' / 'error'
      // immediately, but only flip to 'ready' AFTER `currentHash` is
      // updated below — sibling panels gate themselves on `currentHash`,
      // so updating the two atomically (status before hash for failure,
      // hash before status for success) keeps the overlay tight.
      if (next.status === 'building') {
        setBuildStatus('building');
        return;
      }
      if (next.status === 'error') {
        setBuildStatus('error', next.error ?? null);
        return;
      }
      // Capture wherever the user has navigated inside the previous
      // variant so we can re-mount the new variant at the same place.
      // Skip when the platform just changed — old routes likely don't
      // exist in the new build.
      const sub = platformChangedRef.current ? '' : readIframeSubUrl(iframeRef.current);
      platformChangedRef.current = false;
      setSubUrl(sub);
      setLastReadyHash(next.hash);
      // Broadcast the current ready hash so sibling panels (file explorer,
      // code view) target the right cache dir for /api/files & /api/file.
      setCurrentHash(next.hash);
      // Build dist exists; pixel-level "ready" is signalled by the iframe
      // and tree onLoad reporters. The unified overlay reads those.
      setBuildStatus('ready');
    }

    async function pollUntilDone(hash: string): Promise<void> {
      await waitForVisible();
      if (cancelled || seq !== requestSeq.current) return;
      const r = await fetch(
        `/api/build-status?hash=${encodeURIComponent(hash)}`,
        { signal: ctrl.signal }
      );
      if (cancelled || seq !== requestSeq.current) return;
      const next = (await r.json()) as BuildState;
      adopt(next);
      if (next.status === 'building') {
        // Exponential backoff capped at BUILD_POLL_MAX_MS — most cold
        // builds finish well before the cap; the cap exists so a stuck
        // build doesn't burn a constant 500ms interval forever.
        pollTimer = setTimeout(() => void pollUntilDone(hash), pollDelay);
        pollDelay = Math.min(Math.round(pollDelay * 1.5), BUILD_POLL_MAX_MS);
      }
    }

    async function go(): Promise<void> {
      const r = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildInputs),
        signal: ctrl.signal,
      });
      if (cancelled || seq !== requestSeq.current) return;
      const initial = (await r.json()) as BuildState;
      adopt(initial);
      if (initial.status === 'building') {
        pollTimer = setTimeout(
          () => void pollUntilDone(initial.hash),
          BUILD_POLL_INITIAL_MS
        );
      }
    }

    void go().catch((e: unknown) => {
      if (cancelled || seq !== requestSeq.current) return;
      if ((e as { name?: string })?.name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : String(e);
      setBuildStatus('error', msg);
    });

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      ctrl.abort();
    };
    // The zustand setters (`setCurrentHash`, `setBuildStatus`,
    // `setIframeReadyHash`) are stable across renders; omitting them
    // intentionally so the build effect doesn't re-run on store init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildInputs, templateRev]);

  // ---- Quick-jump navigation requested from the Toolbar -----------------
  //
  // The Toolbar surfaces a few common in-template routes (Home, Counter,
  // Tasks, Examples, Performance). Many of those routes don't have a
  // discoverable entry point inside the rendered iframe itself — Examples
  // and Performance especially live below the fold of the marketing
  // landing page — so the Toolbar acts as a fast lane.
  //
  // We use `history.pushState` + a synthetic `popstate` rather than
  // `iframe.contentWindow.location.assign` because react-router 6
  // listens for `popstate` and treats it as a real navigation, so the
  // SPA stays mounted (no chunk re-download, no app-bootstrap flash).
  //
  // CRITICAL: we do NOT call `setSubUrl(cleanTarget)` here. That would
  // mutate the React state that backs the iframe's `key` and force a
  // full iframe remount — defeating the whole point of pushState. The
  // next build adopt() reads the iframe's actual location via
  // `readIframeSubUrl` (which sees /preview/<hash>/<new sub-route>),
  // so position is preserved across rebuilds without parent-side state.
  //
  // If we ever lose same-origin access (we shouldn't — both parent and
  // iframe are served by the same Vite dev server), the catch falls back
  // to `location.assign` which always works at the cost of a SPA reboot.
  useEffect(() => {
    if (!navRequest) return;
    if (!lastReadyHash) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const cleanTarget = navRequest.target.replace(/^\//, '');
    const fullPath = `/preview/${lastReadyHash}/${cleanTarget}`;
    try {
      win.history.pushState({}, '', fullPath);
      win.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      try {
        win.location.assign(fullPath);
      } catch {
        // Both navigation strategies failed (extremely unlikely on
        // same-origin). The navRequest is still cleared below so the
        // user can retry.
      }
    }
    clearNavRequest();
  }, [navRequest, lastReadyHash, clearNavRequest]);


  // The iframe's src is set ONCE per (hash, subUrl) pair via React's `key`
  // remount mechanism. We deliberately don't bind it as a controlled prop —
  // any in-iframe navigation should not be clobbered by re-renders.
  const iframeSrc = lastReadyHash
    ? `/preview/${lastReadyHash}/${subUrl.replace(/^\//, '')}`
    : null;

  // Apple-styled device shell wrapping the iframe. The shell is purely
  // presentational — it adds the right macOS / Safari / iPhone chrome
  // around the iframe so the user knows at a glance which platform
  // they're previewing. The size preset (S/M/L) is a UI-only knob
  // (Toolbar segmented control), and so sits on `useUiStore` rather
  // than `useShellStore` — changing the size never invalidates the
  // build cache.
  const frameSize = useUiStore((s) => s.frameSize);
  const platform = useMemo(
    () => coercePlatform(buildInputs.platform),
    [buildInputs.platform]
  );
  const outerPadding = useShellOuterPadding(platform);

  // The iframe gets remounted when (hash, subUrl, reloadKey) change.
  // We hoist the iframe element here so DeviceShell's `children` render
  // prop can splice in the screen-style without forcing a remount on
  // every (platform, size) tweak — only the wrapping chrome rerenders.
  const iframeKey = `${lastReadyHash ?? ''}:${subUrl}:${reloadKey}`;

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        width: '100%',
        height: '100%',
        // Subtle desk-like backdrop so the shell's drop shadow has
        // something to land on. Tuned to a very faint warm cream
        // (ivory → soft butter → pale wheat) so the bright "desk"
        // sits gently inside the surrounding black playground chrome
        // — a black + warm-ivory pairing reads as premium and stops
        // the stage from feeling like a hard white cut-out against
        // the dark theme. Saturation is held WAY down so the wash
        // still reads as "off-white" rather than "yellow paper" and
        // doesn't tint screenshots of the previewed app.
        background:
          'radial-gradient(ellipse at top, #fbf8ef 0%, #f3eedb 80%, #ebe4c5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: outerPadding,
        overflow: 'hidden',
      }}
    >
      {iframeSrc && (
        <ScaledShellWrapper platform={platform} size={frameSize}>
        <DeviceShell
          platform={platform}
          size={frameSize}
          title="Eikon Preview"
          domain="eikon-react.preview"
        >
          {(screenStyle) => (
            <iframe
              ref={iframeRef}
              // Including `reloadKey` in the key lets the Toolbar's Reload
              // button force a full iframe remount (cheap full refresh of
              // the running variant) without touching params or rebuilding.
              key={iframeKey}
              src={iframeSrc}
              title="Eikon template preview"
              style={screenStyle}
              // Pixel-level "ready" for the App-level overlay is now
              // signalled by a `postMessage` from the template's
              // `main.tsx` — see the dedicated effect above. We keep
              // `onLoad` for the scrollbar-CSS injection only, which
              // genuinely is a DOM-parse-time concern (the styles need
              // to land in the iframe's <head> before its first paint).
              onLoad={() => {
                if (iframeRef.current) injectScrollbarStyle(iframeRef.current, platform);
              }}
            />
          )}
        </DeviceShell>
        </ScaledShellWrapper>
      )}

      {/*
        The build-error overlay used to live inside this panel, but a
        failed build is a project-wide event (the file tree and editor
        will be empty / stale until the user fixes the variant), so the
        error UI is now rendered at the App level alongside the unified
        loading overlay. PreviewFrame focuses purely on the iframe.
      */}
    </div>
  );
}
