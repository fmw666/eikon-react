/**
 * @file authService.ts
 * @description Auth service
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import { mockUser } from '@/mock/user';
import { supabase } from '@/shared/services/supabase';

// --- Relative Imports ---
import { User } from '../types/authTypes';

// =================================================================================================
// Services
// =================================================================================================

const authService = {
  getSession: async (): Promise<User | null> => {
    if (!supabase) {
      console.warn('Supabase client is not initialized, returning mock data.');
      // wait 1~2 seconds to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      return mockUser;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    return {
      id: session.user.id,
      email: session.user.email || '',
      user_metadata: session.user.user_metadata || {},
    } as User;
  },

  logout: async (): Promise<void> => {
    if (!supabase) {
      console.warn('Supabase client is not initialized, returning mock data.');
      // wait 1~2 seconds to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  pwdLogin: async (email: string, password: string): Promise<User | null> => {
    if (!supabase) {
      console.warn('Supabase client is not initialized, returning mock data.');
      // wait 1~2 seconds to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      if (email === mockUser.email && password === mockUser.password) {
        return mockUser;
      }
      throw new Error('Mock user not found');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    return {
      id: data.user.id,
      email: data.user.email || '',
      user_metadata: data.user.user_metadata || {},
    } as User;
  },

  sendEmailVerification: async (email: string): Promise<void> => {
    if (!supabase) {
      console.warn('Supabase client is not initialized, returning mock data.');
      // wait 1~2 seconds to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      throw error;
    }
  },

  verifyEmailCode: async (email: string, code: string): Promise<void> => {
    if (!supabase) {
      console.warn('Supabase client is not initialized, returning mock data.');
      // wait 1~2 seconds to simulate network latency
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      return;
    }

    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) {
      throw error;
    }
  },
};

// =================================================================================================
// Exports
// =================================================================================================

export { authService };
