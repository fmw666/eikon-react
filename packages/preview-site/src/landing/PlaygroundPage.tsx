/**
 * @file PlaygroundPage.tsx
 * @description Dedicated full-viewport playground at `/playground`.
 *
 * Layout:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │                          Nav                                  │
 *   ├──┬───────────────────────────────────────────────────────────┤
 *   │ ▎│                                                            │
 *   │ ⌖│                                                            │
 *   │ ⚙│                                                            │
 *   │ ❯│       PlaygroundShell                                      │
 *   │ ◇│       (Files | Code | Preview)                             │
 *   │ ▎│                                                            │
 *   │  │                                                            │
 *   │ 📌│                                                            │
 *   └──┴───────────────────────────────────────────────────────────┘
 *           ↑ collapsed rail (48px) on first visit if user previously
 *             collapsed; pinned-open by default otherwise.
 *             Hover the rail → panel slides out as a transient peek,
 *             overlaying the playground without resizing it.
 *             Click the pin → the panel locks into layout, the
 *             playground shrinks. `[` keyboard shortcut also toggles
 *             pin/collapse; `Esc` dismisses a transient peek.
 *
 * The sidebar carries every control + the copyable Prompt/CLI block.
 * The right pane is the playground itself, sized to fill the viewport
 * so the iframe + code editor + file tree have all the room they need.
 *
 * Params are read from the shared `useShellStore` instance — same
 * store the home page's PlaygroundSection uses — so picking a
 * platform in the sidebar here is reflected on the home section, and
 * vice versa. Persistence comes from the `UrlSync` mirror (URL query
 * + localStorage), mounted inside `PlaygroundShell`.
 *
 * Sidebar fold state is persisted independently of the home-page
 * workbench (`storageKey: 'playground-page'`), so a user who prefers
 * the dedicated page expanded but the home section collapsed gets
 * both.
 */

import { PlaygroundShell } from '@/shell/App';
import { ParamsPanel } from '@/shell/ParamsPanel';

import { NAV_REGION_HEIGHT_REM } from './nav/Nav';
import {
  CollapsibleSidebar,
  SlidersIcon,
  TargetIcon,
  TerminalIcon,
} from './components/CollapsibleSidebar';
import { PlatformPicker } from './sections/platform-picker';
import { PromptOutput } from './sections/PromptOutput';
import { useI18n } from './theme/i18n';

export default function PlaygroundPage() {
  const { t } = useI18n();
  // Fill the viewport below the (transparent, floating) nav region.
  // `NAV_REGION_HEIGHT_REM` is the single source of truth for the
  // nav's total visual height — keep this calc in sync if the nav's
  // top/bottom padding ever changes.
  //
  // We use `100dvh` (dynamic viewport height) so iOS Safari's
  // collapsing toolbar doesn't make the playground page taller than
  // the visible viewport. `100vh` falls back automatically on
  // browsers that don't support `dvh`.
  const fillHeight = `calc(100dvh - ${NAV_REGION_HEIGHT_REM}rem)`;
  return (
    // RESPONSIVE LAYOUT CONTRACT
    //
    //   `<lg`  : vertical stack — `CollapsibleSidebar` renders its
    //            mobile branch (always-open accordion of every
    //            section), the playground frame sits below it at
    //            ~60dvh so the visitor sees both without horizontal
    //            scroll. `min-h-[100dvh-NAV]` keeps the page at
    //            least viewport-tall but allows the sidebar's
    //            inherent content to grow past it.
    //   `lg+`  : horizontal row — sidebar (rail or pinned panel)
    //            on the left, playground fills the rest. The page
    //            itself is bounded to one viewport so the resizable
    //            three-pane shell inside the playground has a known
    //            parent height.
    //
    // `relative` anchors the peek panel's `position: absolute`
    // overlay (peek only fires on lg+). `gap-4` only matters on
    // lg+ — on mobile we use `gap-y-4` so the stacked sections
    // breathe vertically without leaking horizontal whitespace.
    <div
      className="relative flex flex-col gap-y-4 px-4 pb-6 sm:px-6 lg:flex-row lg:gap-x-4 lg:gap-y-0 lg:pb-6"
      style={{
        minHeight: fillHeight,
        // Only pin the height on lg+ so the home stack can grow as
        // tall as its accordion content needs to. Inline custom
        // property keeps the `lg:` query handler in one place.
        ['--eikon-pg-fill' as string]: fillHeight,
      }}
    >
      <CollapsibleSidebar
        storageKey="playground-page"
        ariaLabel="Playground controls"
        defaultPinned
        sections={[
          {
            id: 'playground-target',
            title: t('playgroundPage.targetTitle'),
            icon: <TargetIcon className="h-5 w-5" />,
            children: <PlatformPicker compact />,
            // Open on mobile — the platform picker is the lightest
            // of the three sections (3 stacked rows) and orients
            // the visitor immediately. Without it open, the page
            // opens onto a closed accordion which reads as broken.
            mobileDefaultOpen: true,
          },
          {
            id: 'playground-params',
            title: t('playgroundPage.paramsTitle'),
            icon: <SlidersIcon className="h-5 w-5" />,
            children: <ParamsPanel />,
            // Stays collapsed on mobile — the full param set is
            // long, and visitors who want to tweak just expand it.
            mobileDefaultOpen: false,
          },
          {
            id: 'playground-prompt',
            title: t('playgroundPage.promptTitle'),
            icon: <TerminalIcon className="h-5 w-5" />,
            children: <PromptOutput compact />,
            fill: true,
            // Open on mobile — this is the artifact the visitor
            // came here to copy. Default-open via the `fill`
            // fallback would also work; we're explicit for clarity.
            mobileDefaultOpen: true,
          },
        ]}
      />

      {/* Playground frame.
            <lg : fixed viewport-aware height so the iframe is
                  legible while still leaving the page scrollable past
                  it to reach the params / prompt stack below.
                  `min(70dvh, calc(100dvh - 6rem))` keeps it at most
                  one viewport tall on short phones, and at least the
                  ~640px floor of the inner shell.
            lg+ : flex-1, fills the remaining horizontal space and
                  inherits the row's pinned height. */}
      <main
        className="h-[min(70dvh,calc(100dvh-6rem))] min-h-[480px] min-w-0 flex-1 lg:h-auto lg:min-h-0"
      >
        <PlaygroundShell />
      </main>
    </div>
  );
}
