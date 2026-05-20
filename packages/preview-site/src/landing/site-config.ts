/**
 * @file site-config.ts
 * @description Single source for landing-side external references —
 * repo URL, author email, brand version. Centralised so a future
 * domain or handle change is one diff away from being site-wide.
 *
 * Anything Tailwind-/visual- is NOT here: this file is plain data only.
 */

export const SITE = {
  /** Display version. Bumped manually alongside marketing copy. */
  version: 'v0.1.0',

  /** Canonical name as shown in nav + meta tags. */
  brandName: 'Eikon-React',

  /** Public GitHub repo, used for nav link and CTAs. */
  github: {
    owner: 'fmw666',
    repo: 'eikon-react',
    url: 'https://github.com/fmw666/eikon-react',
  },

  /** Author contact surface. Email is the primary channel. */
  author: {
    handle: 'fmw',
    email: 'fmw19990718@gmail.com',
  },
} as const;

export const GITHUB_URL = SITE.github.url;
