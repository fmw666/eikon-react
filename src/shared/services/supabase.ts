/**
 * @file supabase.ts
 * @description Supabase client initialization and user/auth type definitions.
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// =================================================================================================
// Environment Variables & Client
// =================================================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables, Supabase client is not initialized.');
  console.warn('The system will use mock data instead.');
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('supabase', supabase);
}

// =================================================================================================
// Exports
// =================================================================================================

export { supabase };
