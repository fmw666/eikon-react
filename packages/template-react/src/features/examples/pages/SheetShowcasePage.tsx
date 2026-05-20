/**
 * @file SheetShowcasePage.tsx
 * @description Route-level component for `/examples/sheet`.
 *
 * Two sections demonstrating the side-anchored Sheet primitive:
 *
 *   - Four edges    — Sheet anchored on each of left / right / top /
 *                     bottom, controlled by the `side` prop.
 *   - Scrollable    — long content inside a sheet body so the
 *                     SheetBody scrolls independently while the
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
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

// --- Absolute Imports ---
import { Button } from '@/shared/ui/button';
import {
  Sheet,
  SheetBody,
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
  // @eikon:feature(i18n) begin
  const { t } = useTranslation('examples');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

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
    <Sheet side={side}>
      <SheetTrigger asChild>
        <Button variant="outline">{label}</Button>
      </SheetTrigger>
      <SheetContent description={label}>
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>
            {t('pages.sheet.directions.body', {
              side: t(`pages.sheet.directions.${side}`),
            })}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {t('pages.sheet.directions.description')}
          </p>
        </SheetBody>
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
 * Sheet whose body content overflows the viewport. The SheetBody owns
 * its own scroll context (`overflow-y-auto` in the primitive) so the
 * header + footer stay pinned while the inner list scrolls.
 */
function ScrollableSheet({ t }: ScrollableSheetProps) {
  const rows = React.useMemo(
    () => Array.from({ length: 40 }, (_, i) => i + 1),
    []
  );
  return (
    <Sheet side="right">
      <SheetTrigger asChild>
        <Button>{t('pages.sheet.scroll.openLabel')}</Button>
      </SheetTrigger>
      <SheetContent description={t('pages.sheet.scroll.header')}>
        <SheetHeader>
          <SheetTitle>{t('pages.sheet.scroll.header')}</SheetTitle>
          <SheetDescription>
            {t('pages.sheet.scroll.description')}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <ul className="flex flex-col divide-y divide-[var(--color-border)] text-sm">
            {rows.map((n) => (
              <li key={n} className="py-2">
                {t('pages.sheet.scroll.row', { n })}
              </li>
            ))}
          </ul>
        </SheetBody>
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
