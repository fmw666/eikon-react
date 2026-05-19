/**
 * @file feature-i18n-parity.test.ts
 * @description Structural guard for i18n key consistency.
 *
 * For every locale shipped under `src/shared/i18n/locales/<lng>/` and
 * every feature namespace under `src/features/<feature>/i18n/<lng>.json`,
 * the set of dotted leaf keys must be identical across locales. A
 * missing key surfaces as the literal key string in the UI, which is a
 * user-visible defect — `60-i18n.md` calls this out as a hard rule.
 *
 * When the CLI strips i18n (`--no-i18n`), `src/shared/i18n/` is gone
 * and per-feature `i18n/` folders are too; in that case this suite
 * is a no-op (every assertion short-circuits via featureEnabled()).
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import path from 'node:path';

// --- Third-party Libraries ---
import { describe, expect, it } from 'vitest';

// --- Relative Imports ---
import {
  SHARED_ROOT,
  featureEnabled,
  flattenKeys,
  isDir,
  isFile,
  listFeatures,
  readDir,
  readJSON,
} from './_helpers';

// =================================================================================================
// Helpers
// =================================================================================================

interface KeyBundle {
  locale: string;
  ns: string;
  source: string;
  keys: string[];
}

function diffKeys(a: KeyBundle, b: KeyBundle): { missingInB: string[]; missingInA: string[] } {
  const setA = new Set(a.keys);
  const setB = new Set(b.keys);
  return {
    missingInB: a.keys.filter((k) => !setB.has(k)),
    missingInA: b.keys.filter((k) => !setA.has(k)),
  };
}

// camelCase OR snake_case — both are AI-greppable. snake_case is permitted
// because enum values mirroring the data model (e.g. TaskStatus = 'in_progress')
// commonly feed `t(\`status.${task.status}\`)` style lookups.
const VALID_KEY_SEGMENT = /^[a-z][a-zA-Z0-9_]*$/;

// =================================================================================================
// Tests
// =================================================================================================

describe('structure: i18n parity', () => {
  if (!featureEnabled('i18n')) {
    it.skip('i18n feature stripped — parity check disabled', () => {});
    return;
  }

  // --- shared common namespace ---
  describe('shared/i18n/locales/<lng>/common.json', () => {
    const localesDir = path.join(SHARED_ROOT, 'i18n', 'locales');
    const locales = readDir(localesDir).filter((l) => isDir(path.join(localesDir, l)));

    it('has at least one locale', () => {
      expect(locales.length).toBeGreaterThan(0);
    });

    it('every locale has a common.json file', () => {
      for (const lng of locales) {
        expect(
          isFile(path.join(localesDir, lng, 'common.json')),
          `Locale '${lng}' is missing common.json`
        ).toBe(true);
      }
    });

    it('every common.json shares the exact same key set', () => {
      const bundles: KeyBundle[] = locales.map((lng) => {
        const filePath = path.join(localesDir, lng, 'common.json');
        const json = readJSON<Record<string, unknown>>(filePath);
        return { locale: lng, ns: 'common', source: filePath, keys: flattenKeys(json) };
      });
      for (let i = 1; i < bundles.length; i++) {
        const { missingInA, missingInB } = diffKeys(bundles[0]!, bundles[i]!);
        expect(
          missingInA.length + missingInB.length,
          `common.json drift between '${bundles[0]!.locale}' and '${bundles[i]!.locale}':\n` +
            (missingInA.length ? `  missing in ${bundles[0]!.locale}: ${missingInA.join(', ')}\n` : '') +
            (missingInB.length ? `  missing in ${bundles[i]!.locale}: ${missingInB.join(', ')}` : '')
        ).toBe(0);
      }
    });
  });

  // --- per-feature namespaces ---
  for (const feature of listFeatures()) {
    const i18nDir = path.join(feature.dir, 'i18n');
    if (!isDir(i18nDir)) continue;
    describe(`features/${feature.name}/i18n/`, () => {
      const files = readDir(i18nDir).filter((n) => n.endsWith('.json'));
      const locales = files.map((n) => n.replace(/\.json$/, ''));

      it('has en.json and zh.json (template default locales)', () => {
        expect(locales, `feature '${feature.name}' is missing one of [en, zh]`).toEqual(
          expect.arrayContaining(['en', 'zh'])
        );
      });

      it('every locale file shares the exact same key set', () => {
        const bundles: KeyBundle[] = files.map((fname) => {
          const filePath = path.join(i18nDir, fname);
          const json = readJSON<Record<string, unknown>>(filePath);
          return {
            locale: fname.replace(/\.json$/, ''),
            ns: feature.name,
            source: filePath,
            keys: flattenKeys(json),
          };
        });
        for (let i = 1; i < bundles.length; i++) {
          const { missingInA, missingInB } = diffKeys(bundles[0]!, bundles[i]!);
          expect(
            missingInA.length + missingInB.length,
            `${feature.name}/i18n drift between '${bundles[0]!.locale}' and '${bundles[i]!.locale}':\n` +
              (missingInA.length ? `  missing in ${bundles[0]!.locale}: ${missingInA.join(', ')}\n` : '') +
              (missingInB.length ? `  missing in ${bundles[i]!.locale}: ${missingInB.join(', ')}` : '')
          ).toBe(0);
        }
      });

      it('every key segment is camelCase or snake_case (no spaces, hyphens, or leading uppercase)', () => {
        for (const fname of files) {
          const filePath = path.join(i18nDir, fname);
          const json = readJSON<Record<string, unknown>>(filePath);
          const keys = flattenKeys(json);
          for (const k of keys) {
            for (const segment of k.split('.')) {
              expect(
                VALID_KEY_SEGMENT.test(segment),
                `${feature.name}/i18n/${fname}: key segment '${segment}' (in '${k}') must be camelCase or snake_case`
              ).toBe(true);
            }
          }
        }
      });
    });
  }
});
