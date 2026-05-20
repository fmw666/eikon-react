/**
 * @file loading-gate.test.ts
 * @description Pinpoint coverage for `computeOverlayMode` — the brain of
 * the unified playground loading overlay. The function decides whether
 * to show an overlay across the entire `<main>` area, and whether to
 * render the lighter "cold" treatment (first build, no prior pixels) or
 * the heavier "rebuild" dim (switching variants on top of running
 * content).
 *
 * The coordination is deliberately cross-component (PreviewFrame writes
 * `buildStatus` / `iframeReadyHash`; FileExplorer writes
 * `treeReadyHash`), so these tests assert the matrix that connects them
 * is correct without mounting any React tree.
 */

import { describe, expect, it } from 'vitest';

import {
  computeOverlayMode,
  type LoadingGateInputs,
} from '../store';

const BASE: LoadingGateInputs = {
  buildStatus: 'idle',
  currentHash: null,
  iframeReadyHash: null,
  treeReadyHash: null,
  showFiles: false,
};

function ipt(over: Partial<LoadingGateInputs>): LoadingGateInputs {
  return { ...BASE, ...over };
}

describe('computeOverlayMode — the unified loading-overlay gate', () => {
  it('returns null at idle (no build attempted yet)', () => {
    // Before the first /api/build, nothing is happening — the playground
    // shell is mounted but the user hasn't seen any iframe load. The
    // overlay must stay quiet to avoid flashing on every cold navigation
    // to the page.
    expect(computeOverlayMode(BASE)).toBeNull();
  });

  it('returns "cold" while the very first build is in flight', () => {
    // First build of the session: no prior pixels underneath, light wash
    // treatment.
    expect(computeOverlayMode(ipt({ buildStatus: 'building' }))).toBe(
      'cold'
    );
  });

  it('returns "cold" between first build done and first iframe paint', () => {
    // The dist exists (`currentHash` is set) but the iframe hasn't
    // fired onLoad yet — the user is staring at a blank panel. Use
    // cold treatment, NOT rebuild dim, because there's no prior
    // content to dim.
    expect(
      computeOverlayMode(
        ipt({
          buildStatus: 'ready',
          currentHash: 'abc',
          iframeReadyHash: null,
          // Tree state is irrelevant when Files panel is closed.
          treeReadyHash: null,
        })
      )
    ).toBe('cold');
  });

  it('returns null when iframe paint matches currentHash and Files is closed', () => {
    // Steady state: build done, iframe loaded, Files closed → no
    // outstanding work to wait on. Overlay must clear.
    expect(
      computeOverlayMode(
        ipt({
          buildStatus: 'ready',
          currentHash: 'abc',
          iframeReadyHash: 'abc',
          showFiles: false,
        })
      )
    ).toBeNull();
  });

  it('returns "rebuild" while a NEW build is in flight on top of a running preview', () => {
    // User flipped a param. PreviewFrame has set buildStatus='building'
    // but currentHash still points to the OLD build (which is what the
    // iframe is showing). Heavy dim because there IS prior content
    // we want to mark as stale.
    expect(
      computeOverlayMode(
        ipt({
          buildStatus: 'building',
          currentHash: 'A',
          iframeReadyHash: 'A',
        })
      )
    ).toBe('rebuild');
  });

  it('returns "rebuild" between new build done and new iframe paint', () => {
    // Cache miss path: PreviewFrame just adopted the new build hash, so
    // currentHash bumped from A → B. The iframe is still mid-load (or
    // hasn't even remounted yet); iframeReadyHash still equals A.
    // Overlay must stay up so the user doesn't see the OLD iframe with
    // the NEW file tree (or vice versa).
    expect(
      computeOverlayMode(
        ipt({
          buildStatus: 'ready',
          currentHash: 'B',
          iframeReadyHash: 'A',
        })
      )
    ).toBe('rebuild');
  });

  it('clears the overlay only after BOTH iframe and tree match (Files open)', () => {
    // With Files open we have a third condition: the file-explorer's
    // /api/files fetch must have caught up to the new hash too.
    const halfReady = ipt({
      buildStatus: 'ready',
      currentHash: 'B',
      iframeReadyHash: 'B',
      treeReadyHash: 'A',
      showFiles: true,
    });
    expect(computeOverlayMode(halfReady)).toBe('rebuild');

    const fullyReady: LoadingGateInputs = {
      ...halfReady,
      treeReadyHash: 'B',
    };
    expect(computeOverlayMode(fullyReady)).toBeNull();
  });

  it('ignores the tree gate when Files panel is closed', () => {
    // The user might have closed the file explorer panel; in that case
    // the tree's /api/files fetch is invisible and should never gate
    // the overlay. Otherwise opening the panel to a stale tree would
    // unexpectedly trigger an overlay.
    expect(
      computeOverlayMode(
        ipt({
          buildStatus: 'ready',
          currentHash: 'B',
          iframeReadyHash: 'B',
          treeReadyHash: null,
          showFiles: false,
        })
      )
    ).toBeNull();
  });

  it('does NOT show the overlay during error state', () => {
    // Errors are surfaced via a separate red-tinted overlay (see
    // PlaygroundErrorOverlay in App.tsx). The loading gate must not
    // double up — the error pane has different colour, copy, and
    // semantics, so the loading overlay clearing on error is correct.
    expect(
      computeOverlayMode(
        ipt({
          buildStatus: 'error',
          currentHash: 'A',
          // Note: even with mismatched ready-hashes, error wins.
          iframeReadyHash: 'A',
          treeReadyHash: 'A',
        })
      )
    ).toBeNull();
  });

  it('gracefully handles a stale ready-hash from a cancelled build', () => {
    // Edge case: user clicked param B during build A's iframe-load
    // window, the OLD iframe's onLoad fired anyway and stamped
    // iframeReadyHash=A. Now currentHash=A still (build B hasn't
    // landed yet), buildStatus='building'. The overlay should still
    // show (rebuild mode) because of buildStatus.
    expect(
      computeOverlayMode(
        ipt({
          buildStatus: 'building',
          currentHash: 'A',
          iframeReadyHash: 'A',
        })
      )
    ).toBe('rebuild');
  });
});
