import { useShellStore } from './store';
import { type FrameSize, useUiStore } from './store';

/**
 * Slim toolbar that sits between the params header and the resizable body.
 *
 * Layout, left-to-right:
 *
 *   [Files toggle]            [flex spacer]            [Go to ▸ Home ▸ Counter ▸ Tasks ▸ Examples ▸ Performance ▸ Not Found | Reload]
 *   ── parent-side panel  ────────────────────────────  ── all iframe-targeting controls ─────────────────────────
 *
 * Files lives alone on the LEFT because it controls a parent-side
 * panel (the file explorer pane). Everything to the RIGHT of the
 * spacer — the quick-jump cluster AND the Reload button — operates
 * on the previewed iframe and is grouped together; this puts the
 * mouse path between "go somewhere" and "reload there" zero pixels,
 * which is the most common follow-up gesture.
 *
 * Why a quick-jump cluster at all: the previewed marketing landing
 * page only links to a couple of these in-template routes (Home /
 * Counter / Tasks). The toolbar gives a uniform, always-visible
 * way to hop between them — and is the only practical entry to
 * the dev-only Examples / Performance showcase routes, which are
 * gated by `import.meta.env.DEV` and have no nav-bar link in the
 * scaffold-target's production output.
 *
 * The file currently open in the editor is already shown in the
 * CodeView header, so we don't duplicate it here.
 */

interface QuickLink {
  /** Sub-route inside the previewed app (no `/preview/<hash>` prefix). */
  target: string;
  label: string;
  /** Optional supplementary tooltip; falls back to "Navigate to <label>". */
  title?: string;
}

const QUICK_LINKS: ReadonlyArray<QuickLink> = [
  { target: '/', label: 'Home' },
  { target: '/counter', label: 'Counter' },
  { target: '/tasks', label: 'Tasks' },
  {
    target: '/examples',
    label: 'Examples',
    title: 'Component showcase (dev-only feature, stripped from scaffolded projects)',
  },
  {
    target: '/examples/performance',
    label: 'Performance',
    title: 'Web Vitals + virtual list + lazy-load demos',
  },
  // Intentionally unmatched path. The template router has a `*` catch-all
  // wired to `<NotFoundPage />`, so any URL that no feature claims falls
  // through to the 404 view — this button is the easiest way to preview
  // that state without typing into the iframe's address bar.
  {
    target: '/404',
    label: 'Not Found',
    title: 'Preview the 404 catch-all page (any unmatched route works)',
  },
];

const FRAME_SIZE_LABELS: Record<FrameSize, { label: string; mobile: string; desktop: string }> = {
  small: { label: 'S', mobile: 'iPhone SE — 375 × 667', desktop: 'Laptop — 1024 × 640' },
  standard: {
    label: 'M',
    mobile: 'iPhone 14 Pro — 390 × 844',
    desktop: 'Desktop — 1280 × 800',
  },
  large: {
    label: 'L',
    mobile: 'iPhone Pro Max — 430 × 932',
    desktop: 'Monitor — 1440 × 900',
  },
};

const FRAME_SIZES: readonly FrameSize[] = ['small', 'standard', 'large'];

export function Toolbar() {
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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: '#252526',
        color: '#d4d4d4',
        borderBottom: '1px solid #2d2d30',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
      }}
    >
      {/*
        Only "Files" gets a toolbar toggle — Editor is a child of Files in
        the UX model (you pick a file in the tree, the editor opens). To
        close just the Editor while keeping Files open, use the × on the
        editor's title bar.
      */}
      <ToggleButton
        active={showFiles}
        onClick={toggleFiles}
        label="Files"
        title={`${showFiles ? 'Hide' : 'Show'} file explorer`}
      />

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
      <span
        style={{
          color: '#8a8a8a',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginRight: 2,
        }}
      >
        Size
      </span>
      <div
        role="group"
        aria-label="Device frame size"
        style={{
          display: 'inline-flex',
          border: '1px solid #3a3a3a',
          borderRadius: 3,
          overflow: 'hidden',
          marginRight: 6,
        }}
      >
        {FRAME_SIZES.map((size, idx) => {
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
              style={{
                background: active ? '#0e639c' : 'transparent',
                color: active ? '#fff' : '#d4d4d4',
                border: 'none',
                borderLeft: idx === 0 ? 'none' : '1px solid #3a3a3a',
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                minWidth: 24,
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
      <span
        aria-hidden="true"
        style={{
          width: 1,
          height: 16,
          background: '#3a3a3a',
          margin: '0 4px',
        }}
      />


      <span
        style={{
          color: '#8a8a8a',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginRight: 2,
        }}
      >
        Go to
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {QUICK_LINKS.map((link) => (
          <QuickJumpButton
            key={link.target}
            label={link.label}
            title={link.title ?? `Navigate to ${link.label}`}
            onClick={() => navigateInPreview(link.target)}
            highlight={link.target.startsWith('/examples')}
          />
        ))}
      </div>

      {/* Thin vertical divider separating "navigate inside preview"
        (quick-jump cluster) from "rebuild preview" (Reload). Both
        operate on the iframe but at different layers. */}
      <span
        aria-hidden="true"
        style={{
          width: 1,
          height: 16,
          background: '#3a3a3a',
          margin: '0 4px',
        }}
      />

      <button
        type="button"
        onClick={reloadPreview}
        title="Reload preview"
        aria-label="Reload preview"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'transparent',
          color: '#d4d4d4',
          border: '1px solid #3a3a3a',
          borderRadius: 3,
          padding: '2px 10px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <ReloadIcon />
        <span>Reload</span>
      </button>
    </div>
  );
}

function ReloadIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89" />
      <path d="M13.5 2.5v3h-3" />
    </svg>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: active ? '#0e639c' : 'transparent',
        color: active ? '#fff' : '#d4d4d4',
        border: '1px solid ' + (active ? '#1177bb' : '#3a3a3a'),
        borderRadius: 3,
        padding: '2px 10px',
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

/**
 * Quick-jump button for the in-iframe nav row. `highlight` flags the
 * showcase routes (Examples / Performance) so they read as the toolbar's
 * value-add rather than just generic navigation — those are the routes
 * the user can't easily discover from inside the preview itself.
 */
function QuickJumpButton({
  label,
  title,
  onClick,
  highlight,
}: {
  label: string;
  title: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent',
        color: highlight ? '#f0b400' : '#d4d4d4',
        border:
          '1px solid ' + (highlight ? 'rgba(240, 180, 0, 0.45)' : '#3a3a3a'),
        borderRadius: 3,
        padding: '2px 10px',
        fontSize: 12,
        cursor: 'pointer',
        fontWeight: highlight ? 500 : 400,
      }}
    >
      {label}
    </button>
  );
}
