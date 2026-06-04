import { useEffect, useState } from 'react';

import { waitForVisible } from '../preview-frame/iframe-utils';

/**
 * P4.11: poll cadence is 2s in dev (so editing template-react/* feels
 * HMR-like), 30s in prod (so the deployed Fly machine isn't slammed
 * with 1800/h fetches per open tab). Production rev only changes on
 * deploy — the bake is immutable for the life of the container — so
 * the longer cadence loses nothing.
 */
const REV_POLL_INTERVAL_MS = import.meta.env.DEV ? 2000 : 30_000;

/**
 * Background poll of `/api/template-rev` that gives the preview HMR-like
 * behaviour: editing `template-react/src` bumps the rev string, which the
 * build effect (see `useTemplateBuild`) consumes to force a rebuild.
 *
 * Polling pauses while the tab is hidden (`waitForVisible`) so a
 * backgrounded preview tab stops hammering the dev server.
 */
export function useTemplateRev(): string | null {
  const [templateRev, setTemplateRev] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let ctrl: AbortController | null = null;
    // P4.18: an AbortController dedicated to waitForVisible so the
    // visibilitychange listener tears down on unmount, even if the
    // tab never comes back into the foreground.
    const visAbort = new AbortController();

    async function poll(): Promise<void> {
      // Hidden tabs don't need to know about template changes — pause
      // until the user comes back.
      try {
        await waitForVisible(visAbort.signal);
      } catch {
        return; // unmounted while hidden
      }
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
      visAbort.abort();
    };
  }, []);
  return templateRev;
}
