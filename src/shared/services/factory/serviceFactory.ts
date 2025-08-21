/**
 * @file serviceFactory.ts
 * @description Service factory for creating service instances based on configuration
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Relative Imports ---
import { serviceConfig } from '../config/serviceConfig';
import { MockAuthService } from '../implementations/MockAuthService';
import { MockTaskService } from '../implementations/MockTaskService';
import { SupabaseAuthService } from '../implementations/SupabaseAuthService';
import { SupabaseTaskService } from '../implementations/SupabaseTaskService';

// --- Type Imports ---
import type { IAuthService } from '../interfaces/IAuthService';
import type { ITaskService } from '../interfaces/ITaskService';

// =================================================================================================
// Factory
// =================================================================================================

class ServiceFactory {
  private authService: IAuthService | null = null;
  private taskService: ITaskService | null = null;

  getAuthService(): IAuthService {
    if (!this.authService) {
      this.authService = serviceConfig.useMock 
        ? new MockAuthService()
        : new SupabaseAuthService();
      
      console.log(`Auth service initialized: ${serviceConfig.useMock ? 'Mock' : 'Supabase'}`);
    }
    return this.authService;
  }

  getTaskService(): ITaskService {
    if (!this.taskService) {
      this.taskService = serviceConfig.useMock 
        ? new MockTaskService()
        : new SupabaseTaskService();
      
      console.log(`Task service initialized: ${serviceConfig.useMock ? 'Mock' : 'Supabase'}`);
    }
    return this.taskService;
  }

  // 重置服务实例（用于测试或重新配置）
  reset(): void {
    this.authService = null;
    this.taskService = null;
  }
}

// =================================================================================================
// Singleton Instance
// =================================================================================================

export const serviceFactory = new ServiceFactory();
