import { useShellStore } from './store';
import { useUiStore } from './store';
import { CompactToolbar } from './toolbar/CompactToolbar';
import { ReloadButton } from './toolbar/ReloadButton';
import { FRAME_SIZES, FRAME_SIZE_LABELS } from './toolbar/frame-sizes';
import { FilesIcon } from './toolbar/icons';
import { QUICK_LINKS } from './toolbar/quick-links';
import type { MobileView } from './toolbar/types';

/**
 * Slim toolbar that sits between the params header and the resizable body.
 *
 * RESPONSIVE BEHAVIOUR
 * --------------------
 *
 * The toolbar has three responsibilities:
 *
 *   1. Parent-side panel toggle (Files)            — left.
 *   2. Iframe presentation (device-frame Size)    — middle.
 *   3. Iframe navigation (Go to + Reload)          — right.
 *
 *   Desktop / tablet (`md+`, `compact === false`)
 *
 *     [Files]            [Size: S M L | Go to: Home Counter … | Reload]
 *
 *   Mobile (`<md`, `compact === true`)
 *
 *     [Preview ▎ Files ▎ Code]                           [⋯ menu] [↻]
 *
 *     The three-pane resizable layout is unusable below ~720px (12% +
 *     20% + 25% panel minimums squash everything into unreadable
 *     strips), so the parent `PlaygroundShell` swaps to a single-pane
 *     view and we render a tab strip here in the toolbar to switch
 *     between Preview / Files / Code. Size + Go to are folded into
 *     a hover/tap popover keyed by a "⋯" button so the toolbar fits
 *     on a 360px viewport without horizontal scroll.
 *
 * The desktop branch is intentionally `flex-wrap`-friendly so even
 * on the desktop layout, an unusually small workbench card (e.g. a
 * pinned sidebar leaves only ~520px for the right pane) doesn't
 * clip the Go-to row — the row wraps to a second line instead.
 *
 * Cohesive pieces (compact layout, reload button, icons, the quick-link
 * and frame-size tables) live under `./toolbar/` — internal modules that
 * are NOT re-exported from the package barrel.
 */

export interface ToolbarProps {
  /**
   * `true` on `<md` viewports. Switches the toolbar to the mobile tab
   * strip + overflow menu. Forwarded by `PlaygroundShell` from its
   * `useIsCompactShell()` hook.
   */
  compact?: boolean;
  /** Active mobile tab. Ignored when `compact === false`. */
  mobileView?: MobileView;
  /** Setter for the mobile tab. Ignored when `compact === false`. */
  onChangeMobileView?: (next: MobileView) => void;
}

export function Toolbar({
  compact = false,
  mobileView = 'preview',
  onChangeMobileView,
}: ToolbarProps = {}) {
  const showFiles = useUiStore((s) => s.showFiles);
  const toggleFiles = useUiStore((s) => s.toggleFiles);
  const reloadPreview = useUiStore((s) => s.reloadPreview);
  const navigateInPreview = useUiStore((s) => s.navigateInPreview);
  const frameSize = useUiStore((s) => s.frameSize);
  const setFrameSize = useUiStore((s) => s.setFrameSize);
  // Every platform now renders a DeviceShell (Chrome for web, macOS
  // Sequoia for desktop, iPhone for mobile), so the size segmented
  // control is always meaningful — it picks the simulated reference
  // device.  We still read the platform so the tooltip text can
  // describe the right physical reference (Pro Max vs Monitor 24").
  const platform = useShellStore((s) => String(s.state.platform));

  if (compact) {
    return (
      <CompactToolbar
        mobileView={mobileView}
        onChangeMobileView={onChangeMobileView ?? (() => {})}
        frameSize={frameSize}
        setFrameSize={setFrameSize}
        platform={platform}
        navigateInPreview={navigateInPreview}
        reloadPreview={reloadPreview}
      />
    );
  }

  return (
    <div className="eikon-tb">
      {/*
        Only "Files" gets a toolbar toggle — Editor is a child of Files in
        the UX model (you pick a file in the tree, the editor opens). To
        close just the Editor while keeping Files open, use the × on the
        editor's title bar.
      */}
      <button
        type="button"
        onClick={toggleFiles}
        title={`${showFiles ? 'Hide' : 'Show'} file explorer`}
        aria-pressed={showFiles}
        className="eikon-tb-btn"
        data-active={showFiles || undefined}
      >
        <FilesIcon />
        <span>Files</span>
      </button>

      {/* Push the quick-jump cluster + Reload to the right edge. Files
        sits alone on the left because it controls a *parent-side* panel
        (the file explorer pane), while everything to the right of the
        spacer acts on the previewed iframe — grouping by target keeps
        the related controls visually adjacent. */}
      <span style={{ flex: 1 }} />

      {/* Frame-size segmented control. Sits LEFT of the quick-jump
        cluster because changing the frame size is much closer to the
        Files-side concern (presentation of the iframe) than to the
        in-iframe navigation controls on the far right. */}
      <span className="eikon-tb-label">Size</span>
      <div role="group" aria-label="Device frame size" className="eikon-tb-seg">
        {FRAME_SIZES.map((size) => {
          const meta = FRAME_SIZE_LABELS[size];
          const active = frameSize === size;
          // Web uses the desktop reference dimensions (Safari frames a
          // browser window, which is just a desktop window with chrome),
          // so the desktop tooltip applies to both web and desktop here.
          const tooltip =
            platform === 'mobile' ? meta.mobile : meta.desktop;
          return (
            <button
              key={size}
              type="button"
              onClick={() => setFrameSize(size)}
              title={tooltip}
              aria-pressed={active}
              className="eikon-tb-seg-btn"
              data-active={active || undefined}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      <span aria-hidden="true" className="eikon-tb-div" />

      <span className="eikon-tb-label">Go to</span>
      <div role="group" aria-label="Navigate preview" className="eikon-tb-routes">
        {QUICK_LINKS.map((link) => {
          const highlight = link.target.startsWith('/examples');
          return (
            <button
              key={link.target}
              type="button"
              onClick={() => navigateInPreview(link.target)}
              title={link.title ?? `Navigate to ${link.label}`}
              className="eikon-tb-route"
              data-accent={highlight ? 'amber' : undefined}
            >
              {link.label}
            </button>
          );
        })}
      </div>

      {/* Thin vertical divider separating "navigate inside preview"
        (quick-jump cluster) from "rebuild preview" (Reload). Both
        operate on the iframe but at different layers. */}
      <span aria-hidden="true" className="eikon-tb-div" />

      <ReloadButton onReload={reloadPreview} labelled />
    </div>
  );
}
