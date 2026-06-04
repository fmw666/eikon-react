import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { DeviceShell } from './device-shell';
import { useShellStore, useUiStore } from './store';

import { ScaledShellWrapper } from './preview-frame/ScaledShellWrapper';
import { coercePlatform } from './preview-frame/geometry';
import { injectScrollbarStyle } from './preview-frame/scrollbar';
import {
  PREVIEW_BUILD_INPUTS_BASE,
  selectRuntimeVariants,
  type BuildInputs,
} from './preview-frame/build-inputs';
import { useShellOuterPadding } from './hooks/useShellOuterPadding';
import { useTemplateRev } from './hooks/useTemplateRev';
import { useTemplateBuild } from './hooks/useTemplateBuild';
import { usePreviewMessaging } from './hooks/usePreviewMessaging';
import { useQuickJumpNav } from './hooks/useQuickJumpNav';

/**
 * Centre stage iframe with on-demand template builds.
 *
 *   - Initial mount / template source change → POST /api/build → poll →
 *     swap iframe.src.
 *   - Playground param changes → postMessage into the existing iframe and
 *     refresh file/code simulator responses; no Vite rebuild.
 *   - Cold builds keep the previous variant mounted under a translucent
 *     "Building variant…" overlay so the user always has visual context.
 *   - Hash swaps preserve the iframe's current sub-route (e.g. /counter),
 *     so editing variants doesn't kick the user back to the home page.
 *   - A background poll of /api/template-rev gives HMR-like behaviour:
 *     editing template-react/src bumps the rev, which forces a rebuild and
 *     re-mounts the iframe with the same params + same sub-route.
 *
 * This component is the thin orchestrator; the iframe lifecycle, the
 * postMessage bridge and the build/loading state each live in a dedicated
 * hook under `./hooks/`, and the pure device-geometry / scrollbar / URL
 * helpers live under `./preview-frame/`.
 */
export function PreviewFrame() {
  // Subscribe to `ui` separately as a primitive: it's the only build-axis
  // that flows into `/api/build`, and we want a string change (not an
  // object identity change) to drive the build effect's dep array.
  const buildUi = useShellStore((s) => String(s.state.ui));
  const buildInputs = useMemo<BuildInputs>(
    () => ({ ...PREVIEW_BUILD_INPUTS_BASE, ui: buildUi }),
    [buildUi]
  );
  const runtimeVariants = useShellStore(useShallow(selectRuntimeVariants));
  // The device chrome (web / desktop / mobile) is shell-only — it doesn't
  // ride the `eikon:set-variant` postMessage channel because the iframe
  // already mounts a max-capability bundle (`keepAllVariants` keeps every
  // platform variant alive). Subscribe to `platform` separately so that
  // toggling the chrome doesn't push a no-op message into the iframe.
  const shellPlatformRaw = useShellStore((s) => String(s.state.platform));
  const reloadKey = useUiStore((s) => s.reloadKey);
  const frameSize = useUiStore((s) => s.frameSize);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Mirror the runtime variant snapshot so the `iframeSrc` memo (below)
  // can read the *latest* values when it recomputes on a hash/sub-route
  // change, without taking `runtimeVariants` as a dep (which would change
  // `iframe.src` on every axis flip and reload the iframe).
  const runtimeVariantsRef = useRef(runtimeVariants);
  useEffect(() => {
    runtimeVariantsRef.current = runtimeVariants;
  }, [runtimeVariants]);

  // iframe lifecycle / build orchestration / postMessage bridge / nav,
  // each owned by a dedicated hook. Data flows one way:
  //   templateRev → build (owns lastReadyHash + subUrl) → messaging + nav.
  const templateRev = useTemplateRev();
  const { lastReadyHash, subUrl } = useTemplateBuild({
    buildInputs,
    buildUi,
    templateRev,
    iframeRef,
  });
  usePreviewMessaging({ iframeRef, lastReadyHash, runtimeVariants });
  useQuickJumpNav({ iframeRef, lastReadyHash });

  // The iframe's src is snapshotted once per `iframeKey` change via this
  // useMemo. We append the current `runtimeVariants` as `__eikon*` query
  // params so the server can splice them onto `<html>` before the
  // bytes hit the iframe — exactly the same shape `inject-html-variants.ts`
  // bakes onto a CLI scaffold's `index.html`. Without this stamping the
  // iframe boots at schema defaults (design=default / ui=animate-ui /
  // layout=stacked) and only catches up after `eikon:preview-ready`
  // round-trips, producing a one-frame flash of the wrong layout.
  //
  // We read variants from `runtimeVariantsRef` instead of the live
  // `runtimeVariants` value AND keep the deps tied to `iframeKey`'s
  // sources. Why: the deps must NOT include `runtimeVariants`, otherwise
  // every axis flip would change `iframe.src` and the browser would
  // reload the iframe — defeating the runtime-postMessage design and
  // re-introducing the flash this fix is removing. The eslint disable
  // is intentional. The `__eikon` prefix avoids collision with any
  // query the template / react-router cares about; `URL.searchParams.set`
  // overwrites stale values that may have round-tripped through
  // `readIframeSubUrl` after a sub-route navigation.
  //
  // P4.29 — drift window documented: between this snapshot and the
  // iframe's `eikon:preview-ready` postMessage, the user can flip a
  // runtime axis. The resulting `<html data-…>` attributes will be
  // STALE for that brief window. The `eikon:preview-ready` handler
  // (see usePreviewMessaging) re-pushes the *live* `runtimeVariantsRef.current`
  // snapshot the moment the iframe announces it's listening, which
  // corrects the drift before any user-visible paint can land. If a
  // future change introduces a paint between iframe-boot and the
  // ready-message, this drift will become visible — re-evaluate the
  // tradeoff between dep-correctness and reload-thrash at that point.
  const iframeSrc = useMemo(() => {
    if (!lastReadyHash) return null;
    const v = runtimeVariantsRef.current;
    const u = new URL(
      `/preview/${lastReadyHash}/${subUrl.replace(/^\//, '')}`,
      window.location.origin
    );
    u.searchParams.set('__eikonDesign', v.design);
    u.searchParams.set('__eikonUi', v.ui);
    u.searchParams.set('__eikonLayout', v.layout);
    return u.pathname + u.search + u.hash;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastReadyHash, subUrl, reloadKey]);

  // Apple-styled device shell wrapping the iframe. The shell is purely
  // presentational — it adds the right macOS / Safari / iPhone chrome
  // around the iframe so the user knows at a glance which platform
  // they're previewing. The size preset (S/M/L) is a UI-only knob
  // (Toolbar segmented control), and so sits on `useUiStore` rather
  // than `useShellStore` — changing the size never invalidates the
  // build cache.
  const platform = useMemo(
    () => coercePlatform(shellPlatformRaw),
    [shellPlatformRaw]
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
              // P4.14: explicit sandbox attribute. The iframe is served
              // from the same origin (`/preview/<hash>/`), and we DO
              // need `allow-same-origin` because `injectScrollbarStyle`
              // reaches into `contentDocument` and `readIframeSubUrl`
              // reads `contentWindow.location`. The other tokens cover
              // capabilities the template legitimately uses (form
              // submit in SignInModal, opening docs links in a new tab,
              // window.confirm dialogs, history.pushState for routing).
              // Notably absent: `allow-top-navigation` (iframe MUST NOT
              // navigate the playground shell) and `allow-downloads`.
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock"
              // Pixel-level "ready" for the App-level overlay is now
              // signalled by a `postMessage` from the template's
              // `main.tsx` — see usePreviewMessaging. We keep
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
