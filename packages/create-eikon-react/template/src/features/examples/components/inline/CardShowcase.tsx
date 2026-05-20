/**
 * @file CardShowcase.tsx
 * @description Inline showcase of the three Card flavours that ship with
 * the template: plain, hoverable and structured (header + content + footer).
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

// --- Absolute Imports ---
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

// =================================================================================================
// Component
// =================================================================================================

function CardShowcase() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation('examples');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="p-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {t('sections.card.plainLabel')}
        </p>
        <p className="text-sm text-[var(--color-card-foreground)]">
          {t('sections.card.plainBody')}
        </p>
      </Card>

      <Card hoverable className="p-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
          {t('sections.card.hoverableLabel')}
        </p>
        <p className="text-sm text-[var(--color-card-foreground)]">
          {t('sections.card.hoverableBody')}
        </p>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t('sections.card.structuredLabel')}
          </p>
          <CardTitle>{t('sections.card.structuredTitle')}</CardTitle>
          <CardDescription>{t('sections.card.structuredBody')}</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-[var(--color-muted-foreground)]">
          shared/ui/card.tsx
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="outline">
            {t('sections.card.structuredAction')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { CardShowcase };
