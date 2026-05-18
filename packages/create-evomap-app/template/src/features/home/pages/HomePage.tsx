import { ArrowRight, Sparkles } from 'lucide-react';
// @evomap:feature(i18n) begin
import { useTranslation } from 'react-i18next';
// @evomap:feature(i18n) end
import { Link } from 'react-router-dom';

import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

export function HomePage() {
  // @evomap:feature(i18n) begin
  const { t } = useTranslation();
  // @evomap:feature(i18n) end

  // @evomap:feature(i18n:fallback) begin
  // const t = (k: string) =>
  //   ({
  //     'home.title': 'Welcome to EvoMap App',
  //     'home.subtitle':
  //       'An AI-Agent-friendly React starter with Tailwind v4 and animate-ui.',
  //     'home.cta': 'View the counter demo',
  //   })[k] ?? k;
  // @evomap:feature(i18n:fallback) end

  return (
    <section className="flex flex-col items-center text-center">
      <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1 text-xs text-[var(--color-muted-foreground)]">
        <Sparkles className="h-3.5 w-3.5" />
        React 19 · Tailwind v4 · animate-ui
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {t('home.title')}
      </h1>
      <p className="mt-4 max-w-2xl text-base text-[var(--color-muted-foreground)]">
        {t('home.subtitle')}
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button asChild size="lg">
          <Link to="/counter">
            {t('home.cta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer noopener"
          >
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
