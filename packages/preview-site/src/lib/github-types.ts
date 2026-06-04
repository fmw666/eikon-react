/**
 * @file github-types.ts
 * @description Public payload shapes for the GitHub changelog client.
 *
 * Narrow on purpose. We only surface the fields the UI actually consumes
 * so adding/removing a column in the future is a localized diff instead
 * of touching every consumer. Internal helper (`github.ts`) re-exports
 * these so the `@/lib/github` import path stays stable.
 */

export interface GitHubRelease {
  /** Stable identifier — the immutable tag this release was cut from. */
  tagName: string;
  /** Human-friendly title; falls back to `tagName` when omitted. */
  name: string;
  /** ISO-8601 timestamp; used for the relative-date subtitle. */
  publishedAt: string;
  /** Release notes (markdown). May be empty. */
  body: string;
  /** Public link back to the release page on github.com. */
  htmlUrl: string;
  /** Whether GitHub flagged this as a pre-release. Surfaced as a badge. */
  prerelease: boolean;
  /** Whether GitHub flagged this as a draft. We filter these out by default. */
  draft: boolean;
}

export type FileChangeStatus =
  | 'added'
  | 'removed'
  | 'modified'
  | 'renamed'
  | 'copied'
  | 'changed'
  | 'unchanged';

export interface CompareFile {
  /** Path inside the repo at the head ref (or base ref for `removed`). */
  filename: string;
  /** Previous filename when `status === 'renamed'`, else undefined. */
  previousFilename?: string;
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  changes: number;
  /**
   * Unified-diff text. May be undefined for binary files or for files
   * whose patch was truncated by GitHub's 1MB-per-file cap; the UI
   * gracefully degrades to "no preview available" in that case.
   */
  patch?: string;
}

export interface CompareResult {
  base: string;
  head: string;
  /** GitHub's coarse comparison status: ahead | behind | identical | diverged. */
  status: string;
  aheadBy: number;
  behindBy: number;
  totalCommits: number;
  files: CompareFile[];
  htmlUrl: string;
}
