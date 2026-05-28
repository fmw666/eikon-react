/**
 * @file read-variants-from-url.test.ts
 * @description Closes the audit's P0 finding that `__eikon*` URL params
 * flowed unsanitized into `rewriteHtmlOpenTag`. The function interpolates
 * its inputs straight into `class="design-${v}"` and `data-layout="${v}"`
 * HTML attribute strings, so a crafted query like
 *   ?__eikonDesign=x"><script>alert(1)</script>
 * would break out of the attribute and inject markup. The fix:
 * `readVariantsFromUrl` validates every value against the schema's enum
 * white-list at `params-schema.ts` and drops anything unknown.
 *
 * Pure-function test — no HTTP round-trip, no fs.
 */

import { describe, expect, it } from 'vitest';

import { readVariantsFromUrl } from '../server/handlers';

describe('readVariantsFromUrl', () => {
  it('passes through valid enum values', () => {
    expect(
      readVariantsFromUrl(
        '/preview/abcdef012345/?__eikonDesign=apple&__eikonUi=shadcn&__eikonLayout=sidebar'
      )
    ).toEqual({ design: 'apple', ui: 'shadcn', layout: 'sidebar' });
  });

  it('drops a value that is not in the schema enum', () => {
    expect(
      readVariantsFromUrl('/preview/abcdef012345/?__eikonDesign=not-a-design')
    ).toEqual({});
  });

  it('drops an attribute-break attempt', () => {
    const out = readVariantsFromUrl(
      '/preview/abcdef012345/?__eikonDesign=' +
        encodeURIComponent('x"><script>alert(1)</script>')
    );
    // Most important: design is not set. Any downstream
    // rewriteHtmlOpenTag invocation therefore sees an empty
    // selection set and writes nothing for this axis.
    expect(out.design).toBeUndefined();
    // Defensive: no other axes should accidentally pick up the payload either.
    expect(JSON.stringify(out)).not.toContain('script');
    expect(JSON.stringify(out)).not.toContain('"');
  });

  it('drops only the bad axis when others are valid', () => {
    const out = readVariantsFromUrl(
      '/preview/abcdef012345/?__eikonDesign=' +
        encodeURIComponent('"><x') +
        '&__eikonUi=animate-ui'
    );
    expect(out.design).toBeUndefined();
    expect(out.ui).toBe('animate-ui');
  });

  it('returns an empty selection when no params are present', () => {
    expect(readVariantsFromUrl('/preview/abcdef012345/')).toEqual({});
  });

  it('ignores unrelated query params', () => {
    expect(
      readVariantsFromUrl(
        '/preview/abcdef012345/?irrelevant=1&__eikonUi=custom'
      )
    ).toEqual({ ui: 'custom' });
  });

  it('drops empty-string values', () => {
    expect(
      readVariantsFromUrl(
        '/preview/abcdef012345/?__eikonDesign=&__eikonUi=&__eikonLayout='
      )
    ).toEqual({});
  });
});
