import { describe, expect, it } from 'vitest';

import { stripBlocksForFeature } from '../strip-features.js';

describe('stripBlocksForFeature', () => {
  it('removes a labeled block when its feature is disabled', () => {
    const input = [
      'before',
      '// @evomap:feature(query) begin',
      'const queryClient = new QueryClient();',
      '// @evomap:feature(query) end',
      'after',
    ].join('\n');

    const out = stripBlocksForFeature(input, 'query');
    expect(out).toContain('before');
    expect(out).toContain('after');
    expect(out).not.toContain('QueryClient');
    expect(out).not.toContain('@evomap:feature');
  });

  it('leaves other features untouched when only one is stripped', () => {
    const input = [
      '// @evomap:feature(supabase) begin',
      'import { supabase } from "@/shared/supabase";',
      '// @evomap:feature(supabase) end',
      '// @evomap:feature(i18n) begin',
      'import { useTranslation } from "react-i18next";',
      '// @evomap:feature(i18n) end',
    ].join('\n');

    const out = stripBlocksForFeature(input, 'supabase');
    expect(out).not.toContain('supabase');
    expect(out).toContain('useTranslation');
    expect(out).toContain('@evomap:feature(i18n)');
  });

  it('handles JSX-style {/* … */} block markers', () => {
    const input = [
      'render(',
      '  {/* @evomap:feature(query) begin */}',
      '  <QueryClientProvider client={qc}>',
      '  {/* @evomap:feature(query) end */}',
      '    {children}',
      '  {/* @evomap:feature(query) begin */}',
      '  </QueryClientProvider>',
      '  {/* @evomap:feature(query) end */}',
      ');',
    ].join('\n');

    const out = stripBlocksForFeature(input, 'query');
    expect(out).not.toContain('QueryClient');
    expect(out).toContain('{children}');
  });

  it('handles env-file # markers', () => {
    const input = [
      '# App',
      'VITE_APP_NAME="x"',
      '# @evomap:feature(supabase) begin',
      'VITE_SUPABASE_URL=""',
      'VITE_SUPABASE_ANON_KEY=""',
      '# @evomap:feature(supabase) end',
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
