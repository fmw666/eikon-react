/**
 * @file IAuthService.ts
 * @description Authentication service interface
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import type { User } from '@/features/auth';

// =================================================================================================
// Interface
// =================================================================================================

interface IAuthService {
  getSession(): Promise<User | null>;
  logout(): Promise<void>;
  pwdLogin(email: string, password: string): Promise<User | null>;
  sendEmailVerification(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<void>;
}

// =================================================================================================
// Exports
// =================================================================================================

export type { IAuthService };
