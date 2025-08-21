/**
 * @file SupabaseAuthService.ts
 * @description Supabase authentication service implementation
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import type { User } from '@/features/auth';
import { supabase } from '@/shared/infrastructure';

// --- Relative Imports ---
import type { IAuthService } from '../interfaces/IAuthService';

// =================================================================================================
// Implementation
// =================================================================================================

class SupabaseAuthService implements IAuthService {
  async getSession(): Promise<User | null> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    return {
      id: session.user.id,
      email: session.user.email || '',
      user_metadata: session.user.user_metadata || {},
    } as User;
  }

  async logout(): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async pwdLogin(email: string, password: string): Promise<User | null> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    return {
      id: data.user.id,
      email: data.user.email || '',
      user_metadata: data.user.user_metadata || {},
    } as User;
  }

  async sendEmailVerification(email: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  }

  async verifyEmailCode(email: string, code: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw error;
  }
}

// =================================================================================================
// Exports
// =================================================================================================

export { SupabaseAuthService };
