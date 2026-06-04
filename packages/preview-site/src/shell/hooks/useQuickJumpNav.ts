import { useEffect, type RefObject } from 'react';

import { useUiStore } from '../store';

interface UseQuickJumpNavArgs {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  lastReadyHash: string | null;
}

/**
 * Quick-jump navigation requested from the Toolbar.
 *
 * The Toolbar surfaces a few common in-template routes (Home, Counter,
 * Tasks, Examples, Performance). Many of those routes don't have a
 * discoverable entry point inside the rendered iframe itself — Examples
 * and Performance especially live below the fold of the marketing
 * landing page — so the Toolbar acts as a fast lane.
 *
 * We use `history.pushState` + a synthetic `popstate` rather than
 * `iframe.contentWindow.location.assign` because react-router 6
 * listens for `popstate` and treats it as a real navigation, so the
 * SPA stays mounted (no chunk re-download, no app-bootstrap flash).
 *
 * CRITICAL: we do NOT call `setSubUrl(cleanTarget)` here. That would
 * mutate the React state that backs the iframe's `key` and force a
 * full iframe remount — defeating the whole point of pushState. The
 * next build adopt() reads the iframe's actual location via
 * `readIframeSubUrl` (which sees /preview/<hash>/<new sub-route>),
 * so position is preserved across rebuilds without parent-side state.
 *
 * If we ever lose same-origin access (we shouldn't — both parent and
 * iframe are served by the same Vite dev server), the catch falls back
 * to `location.assign` which always works at the cost of a SPA reboot.
 */
export function useQuickJumpNav({ iframeRef, lastReadyHash }: UseQuickJumpNavArgs): void {
  const navRequest = useUiStore((s) => s.navRequest);
  const clearNavRequest = useUiStore((s) => s.clearNavRequest);

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
  }, [navRequest, lastReadyHash, clearNavRequest, iframeRef]);
}
