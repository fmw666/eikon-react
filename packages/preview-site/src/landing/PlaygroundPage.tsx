/**
 * @file PlaygroundPage.tsx
 * @description Dedicated full-viewport playground at `/playground`.
 *
 * Layout:
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │                          Nav                                  │
 *   ├──────────────────┬───────────────────────────────────────────┤
 *   │                  │                                            │
 *   │  Target          │                                            │
 *   │  · Web           │                                            │
 *   │  · Desktop       │                                            │
 *   │  · Mobile        │                                            │
 *   │                  │       PlaygroundShell                      │
 *   │  Parameters      │       (Files | Code | Preview)             │
 *   │  · Design        │                                            │
 *   │  · Layout        │                                            │
 *   │  · UI / Toast    │                                            │
 *   │  · pm            │                                            │
 *   │                  │                                            │
 *   │  Prompt / CLI    │                                            │
 *   │  ┌────────────┐  │                                            │
 *   │  │ npx … --…  │  │                                            │
 *   │  └────────────┘  │                                            │
 *   └──────────────────┴───────────────────────────────────────────┘
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
 */

import { PlaygroundShell } from '@/shell/App';

import { NAV_REGION_HEIGHT_REM } from './nav/Nav';
import { PlatformPicker } from './sections/PlatformPicker';
import { ParamsPanel } from '@/shell/ParamsPanel';
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
    <div
      className="flex min-h-[640px] gap-4 px-4 pb-4 sm:px-6 sm:pb-6"
      style={{ height: fillHeight }}
    >
      <Sidebar>
        <SidebarSection title={t('playgroundPage.targetTitle')}>
          <PlatformPicker compact />
        </SidebarSection>

        <SidebarSection title={t('playgroundPage.paramsTitle')}>
          <ParamsPanel />
        </SidebarSection>

        <SidebarSection
          title={t('playgroundPage.promptTitle')}
          fill
        >
          <PromptOutput compact />
        </SidebarSection>
      </Sidebar>

      <main className="min-h-0 min-w-0 flex-1">
        <PlaygroundShell />
      </main>
    </div>
  );
}

/**
 * Scroll container for the left controls. Width is fixed-ish (clamped
 * between 320 and 400px) so the playground always has the lion's
 * share of horizontal space. `overflow-y-auto` makes long content
 * (params card on a tall variant) scroll internally instead of
 * pushing the page into a full-window scroll.
 */
function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside
      aria-label="Playground controls"
      className="hidden w-[clamp(320px,28vw,400px)] shrink-0 flex-col gap-4 overflow-y-auto lg:flex"
    >
      {children}
    </aside>
  );
}

/**
 * Lightweight wrapper that pairs a section heading with its contents.
 * `fill` makes the section greedy on the cross-axis so the Prompt
 * card naturally consumes the remaining sidebar height instead of
 * collapsing to its `<pre>` minimum.
 */
function SidebarSection({
  title,
  fill,
  children,
}: {
  title: string;
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={'flex min-h-0 flex-col gap-2 ' + (fill ? 'flex-1' : '')}
      aria-label={title}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-3)]">
        {title}
      </h2>
      <div className={'min-h-0 ' + (fill ? 'flex flex-1 flex-col' : '')}>
        {children}
      </div>
    </section>
  );
}
