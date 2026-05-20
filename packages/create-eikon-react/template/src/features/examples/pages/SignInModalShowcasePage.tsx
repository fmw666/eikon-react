/**
 * @file SignInModalShowcasePage.tsx
 * @description Route-level component for `/examples/sign-in-modal`.
 *
 * The SignInModal IS already mounted globally (via
 * `<SignInModalMount />` in `app/providers.tsx`) — this showcase just
 * triggers it via the auth store's open action so visitors can see
 * the same Modal the topbar Sign in button opens.
 *
 * Two triggers below open the modal directly into the matching tab
 * (sign in vs sign up); a third one opens with whatever mode was
 * active last (mirrors how a "Continue" CTA elsewhere in the app
 * would behave).
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end

// --- Third-party Libraries ---
import { LogIn, UserPlus } from 'lucide-react';

// --- Absolute Imports ---
import { useAuthActions, AuthMode } from '@/features/auth';
import { Button } from '@/shared/ui/button';

// --- Relative Imports ---
import { ShowcasePageHeader } from '../components/ShowcasePageHeader';
import { ShowcaseSection } from '../components/ShowcaseSection';

// =================================================================================================
// Component
// =================================================================================================

function SignInModalShowcasePage() {
  // @eikon:feature(i18n) begin
  const { t } = useTranslation('examples');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (_k: string, opts?: { defaultValue?: string }) =>
  //   opts?.defaultValue ?? _k;
  // @eikon:feature(i18n:fallback) end

  const { openModal } = useAuthActions();

  return (
    <div className="flex flex-col gap-8">
      <ShowcasePageHeader
        showBack
        title={t('pages.signInModal.title')}
        subtitle={t('pages.signInModal.description')}
      />

      <main className="flex flex-col gap-12">
        <ShowcaseSection
          anchor="signin-triggers"
          eyebrow={t('toc.modals')}
          title={t('pages.signInModal.openFromAnywhere')}
          description={t('pages.signInModal.modeTabHint')}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => openModal(AuthMode.SIGN_IN)}>
                <LogIn className="h-4 w-4" />
                {t('pages.signInModal.openSignIn')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => openModal(AuthMode.SIGN_UP)}
              >
                <UserPlus className="h-4 w-4" />
                {t('pages.signInModal.openSignUp')}
              </Button>
              <Button variant="outline" onClick={() => openModal()}>
                {t('pages.signInModal.openFromAnywhere')}
              </Button>
            </div>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4 text-sm">
              <p className="font-medium text-[var(--color-foreground)]">
                {t('pages.signInModal.mountedNoteTitle')}
              </p>
              <p className="mt-1 text-[var(--color-muted-foreground)]">
                {t('pages.signInModal.mountedNoteBody')}
              </p>
            </div>
          </div>
        </ShowcaseSection>
      </main>
    </div>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { SignInModalShowcasePage };
