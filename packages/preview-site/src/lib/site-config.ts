/**
 * @file site-config.ts
 * @description Single source for the site's external references — repo
 * URL, author email, brand version. Lives in `lib/` (the shell-agnostic
 * shared leaf) because it's consumed by both the landing UI AND the
 * changelog data layer (`lib/github.ts`); centralised so a future domain
 * or handle change is one diff away from being site-wide.
 *
 * Anything Tailwind-/visual- is NOT here: this file is plain data only.
 *
 * GITHUB CONFIG
 *
 *   `github.owner` and `github.repo` are intentionally empty by
 *   default. Until you point them at a real PUBLIC repository, the
 *   following surfaces gracefully degrade to "not configured":
 *
 *     - Footer's GitHub contact link is hidden.
 *     - /changelog short-circuits the GitHub API call entirely and
 *       renders an "in-template repo missing" empty state — no
 *       network requests, no 404 noise in the console.
 *
 *   Once you have a public repo with at least one tagged Release,
 *   fill in `owner` + `repo` and the changelog UI lights up
 *   automatically. `url` is derived; you don't need to edit it.
 */

const githubOwner = 'fmw666';
const githubRepo = 'eikon-react';

export const SITE = {
  /** Display version. Bumped manually alongside marketing copy. */
  version: 'v1.0.0',

  /** Canonical name as shown in nav + meta tags. */
  brandName: 'Eikon-React',

  /**
   * Public GitHub repo, used for nav link, footer link, and the
   * Changelog page's compare API. Both `owner` and `repo` are
   * intentionally empty until a real public repository exists —
   * see file header for the graceful-degradation surfaces.
   */
  github: {
    owner: githubOwner as string,
    repo: githubRepo as string,
    /**
     * Computed display URL — points at github.com only when both
     * fragments are filled in, falls back to the GitHub home page so
     * a misclick from a half-configured site never lands on a 404.
     */
    url:
      githubOwner && githubRepo
        ? `https://github.com/${githubOwner}/${githubRepo}`
        : 'https://github.com',
  },

  /** Author contact surface. Email is the primary channel. */
  author: {
    handle: 'fmw',
    email: 'fmw19990718@gmail.com',
  },
} as const;

/**
 * Single predicate every consumer should call before pointing a link
 * (or an API request) at the GitHub repo. We deliberately treat
 * "either field empty" as not-configured — a half-filled config is
 * always wrong and would just send the visitor to github.com/<owner>
 * which is rarely the intended destination.
 */
export function isGithubConfigured(): boolean {
  return SITE.github.owner.length > 0 && SITE.github.repo.length > 0;
}

export const GITHUB_URL = SITE.github.url;
