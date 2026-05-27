// @eikon:feature(supabase) file
/**
 * @file client.ts
 * @description Singleton Supabase client used by every Supabase-backed
 * service implementation.
 *
 * Whole file is gated by `@eikon:feature(supabase) file`: when the CLI
 * runs with `--no-supabase` this module is deleted along with every
 * impl that imports it.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Third-party Libraries ---
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// =================================================================================================
// Env
// =================================================================================================

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * The literal example URL Supabase prints in their "create project"
 * docs. If a developer copies the example into `.env.local` without
 * editing, fail fast at module load instead of letting it ride until
 * the first `.from()` call hits the network and 401s.
 *
 * Empty env (the shape inside the playground iframe and in tests that
 * forgot to mock `@/shared/supabase`) is a separate case: we keep the
 * stub-client fallback below so module loading doesn't crash a context
 * that never actually calls Supabase. Production misconfig is the bug
 * we want loud; missing env in non-prod isn't.
 */
const PLACEHOLDER_URL_RE = /^(?:https?:\/\/)?your-project-id\.supabase\.co\/?$/i;

if (url && PLACEHOLDER_URL_RE.test(url)) {
  throw new Error(
    '[supabase] VITE_SUPABASE_URL is still set to the example value ' +
      '(your-project-id.supabase.co). Replace it with your real ' +
      'Supabase project URL in `.env.local`, or scaffold with ' +
      '`--no-supabase` if you do not want a backend yet.'
  );
}

if (!url || !anonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing; the client will not work until configured.'
  );
}

// =================================================================================================
// Client
// =================================================================================================

/**
 * Supabase-js v2.100+ throws synchronously on an empty URL, which means
 * even importing `@/shared/supabase` from a module that never actually
 * hits the network (tests, SSR pre-render, the playground iframe before
 * the user wires their env vars) would crash on load.
 *
 * Hand it a syntactically-valid stub when env is missing so the module
 * graph loads. Any subsequent .from()/.auth call against the stub will
 * fail at request time — which is the right shape: missing config is a
 * deployment problem, not an import problem.
 */
const PLACEHOLDER_URL = 'http://localhost:54321';
const PLACEHOLDER_KEY = 'public-anon-key';

const supabase: SupabaseClient = createClient(
  url || PLACEHOLDER_URL,
  anonKey || PLACEHOLDER_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// =================================================================================================
// Exports
// =================================================================================================

export { supabase };
