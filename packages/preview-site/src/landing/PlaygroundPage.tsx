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

import { useEffect } from 'react';

import { PlaygroundShell } from '@/shell/App';
import { ParamsPanel } from '@/shell/ParamsPanel';

import { NAV_REGION_HEIGHT_REM } from './nav/Nav';
import {
  CollapsibleSidebar,
  SlidersIcon,
  TargetIcon,
  TerminalIcon,
} from './components/collapsible-sidebar';
import { PlatformPicker } from './sections/platform-picker';
import { PromptOutput } from './sections/PromptOutput';
import { useI18n } from './theme/i18n';

export default function PlaygroundPage() {
  const { t } = useI18n();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = 'hidden';
    html.style.scrollbarGutter = 'auto';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = '';
      html.style.scrollbarGutter = '';
      body.style.overflow = '';
    };
  }, []);

  const fillHeight = `calc(100dvh - ${NAV_REGION_HEIGHT_REM}rem - 0.75rem)`;
  return (
    <div
      className="relative flex flex-col gap-y-4 px-4 pb-6 sm:px-6 lg:flex-row lg:gap-x-4 lg:gap-y-0 lg:overflow-hidden lg:pb-0"
      style={{
        minHeight: fillHeight,
        ['--eikon-pg-fill' as string]: fillHeight,
        height: fillHeight,
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
            hideFromRail: true,
            mobileDefaultOpen: false,
          },
          {
            id: 'playground-prompt',
            title: t('playgroundPage.promptTitle'),
            icon: <TerminalIcon className="h-5 w-5" />,
            children: <PromptOutput compact />,
            fill: true,
            hideTitle: true,
            hideFromRail: true,
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
        className="h-[min(70dvh,calc(100dvh-6rem))] min-h-[480px] min-w-0 flex-1 lg:h-full lg:min-h-0"
      >
        <PlaygroundShell />
      </main>
    </div>
  );
}
