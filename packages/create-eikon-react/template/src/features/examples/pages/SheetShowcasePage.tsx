// @eikon:variant(layout=mobile-drawer) file
/**
 * @file SheetShowcasePage.tsx
 * @description Route-level component for `/examples/sheet`.
 *
 * Two sections demonstrating the side-anchored Sheet primitive:
 *
 *   - Four edges    — Sheet anchored on each of left / right / top /
 *                     bottom, controlled by the `side` prop.
 *   - Scrollable    — long content inside a scrollable body wrapper
 *                     so that body scrolls independently while the
 *                     SheetHeader / SheetFooter stay pinned.
 *
 * Sheet is mobile-first by design (the `inset-y-0` panels eat the
 * full viewport height); on desktops it behaves like a slide-in
 * inspector / settings panel.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import * as React from 'react';

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';

// --- Absolute Imports ---
import { Button } from '@/shared/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';

// --- Relative Imports ---
import { ShowcasePageHeader } from '../components/ShowcasePageHeader';
import { ShowcaseSection } from '../components/ShowcaseSection';

// =================================================================================================
// Constants
// =================================================================================================

const SIDES = ['left', 'right', 'top', 'bottom'] as const;
type Side = (typeof SIDES)[number];

// =================================================================================================
// Component
// =================================================================================================

function SheetShowcasePage() {
  const { t } = useTranslation('examples');


  return (
    <div className="flex flex-col gap-8">
      <ShowcasePageHeader
        showBack
        title={t('pages.sheet.title')}
        subtitle={t('pages.sheet.description')}
      />

      <main className="flex flex-col gap-12">
        <ShowcaseSection
          anchor="sheet-directions"
          eyebrow={t('pages.sheet.directions.eyebrow')}
          title={t('pages.sheet.directions.title')}
          description={t('pages.sheet.directions.description')}
        >
          <div className="flex flex-wrap gap-3">
            {SIDES.map((side) => (
              <SideSheet key={side} side={side} t={t} />
            ))}
          </div>
        </ShowcaseSection>

        <ShowcaseSection
          anchor="sheet-scroll"
          eyebrow={t('pages.sheet.scroll.eyebrow')}
          title={t('pages.sheet.scroll.title')}
          description={t('pages.sheet.scroll.description')}
        >
          <ScrollableSheet t={t} />
        </ShowcaseSection>
      </main>
    </div>
  );
}

// =================================================================================================
// Side sheet (one trigger + sheet per direction)
// =================================================================================================

interface SheetTFn {
  (key: string, options?: Record<string, unknown>): string;
}

interface SideSheetProps {
  side: Side;
  t: SheetTFn;
}

function SideSheet({ side, t }: SideSheetProps) {
  const label = t(`pages.sheet.directions.${side}`);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">{label}</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>
            {t('pages.sheet.directions.body', {
              side: t(`pages.sheet.directions.${side}`),
            })}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t('pages.sheet.directions.description')}
          </p>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" size="sm">
              {t('pages.sheet.scroll.close')}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// =================================================================================================
// Scrollable sheet
// =================================================================================================

interface ScrollableSheetProps {
  t: SheetTFn;
}

/**
 * Sheet whose body content overflows the viewport. The body wrapper
 * owns its own scroll context (`overflow-y-auto`) so the
 * header + footer stay pinned while the inner list scrolls.
 */
function ScrollableSheet({ t }: ScrollableSheetProps) {
  const rows = React.useMemo(
    () => Array.from({ length: 40 }, (_, i) => i + 1),
    []
  );
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>{t('pages.sheet.scroll.openLabel')}</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t('pages.sheet.scroll.header')}</SheetTitle>
          <SheetDescription>
            {t('pages.sheet.scroll.description')}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <ul className="flex flex-col divide-y divide-[var(--color-border)] text-sm">
            {rows.map((n) => (
              <li key={n} className="py-2">
                {t('pages.sheet.scroll.row', { n })}
              </li>
            ))}
          </ul>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" size="sm">
              {t('pages.sheet.scroll.close')}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { SheetShowcasePage };
