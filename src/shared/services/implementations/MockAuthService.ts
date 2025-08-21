/**
 * @file MockAuthService.ts
 * @description Mock authentication service implementation
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import type { User } from '@/features/auth';
import { mockUser } from '@/mock/user';

// --- Relative Imports ---
import type { IAuthService } from '../interfaces/IAuthService';

// =================================================================================================
// Implementation
// =================================================================================================

class MockAuthService implements IAuthService {
  private currentUser: User | null = null;

  async getSession(): Promise<User | null> {
    // Simulate network latency
    await this.simulateLatency();
    return this.currentUser;
  }

  async logout(): Promise<void> {
    await this.simulateLatency();
    this.currentUser = null;
  }

  async pwdLogin(email: string, password: string): Promise<User | null> {
    await this.simulateLatency();
    
    if (email === mockUser.email && password === mockUser.password) {
      this.currentUser = {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        user_metadata: mockUser.user_metadata,
      };
      return this.currentUser;
    }
    
    throw new Error('Invalid credentials');
  }

  async sendEmailVerification(email: string): Promise<void> {
    await this.simulateLatency();
    console.log(`Mock: Email verification sent to ${email}`);
  }

  async verifyEmailCode(email: string, code: string): Promise<void> {
    await this.simulateLatency();
    console.log(`Mock: Email code ${code} verified for ${email}`);
  }

  private async simulateLatency(): Promise<void> {
    // Simulate 1-2 seconds network latency
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  }
}

// =================================================================================================
// Exports
// =================================================================================================

export { MockAuthService };
