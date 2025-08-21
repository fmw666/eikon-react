/**
 * @file taskService.ts
 * @description Task service facade
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Absolute Imports ---
import { serviceFactory } from '@/shared/services/factory/serviceFactory';

// =================================================================================================
// Service Facade
// =================================================================================================

// 导出服务实例，业务代码直接使用这个实例
export const taskService = serviceFactory.getTaskService();
