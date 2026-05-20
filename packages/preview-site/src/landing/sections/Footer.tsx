/**
 * @file Footer.tsx
 * @description Bottom-of-page author / contact strip.
 *
 * Intentionally minimal: brand line on the left, contact channels in
 * the middle, copyright on the right. Anything heavier (sitemap,
 * legal links, newsletter) would compete with the Hero CTA for the
 * user's final attention before they leave — at v0.1 we'd rather
 * they leave with the email memorised.
 */

import { useI18n } from '../theme/i18n';
import { isGithubConfigured, SITE } from '../site-config';

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-12 border-t border-[var(--border-1)] bg-[var(--surface-1)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        {/* Author */}
        <div className="flex items-start gap-3">
          <AvatarMark />
          <div>
            <div className="text-sm font-semibold text-[var(--fg-1)]">
              {t('footer.author')}
            </div>
            <div className="mt-0.5 text-xs text-[var(--fg-3)]">
              {t('footer.tagline')}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-2 text-sm">
          <div className="text-xs text-[var(--fg-3)]">
            {t('footer.contactHint')}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ContactLink
              href={`mailto:${SITE.author.email}`}
              icon={<MailIcon className="h-3.5 w-3.5" />}
              label={SITE.author.email}
            />
            {/* Hide the GitHub contact entirely when site-config has
                no real repo behind it — better to drop the link than
                send the visitor to a 404 / GitHub home page. */}
            {isGithubConfigured() && (
              <ContactLink
                href={SITE.github.url}
                icon={<GithubIcon className="h-3.5 w-3.5" />}
                label={`${SITE.github.owner}/${SITE.github.repo}`}
                external
              />
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="text-xs text-[var(--fg-4)]">
          {t('footer.copyright')} · {SITE.version}
        </div>
      </div>
    </footer>
  );
}

function ContactLink({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  const externalProps = external
    ? { target: '_blank' as const, rel: 'noreferrer' }
    : {};
  return (
    <a
      href={href}
      {...externalProps}
      className="inline-flex items-center gap-1.5 text-[var(--fg-2)] no-underline transition hover:text-brand-400"
    >
      {icon}
      <span className="font-mono text-xs">{label}</span>
    </a>
  );
}

function AvatarMark() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-semibold text-white shadow-sm shadow-brand-500/30"
    >
      f
    </span>
  );
}

function MailIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function GithubIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.16c-3.2.69-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.71 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.9-.39.99 0 1.98.13 2.9.39 2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.41-5.27 5.7.41.36.78 1.06.78 2.14v3.18c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
