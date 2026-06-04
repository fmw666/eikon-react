/**
 * @file WorkbenchSidebar.tsx
 * @description The workbench's left column — the collapsible sidebar
 * that stacks the parameter panel above the copyable prompt block.
 *
 * Internal to PlaygroundSection. Extracted because the
 * `CollapsibleSidebar` invocation is a chunky, self-contained
 * configuration (two `sections` with their icons, titles, rail and
 * mobile flags) that dominates the workbench's JSX. Lifting it here
 * keeps the parent's grid (sidebar + main shell) readable.
 *
 * The prompt sub-region's `anchorId` is threaded in as a prop rather
 * than imported from `PlaygroundSection.tsx` so this internal file
 * never imports back from its parent (no import cycle); the parent
 * remains the single source of truth for `PROMPT_OUTPUT_ANCHOR_ID`.
 */
import { ParamsPanel } from '@/shell/ParamsPanel';

import {
  CollapsibleSidebar,
  SlidersIcon,
  TerminalIcon,
} from '../../components/collapsible-sidebar';
import { useI18n } from '../../theme/i18n';
import { PromptOutput } from '../PromptOutput';

export interface WorkbenchSidebarProps {
  /** Anchor id for the prompt sub-region — see `PROMPT_OUTPUT_ANCHOR_ID`. */
  promptAnchorId: string;
}

export function WorkbenchSidebar({ promptAnchorId }: WorkbenchSidebarProps) {
  const { t } = useI18n();
  return (
    // ─── Left: collapsible sidebar (rail / peek / pinned)
    //     Same content as before (params + copyable prompt),
    //     now wrapped in `CollapsibleSidebar`:
    //
    //       • Default pinned — first-time visitors see the
    //         full params + prompt without having to discover
    //         the rail. This matches the home-page intent of
    //         showing the full "configure → preview → copy"
    //         loop in one viewport.
    //
    //       • After the user clicks the pin (or presses `[`)
    //         the choice is persisted to localStorage under
    //         `home-workbench`, independent of the dedicated
    //         `/playground` page's pin state.
    //
    //       • In peek state, the sidebar floats over the
    //         PlaygroundShell within the bounds of the
    //         workbench card (the card's `overflow-hidden`
    //         intentionally contains the peek panel — it
    //         never breaks out of the conic-ringed frame).
    //
    //     The `<lg` layout (mobile/tablet) bypasses the rail
    //     and renders the static stacked layout, identical to
    //     the previous behaviour.
    <CollapsibleSidebar
      storageKey="home-workbench"
      ariaLabel="Workbench controls"
      defaultPinned
      sections={[
        {
          id: 'workbench-params',
          title: t('playgroundPage.paramsTitle'),
          icon: <SlidersIcon className="h-5 w-5" />,
          children: <ParamsPanel />,
          hideFromRail: true,
          mobileDefaultOpen: false,
        },
        {
          id: 'workbench-prompt',
          anchorId: promptAnchorId,
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
  );
}
