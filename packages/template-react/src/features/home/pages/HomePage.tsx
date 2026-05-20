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
// @eikon:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @eikon:feature(i18n) end
import { Link } from 'react-router-dom';

// --- Third-party Libraries ---
import { ArrowRight, Sparkles } from 'lucide-react';

// --- Absolute Imports ---
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

// =================================================================================================
// Component
// =================================================================================================

function HomePage() {
  // @eikon:feature(i18n) begin
  // Bind to the per-feature namespace; the bundle is fetched lazily
  // via routes.tsx's `loadNamespace('home')` call (in parallel with
  // the page chunk), so by the time we render it's resident.
  const { t } = useTranslation('home');
  // @eikon:feature(i18n) end

  // @eikon:feature(i18n:fallback) begin
  // const t = (k: string) =>
  //   ({
  //     title: 'Welcome to Eikon App',
  //     subtitle:
  //       'An AI-Agent-friendly React starter with Tailwind v4 and animate-ui.',
  //     cta: 'View the counter demo',
  //   })[k] ?? k;
  // @eikon:feature(i18n:fallback) end

  return (
    <section className="flex flex-col items-center text-center">
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1 text-xs text-[var(--color-muted-foreground)]">
        <Sparkles className="h-3.5 w-3.5" />
        React 19 · Tailwind v4 · animate-ui
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {t('title')}
      </h1>
      <p className="mt-4 max-w-2xl text-base text-[var(--color-muted-foreground)]">
        {t('subtitle')}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/counter">
            {t('cta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        {/* @eikon:feature(examples) begin */}
        {/*
          The "View examples" CTA targets the dev-only component
          showcase. Gated the same way as the route registration in
          app/router.tsx: `import.meta.env.DEV` so a production template
          build hides it, and the CLI strips this whole block from
          scaffolded projects so end users never see a broken CTA.
        */}
        {import.meta.env.DEV && (
          <Button asChild size="lg" variant="secondary">
            <Link to="/examples">
              {t('ctaExamples')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
        {/* @eikon:feature(examples) end */}
        <Button asChild size="lg" variant="outline">
          <a href="https://github.com/" target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
        </Button>
      </div>

      <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
        <Card hoverable>
          <CardHeader>
            <CardTitle>Feature-first</CardTitle>
            <CardDescription>
              Each feature owns its components, hooks, store, services and tests.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--color-muted-foreground)]">
            src/features/&lt;name&gt;/index.ts
          </CardContent>
        </Card>
        <Card hoverable>
          <CardHeader>
            <CardTitle>.agent protocol</CardTitle>
            <CardDescription>
              Portable rules and skills any AI coding agent can read.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--color-muted-foreground)]">
            .agent/rules · .agent/skills
          </CardContent>
        </Card>
        <Card hoverable>
          <CardHeader>
            <CardTitle>Modern tooling</CardTitle>
            <CardDescription>
              Vite 6 + Vitest + ESLint 9 flat + Tailwind v4 CSS-first.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-[var(--color-muted-foreground)]">
            All zero-config out of the box.
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// =================================================================================================
// Exports
// =================================================================================================

export { HomePage };
