/**
 * @file TabsShowcase.tsx
 * @description Inline showcase of the animated Tabs primitive — the
 * shared layoutId indicator slides between triggers; reduced motion
 * disables the morph (handled inside the primitive itself).
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

// --- Absolute Imports ---
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

// =================================================================================================
// Component
// =================================================================================================

function TabsShowcase() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation('examples');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList>
        <TabsTrigger value="account">
          {t('sections.tabs.accountTab')}
        </TabsTrigger>
        <TabsTrigger value="password">
          {t('sections.tabs.passwordTab')}
        </TabsTrigger>
        <TabsTrigger value="preferences">
          {t('sections.tabs.preferencesTab')}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('sections.tabs.accountBody')}
        </p>
      </TabsContent>
      <TabsContent value="password">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('sections.tabs.passwordBody')}
        </p>
      </TabsContent>
      <TabsContent value="preferences">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {t('sections.tabs.preferencesBody')}
        </p>
      </TabsContent>
    </Tabs>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { TabsShowcase };
