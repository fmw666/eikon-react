// @eikon:feature(supabase) file
/**
 * @file SupabaseAuthService.ts
 * @description Supabase-backed implementation of IAuthService.
 *
 * Whole file is gated by `@eikon:feature(supabase) file`: when the
 * CLI runs with `--no-supabase` it gets deleted, and the factory's
 * supabase branch (also marker-gated) collapses to nothing.
 *
 * Honour your Supabase Auth provider configuration:
 *
 *   - Email/password sign-in/sign-up must be enabled in the dashboard.
 *   - OAuth providers (Google, GitHub, …) must be configured with
 *     valid redirect URLs that include this app's origin.
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import { supabase } from '@/shared/supabase';

// --- Relative Imports ---
import type {
  AuthUser,
  OAuthProvider,
  SignInPayload,
  SignUpPayload,
} from '../../types';
import type { IAuthService } from '../interfaces/IAuthService';

// =================================================================================================
// Helpers
// =================================================================================================

function mapUser(
  raw: { id: string; email?: string | null; user_metadata?: { full_name?: string } } | null | undefined
): AuthUser {
  if (!raw) throw new Error('Supabase returned no user.');
  return {
    id: raw.id,
    email: raw.email ?? '',
    fullName: raw.user_metadata?.full_name,
  };
}

// =================================================================================================
// Implementation
// =================================================================================================

class SupabaseAuthService implements IAuthService {
  async signInWithEmail({ email, password }: SignInPayload): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return mapUser(data.user);
  }

  async signUpWithEmail({
    email,
    password,
    fullName,
  }: SignUpPayload): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });
    if (error) throw error;
    return mapUser(data.user);
  }

  async signInWithOAuth(
    provider: OAuthProvider
  ): Promise<{ user?: AuthUser; redirectUrl?: string }> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) throw error;
    return { redirectUrl: data.url ?? undefined };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

// =================================================================================================
// Exports
// =================================================================================================

export { SupabaseAuthService };
