import { useEffect, useRef, useState, type RefObject } from 'react';

import { useUiStore } from '../store';
import { readIframeSubUrl, waitForVisible } from '../preview-frame/iframe-utils';
import type { BuildInputs, BuildState } from '../preview-frame/build-inputs';

const BUILD_POLL_INITIAL_MS = 200;
const BUILD_POLL_MIN_MS = 500;
const BUILD_POLL_MAX_MS = 4000;

interface UseTemplateBuildArgs {
  buildInputs: BuildInputs;
  /**
   * `ui` projected to a primitive string. It's the only build-axis that
   * flows into `/api/build`, so a change here (not an object-identity
   * change of `buildInputs`) is what should re-run the build effect.
   */
  buildUi: string;
  /** Watcher "source changed, rebuild" signal from {@link useTemplateRev}. */
  templateRev: string | null;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

interface UseTemplateBuildResult {
  lastReadyHash: string | null;
  subUrl: string;
}

/**
 * Centre-stage build orchestration. Re-runs on `templateRev` (the
 * watcher's rebuild signal) AND on `buildUi` — `ui` is the one playground
 * param that bakes different files into the bundle (Phase J snapshots),
 * so a cycle MUST trigger a fresh `/api/build`. The other axes
 * (design / layout / toastPosition) stay runtime-postMessage and
 * deliberately don't drive this effect; they update the existing bundle
 * in-place via `eikon:set-variant` (see {@link usePreviewMessaging}).
 *
 * Owns `lastReadyHash` / `subUrl` and mirrors the build lifecycle into
 * the shared UI store so the App-level overlay can cover every panel.
 */
export function useTemplateBuild({
  buildInputs,
  buildUi,
  templateRev,
  iframeRef,
}: UseTemplateBuildArgs): UseTemplateBuildResult {
  const setCurrentHash = useUiStore((s) => s.setCurrentHash);
  const setBuildStatus = useUiStore((s) => s.setBuildStatus);
  const [lastReadyHash, setLastReadyHash] = useState<string | null>(null);
  const [subUrl, setSubUrl] = useState<string>('');
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = ++requestSeq.current;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let pollDelay = BUILD_POLL_MIN_MS;
    const ctrl = new AbortController();
    // P4.18: shared visibility-abort so pollUntilDone's waitForVisible
    // tears down its listener if the effect cleans up while hidden.
    const visAbort = new AbortController();

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
      // preview shell so template-source rebuilds preserve the route.
      const sub = readIframeSubUrl(iframeRef.current);
      setSubUrl(sub);
      setLastReadyHash(next.hash);
      // Broadcast the current ready hash so sibling panels can coordinate
      // loading overlays. File/code content itself is input-driven via
      // simulator endpoints.
      setCurrentHash(next.hash);
      // Build dist exists; pixel-level "ready" is signalled by the iframe
      // and tree onLoad reporters. The unified overlay reads those.
      setBuildStatus('ready');
    }

    async function pollUntilDone(hash: string): Promise<void> {
      try {
        await waitForVisible(visAbort.signal);
      } catch {
        return; // unmounted while hidden
      }
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
      visAbort.abort();
    };
    // The zustand setters (`setCurrentHash`, `setBuildStatus`) are stable
    // across renders; omitting them intentionally so the build effect
    // doesn't re-run on store init. `buildInputs` only changes when
    // `buildUi` changes (it's derived from it), so `buildUi` covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateRev, buildUi]);

  return { lastReadyHash, subUrl };
}
