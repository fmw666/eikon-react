import { describe, expect, it } from 'vitest';

import { stripBlocksForFeature } from '../strip-features.js';

describe('stripBlocksForFeature', () => {
  it('removes a labeled block when its feature is disabled', () => {
    const input = [
      'before',
      '// @eikon:feature(supabase) begin',
      'const sb = createClient(url, key);',
      '// @eikon:feature(supabase) end',
      'after',
    ].join('\n');

    const out = stripBlocksForFeature(input, 'supabase');
    expect(out).toContain('before');
    expect(out).toContain('after');
    expect(out).not.toContain('createClient');
    expect(out).not.toContain('@eikon:feature');
  });

  it('leaves other features untouched when only one is stripped', () => {
    const input = [
      '// @eikon:feature(supabase) begin',
      'import { supabase } from "@/shared/supabase";',
      '// @eikon:feature(supabase) end',
      '// @eikon:feature(analytics) begin',
      'import { trackEvent } from "@/shared/analytics";',
      '// @eikon:feature(analytics) end',
    ].join('\n');

    const out = stripBlocksForFeature(input, 'supabase');
    expect(out).not.toContain('supabase');
    expect(out).toContain('trackEvent');
    expect(out).toContain('@eikon:feature(analytics)');
  });

  it('handles JSX-style {/* … */} block markers', () => {
    const input = [
      'render(',
      '  {/* @eikon:feature(supabase) begin */}',
      '  <SupabaseContext.Provider value={sb}>',
      '  {/* @eikon:feature(supabase) end */}',
      '    {children}',
      '  {/* @eikon:feature(supabase) begin */}',
      '  </SupabaseContext.Provider>',
      '  {/* @eikon:feature(supabase) end */}',
      ');',
    ].join('\n');

    const out = stripBlocksForFeature(input, 'supabase');
    expect(out).not.toContain('SupabaseContext');
    expect(out).toContain('{children}');
  });

  it('handles env-file # markers', () => {
    const input = [
      '# App',
      'VITE_APP_NAME="x"',
      '# @eikon:feature(supabase) begin',
      'VITE_SUPABASE_URL=""',
      'VITE_SUPABASE_ANON_KEY=""',
      '# @eikon:feature(supabase) end',
    ].join('\n');

    const out = stripBlocksForFeature(input, 'supabase');
    expect(out).not.toContain('VITE_SUPABASE_URL');
    expect(out).toContain('VITE_APP_NAME');
  });

  it('is a no-op when no markers for that feature exist', () => {
    const input = 'const a = 1;\nconst b = 2;\n';
    expect(stripBlocksForFeature(input, 'supabase')).toBe(input);
  });
});
