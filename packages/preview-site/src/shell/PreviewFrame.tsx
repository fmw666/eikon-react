import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { type ParamsStore } from '@/lib/params-store';

import { DeviceShell, type DevicePlatform } from './DeviceShell';
import { useShellStore, useUiStore } from './store';

type BuildStatus = 'ready' | 'building' | 'error';

interface BuildState {
  hash: string;
  status: BuildStatus;
  error?: string;
}

interface BuildInputs {
  platform: string;
  supabase: boolean;
  query: boolean;
  design: string;
  layout: string;
  ui: string;
  toast: string;
}

const KNOWN_PLATFORMS: ReadonlySet<DevicePlatform> = new Set([
  'web',
  'desktop',
  'mobile',
]);

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
 */
function shellOuterPadding(platform: DevicePlatform): number {
  return platform === 'mobile' ? 24 : 16;
}

function describeVariant(inputs: BuildInputs): string {
  return [
    `platform=${inputs.platform}`,
    `design=${inputs.design}`,
    `layout=${inputs.layout}`,
    `ui=${inputs.ui}`,
    `toast=${inputs.toast}`,
    inputs.supabase ? 'supabase' : null,
    inputs.query ? 'query' : null,
  ]
    .filter(Boolean)
    .join(' · ');
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
 */
function selectBuildInputs(s: ParamsStore): BuildInputs {
  return {
    platform: String(s.state.platform),
    supabase: !!s.state.supabase,
    query: !!s.state.query,
    design: String(s.state.design),
    layout: String(s.state.layout),
    ui: String(s.state.ui),
    toast: String(s.state.toast),
  };
}

export function PreviewFrame() {
  // Subscribe to ONLY the 6 fields that actually go into the build hash.
  // Toggling `pm` mutates the CLI snippet but must NOT re-trigger a build
  // effect — the package manager only matters at scaffold time.
  const buildInputs = useShellStore(useShallow(selectBuildInputs));
  const setCurrentHash = useUiStore((s) => s.setCurrentHash);
  const reloadKey = useUiStore((s) => s.reloadKey);
  const navRequest = useUiStore((s) => s.navRequest);
  const clearNavRequest = useUiStore((s) => s.clearNavRequest);
  const [build, setBuild] = useState<BuildState | null>(null);
  const [lastReadyHash, setLastReadyHash] = useState<string | null>(null);
  const [subUrl, setSubUrl] = useState<string>('');
  const [templateRev, setTemplateRev] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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
      setBuild(next);
      if (next.status !== 'ready') return;
      // Capture wherever the user has navigated inside the previous
      // variant so we can re-mount the new variant at the same place.
      const sub = readIframeSubUrl(iframeRef.current);
      setSubUrl(sub);
      setLastReadyHash(next.hash);
      // Broadcast the current ready hash so sibling panels (file explorer,
      // code view) target the right cache dir for /api/files & /api/file.
      setCurrentHash(next.hash);
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
      setBuild({
        hash: '',
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      });
    });

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      ctrl.abort();
    };
    // `setCurrentHash` is stable across renders (zustand setter); omitting
    // intentionally to keep the build effect from re-running on store init.
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

  const isBuilding = build?.status === 'building';
  const isError = build?.status === 'error';
  const variantLabel = useMemo(() => describeVariant(buildInputs), [buildInputs]);

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
  const outerPadding = shellOuterPadding(platform);

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
        // something to land on. Slightly cooler than #fafafa to give
        // the warm Apple chrome a gentle complementary tint.
        background:
          'radial-gradient(ellipse at top, #f7f7f9 0%, #ececef 80%, #e3e3e7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: outerPadding,
        overflow: 'auto',
      }}
    >
      {iframeSrc && (
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
            />
          )}
        </DeviceShell>
      )}

      {isBuilding && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: lastReadyHash
              ? 'rgba(0,0,0,0.45)'
              : 'rgba(0,0,0,0.04)',
            color: lastReadyHash ? '#fff' : '#374151',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            pointerEvents: 'none',
            backdropFilter: lastReadyHash ? 'blur(2px)' : 'none',
            transition: 'background 120ms ease',
          }}
        >
          <div style={{ textAlign: 'center', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600 }}>
              {lastReadyHash ? 'Rebuilding variant…' : 'Building variant…'}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                opacity: 0.85,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              {variantLabel}
            </div>
            {!lastReadyHash && (
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
                first build of this combo takes a few seconds
              </div>
            )}
          </div>
        </div>
      )}

      {isError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: 16,
            background: '#fff0f0',
            color: '#7f1d1d',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 12,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 600 }}>
            Build failed for variant: {variantLabel}
          </div>
          {build?.error ?? '(no error message)'}
        </div>
      )}
    </div>
  );
}
