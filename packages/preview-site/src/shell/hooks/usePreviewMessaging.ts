import { useEffect, useRef, type RefObject } from 'react';

import { useUiStore } from '../store';
import type { RuntimeVariantInputs } from '../preview-frame/build-inputs';

// Fallback window for the iframe-ready postMessage. The template
// normally posts within ~50ms of root.render; 6s is generous enough
// to cover slow CI machines and still bound the user-visible "stuck
// overlay" experience if the template crashes during boot.
const READY_FALLBACK_MS = 6000;

interface UsePreviewMessagingArgs {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  lastReadyHash: string | null;
  runtimeVariants: RuntimeVariantInputs;
}

/**
 * The postMessage bridge between the playground shell and the running
 * iframe. Owns three concerns:
 *
 *   1. iframe-ready signal — the template posts `eikon:preview-ready` once
 *      its `eikon:set-variant` listener is installed; we mark the shell
 *      overlay ready and push the current runtime-axis snapshot in reply.
 *   2. ready fallback — clear the overlay after `READY_FALLBACK_MS` even
 *      if the template crashed before posting, so any error UI is visible.
 *   3. runtime-variant push — when the user flips a visual axis, push the
 *      new values into the live iframe (no rebuild, no remount, no flash).
 */
export function usePreviewMessaging({
  iframeRef,
  lastReadyHash,
  runtimeVariants,
}: UsePreviewMessagingArgs): void {
  const setIframeReadyHash = useUiStore((s) => s.setIframeReadyHash);

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

  // ---- iframe-ready signal -----------------------------------------------
  //
  // The template's `LayoutVariantProvider` posts
  // `{type:'eikon:preview-ready'}` to its parent inside its mount-time
  // `useEffect`, AFTER its `eikon:set-variant` listener has been
  // installed (see that file's header for the listener-then-post race
  // it avoids). We treat that as the "real" ready signal for the
  // shell-level overlay — `iframe.onLoad` is too early, since it fires
  // when the HTML is parsed but the dark `<body>` hasn't been
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
      // P4.15: belt-and-braces origin check. The iframe is same-origin
      // (`/preview/<hash>/` is served by the same host), so any message
      // from a different origin is by definition NOT from our iframe
      // and should be ignored. The `event.source` check below catches
      // postMessages from unrelated windows (extensions, opener), but
      // origin verification is the standard guard cited in MDN and CSP
      // guidance — pinning both is cheap insurance.
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: unknown } | null;
      if (!data || data.type !== 'eikon:preview-ready') return;
      const h = lastReadyHashRef.current;
      if (h) setIframeReadyHash(h);
      // Push the playground's current runtime-axis snapshot into the
      // newly-mounted iframe. Unlike a CLI-scaffolded project — whose
      // `inject-html-variants.ts` stamps the chosen axes onto
      // `<html data-…>` at scaffold time — the playground builder
      // serves an unstamped `index.html` (a single max-capability
      // bundle is shared by every parameter combo). So the iframe
      // boots with schema defaults and relies entirely on this
      // response to learn the user's current selection. The reply
      // also accounts for any axis the user changed between build
      // start and iframe boot.
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
  // The 4 visual axes (`design`, `ui`, `layout`, `toastPosition`) are
  // switched at runtime inside the iframe. Whenever the user flips any
  // control, we postMessage the new values into the live iframe so it
  // updates in place — no rebuild, no remount, no flash. Three listeners
  // inside the template share this single message type, each gated to
  // dev + same-origin iframes:
  //   - `main.tsx` applies `design` / `ui` as a class on `<html>`
  //   - `LayoutVariantProvider` dispatches `layout` via React Context
  //   - `Toaster` updates `toastPosition` in its own state
  //
  // `platform` doesn't ride this channel — see RuntimeVariantInputs:
  // the iframe already mounts a max-capability bundle, and the device
  // chrome that the user sees flip is purely shell-side. `pm` and
  // `supabase` similarly don't ride here — they only affect the
  // file-tree / package.json simulator outputs.
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
  }, [runtimeVariants, iframeRef]);
}
