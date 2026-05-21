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
import { PlatformPicker } from './sections/PlatformPicker';
import { PromptOutput } from './sections/PromptOutput';
import { useI18n } from './theme/i18n';

export default function PlaygroundPage() {
  const { t } = useI18n();
  // Fill the viewport below the (transparent, floating) nav region.
  // `NAV_REGION_HEIGHT_REM` is the single source of truth for the
  // nav's total visual height — keep this calc in sync if the nav's
  // top/bottom padding ever changes.
  const fillHeight = `calc(100vh - ${NAV_REGION_HEIGHT_REM}rem)`;
  return (
    // `relative` anchors the peek panel's `position: absolute`
    // overlay; `gap-4` on lg+ keeps a small breathing strip between
    // the sidebar/rail and the playground frame, mirroring the
    // home-page workbench's internal seam.
    <div
      className="relative flex min-h-[640px] gap-4 px-4 pb-4 sm:px-6 sm:pb-6"
      style={{ height: fillHeight }}
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
          },
          {
            id: 'playground-params',
            title: t('playgroundPage.paramsTitle'),
            icon: <SlidersIcon className="h-5 w-5" />,
            children: <ParamsPanel />,
          },
          {
            id: 'playground-prompt',
            title: t('playgroundPage.promptTitle'),
            icon: <TerminalIcon className="h-5 w-5" />,
            children: <PromptOutput compact />,
            fill: true,
          },
        ]}
      />

      <main className="min-h-0 min-w-0 flex-1">
        <PlaygroundShell />
      </main>
    </div>
  );
}
