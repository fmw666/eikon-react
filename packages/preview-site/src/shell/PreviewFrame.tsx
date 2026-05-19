import { useEffect, useRef, useState } from 'react';

import { type ParamState } from '@/lib/params-schema';

import { useShellStore, useUiStore } from './store';

type BuildStatus = 'ready' | 'building' | 'error';

interface BuildState {
  hash: string;
  status: BuildStatus;
  error?: string;
}

interface BuildInputs {
  supabase: boolean;
  query: boolean;
  design: string;
  layout: string;
  ui: string;
}

function toBuildInputs(state: ParamState): BuildInputs {
  return {
    supabase: !!state.supabase,
    query: !!state.query,
    design: String(state.design),
    layout: String(state.layout),
    ui: String(state.ui),
  };
}

function describeVariant(inputs: BuildInputs): string {
  return [
    `design=${inputs.design}`,
    `layout=${inputs.layout}`,
    `ui=${inputs.ui}`,
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
const BUILD_POLL_INTERVAL_MS = 500;

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
export function PreviewFrame() {
  const state = useShellStore((s) => s.state);
  const setCurrentHash = useUiStore((s) => s.setCurrentHash);
  const reloadKey = useUiStore((s) => s.reloadKey);
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

    async function poll(): Promise<void> {
      try {
        const r = await fetch('/api/template-rev');
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
    };
  }, []);

  // ---- Build orchestration ----------------------------------------------
  //
  // We re-run on both `state` and `templateRev`: param changes are the
  // obvious driver, and templateRev changes act as a "the underlying source
  // changed, please rebuild with my current params" signal from the watcher.
  useEffect(() => {
    const seq = ++requestSeq.current;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const inputs = toBuildInputs(state);

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
      const r = await fetch(
        `/api/build-status?hash=${encodeURIComponent(hash)}`
      );
      if (cancelled || seq !== requestSeq.current) return;
      const next = (await r.json()) as BuildState;
      adopt(next);
      if (next.status === 'building') {
        pollTimer = setTimeout(
          () => void pollUntilDone(hash),
          BUILD_POLL_INTERVAL_MS
        );
      }
    }

    async function go(): Promise<void> {
      const r = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      if (cancelled || seq !== requestSeq.current) return;
      const initial = (await r.json()) as BuildState;
      adopt(initial);
      if (initial.status === 'building') {
        pollTimer = setTimeout(
          () => void pollUntilDone(initial.hash),
          // Faster first poll — most cold builds finish in ~3s; we don't
          // want users staring at a stale "building" badge after the
          // server has already flipped to ready.
          200
        );
      }
    }

    void go().catch((e: unknown) => {
      if (cancelled || seq !== requestSeq.current) return;
      setBuild({
        hash: '',
        status: 'error',
        error: e instanceof Error ? e.message : String(e),
      });
    });

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
    // `setCurrentHash` is stable across renders (zustand setter); omitting
    // intentionally to keep the build effect from re-running on store init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, templateRev]);

  const isBuilding = build?.status === 'building';
  const isError = build?.status === 'error';
  const variantLabel = describeVariant(toBuildInputs(state));

  // The iframe's src is set ONCE per (hash, subUrl) pair via React's `key`
  // remount mechanism. We deliberately don't bind it as a controlled prop —
  // any in-iframe navigation should not be clobbered by re-renders.
  const iframeSrc = lastReadyHash
    ? `/preview/${lastReadyHash}/${subUrl.replace(/^\//, '')}`
    : null;

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        width: '100%',
        height: '100%',
        background: '#fafafa',
      }}
    >
      {iframeSrc && (
        <iframe
          ref={iframeRef}
          // Including `reloadKey` in the key lets the Toolbar's Reload
          // button force a full iframe remount (cheap full refresh of the
          // running variant) without touching params or rebuilding.
          key={`${lastReadyHash}:${subUrl}:${reloadKey}`}
          src={iframeSrc}
          title="EvoMap template preview"
          style={{ width: '100%', height: '100%', border: 0 }}
        />
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
