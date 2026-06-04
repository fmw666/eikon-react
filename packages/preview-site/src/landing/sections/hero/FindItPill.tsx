/**
 * @file FindItPill.tsx
 * @description Internal Hero piece — the bottom-right "find it" pill, a direct
 * deep-link into the GitHub repo. Kept as a sibling of Hero.tsx (not in any
 * feature barrel) so it stays a private implementation detail of the hero.
 *
 * The narrative is "want to actually find it? go read the source". Unlike the
 * secondary CTA above (which hides itself when the repo isn't configured), this
 * pill is a load-bearing piece of the Hero's bottom-right visual anchor —
 * hiding it would leave the corner feeling empty and break the terminal/pill
 * vertical pairing. So we always render it; `SITE.github.url` already falls
 * back to `https://github.com` when owner/repo aren't filled in (see
 * site-config), which is the right behaviour for a placeholder template:
 * clicking still goes *somewhere* reasonable until the user wires their real
 * repo.
 */

import { WordReveal } from '../../components/CtaButton';
import { SITE } from '../../site-config';
import { useI18n } from '../../theme/i18n';
import { GithubIcon } from './GithubIcon';

export function FindItPill() {
  const { t } = useI18n();

  return (
    <a
      href={SITE.github.url}
      target="_blank"
      rel="noreferrer"
      className="
        eikon-shimmer-hover group inline-flex items-center gap-2.5
        rounded-full border border-[var(--border-1)]
        bg-gradient-to-b from-[var(--surface-2)] to-[var(--surface-1)]
        py-2 pl-3 pr-2
        text-sm text-[var(--fg-2)] no-underline
        shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_1px_3px_rgb(0_0_0/0.25)]
        transition-all duration-200 ease-out
        hover:-translate-y-0.5
        hover:border-[var(--border-2)]
        hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.10),0_3px_8px_rgb(0_0_0/0.35)]
        hover:text-[var(--fg-1)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40
      "
      aria-label={t('hero.findIt')}
    >
      <span className="font-mono text-xs tracking-tight">
        <WordReveal>{t('hero.findIt')}</WordReveal>
      </span>
      <span
        aria-hidden="true"
        className="
          inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full
          bg-[var(--surface-0)] text-[var(--fg-2)]
          shadow-[inset_0_1px_0_rgb(255_255_255/0.06),inset_0_-1px_0_rgb(0_0_0/0.28)]
          transition-transform duration-200 ease-out
          group-hover:translate-x-0.5 group-hover:text-[var(--fg-1)]
        "
      >
        <GithubIcon className="h-3 w-3" />
      </span>
    </a>
  );
}
