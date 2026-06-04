/**
 * Snapshot the iframe's current location relative to `/preview/<hash>/` so we
 * can preserve the user's in-template route when swapping to a new hash.
 *
 * Returns '' if the iframe hasn't loaded, has a cross-origin document (it
 * shouldn't — we serve same-origin), or the URL doesn't look like a preview
 * URL. Falling back to '' just sends the new iframe to the variant's root.
 */
export function readIframeSubUrl(iframe: HTMLIFrameElement | null): string {
  if (!iframe?.contentWindow) return '';
  try {
    const loc = iframe.contentWindow.location;
    // P4.17: tighten the prefix match to the actual hash shape
    // (lower-case hex, 6–64 chars — must match `PREVIEW_PATH_RE` in
    // server/handlers.ts). The previous `[^/]+` matched ANY path
    // segment, so a navigation that landed on a non-/preview/ URL
    // (e.g. an OAuth redirect that escaped the iframe sandbox in
    // some adversarial scenario) would still slip through and get
    // appended to the next iframe's `src`. Strict regex returns ''
    // for any non-preview path so the new src lands cleanly at root.
    if (!/^\/preview\/[0-9a-f]{6,64}\/?/.test(loc.pathname)) return '';
    const sub = loc.pathname.replace(/^\/preview\/[0-9a-f]{6,64}\/?/, '');
    return sub + loc.search + loc.hash;
  } catch {
    return '';
  }
}

function isDocumentVisible(): boolean {
  return (
    typeof document === 'undefined' || document.visibilityState !== 'hidden'
  );
}

/**
 * Resolve when the tab becomes visible again. Used to gate background
 * polling so a backgrounded preview tab stops hammering the dev server
 * (we observed ~18k /api/template-rev fetches over a 10h dev session).
 *
 * P4.18: accepts an optional AbortSignal so a cancelled effect can
 * tear down the visibilitychange listener without waiting for the
 * tab to come back. Without this, an unmounted component left behind
 * a permanent listener every time it called waitForVisible() while
 * hidden — a slow leak that compounded across React strict-mode
 * double-mounts and route changes.
 */
export function waitForVisible(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }
    if (isDocumentVisible()) {
      resolve();
      return;
    }
    const onChange = (): void => {
      if (isDocumentVisible()) {
        document.removeEventListener('visibilitychange', onChange);
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }
    };
    const onAbort = (): void => {
      document.removeEventListener('visibilitychange', onChange);
      signal?.removeEventListener('abort', onAbort);
      reject(new DOMException('aborted', 'AbortError'));
    };
    document.addEventListener('visibilitychange', onChange);
    signal?.addEventListener('abort', onAbort);
  });
}
