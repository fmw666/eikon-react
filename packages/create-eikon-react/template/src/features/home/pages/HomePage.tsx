/**
 * @file HomePage.tsx
 * @description Marketing landing page for the template — surfaces the
 * project conventions (feature-first, .agent protocol, modern tooling)
 * and routes to the demos.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core-related Libraries ---
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// --- Third-party Libraries ---
import { ArrowRight } from 'lucide-react';

// --- Absolute Imports ---
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

// =================================================================================================
// Component
// =================================================================================================

function HomePage() {
  // Bind to the per-feature namespace; the bundle is fetched lazily
  // via routes.tsx's `loadNamespace('home')` call (in parallel with
  // the page chunk), so by the time we render it's resident.
  const { t } = useTranslation('home');


  return (
    <section className="flex flex-col items-center justify-center py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t('title')}
      </h1>
      <p className="mt-4 max-w-lg text-base text-[var(--color-muted-foreground)]">
        {t('subtitle')}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/counter">
            {t('cta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        {/* @eikon:feature(examples) begin */}
        {import.meta.env.DEV && (
          <Button asChild size="lg" variant="secondary">
            <Link to="/examples">
              {t('ctaExamples')}
            </Link>
          </Button>
        )}
        {/* @eikon:feature(examples) end */}
        <Button asChild size="lg" variant="outline">
          <a href="https://github.com/fmw666/eikon-react" target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
        </Button>
      </div>

      <div className="mt-12 grid w-full gap-4 sm:grid-cols-3">
        <Card hoverable>
          <CardHeader>
            <CardTitle>Feature-first</CardTitle>
            <CardDescription>
              Each feature owns its components, hooks, store, services and tests.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card hoverable>
          <CardHeader>
            <CardTitle>.agent protocol</CardTitle>
            <CardDescription>
              Portable rules and skills any AI coding agent can read.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card hoverable>
          <CardHeader>
            <CardTitle>Modern tooling</CardTitle>
            <CardDescription>
              Vite 6 + Vitest + ESLint 9 flat + Tailwind v4 CSS-first.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { HomePage };
