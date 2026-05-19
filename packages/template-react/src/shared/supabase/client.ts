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
