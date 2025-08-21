/**
 * @file index.ts
 * @description Service layer exports
 * @author fmw666@github
 */

// =================================================================================================
// Service Factory & Configuration
// =================================================================================================

export { serviceFactory } from './factory/serviceFactory';
export { serviceConfig } from './config/serviceConfig';

// =================================================================================================
// Service Interfaces
// =================================================================================================

export type { IAuthService } from './interfaces/IAuthService';
export type { ITaskService } from './interfaces/ITaskService';

// =================================================================================================
// Service Implementations
// =================================================================================================

export { SupabaseAuthService } from './implementations/SupabaseAuthService';
export { MockAuthService } from './implementations/MockAuthService';
export { SupabaseTaskService } from './implementations/SupabaseTaskService';
export { MockTaskService } from './implementations/MockTaskService';
