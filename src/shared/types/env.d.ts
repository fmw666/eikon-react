/**
 * @file env.d.ts
 * @description Environment type definitions
 * @author fmw666@github
 * @date 2025-07-15
 */

interface ImportMetaEnv {
  readonly VITE_MODE: 'development' | 'production' | 'test';
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
