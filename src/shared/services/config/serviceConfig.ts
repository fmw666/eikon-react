/**
 * @file serviceConfig.ts
 * @description Service configuration for determining which implementation to use
 * @author fmw666@github
 */

// =================================================================================================
// Configuration
// =================================================================================================

export interface ServiceConfig {
  useMock: boolean;
  mockDelay: number;
}

// =================================================================================================
// Environment-based Configuration
// =================================================================================================

const getServiceConfig = (): ServiceConfig => {
  // 1. 检查环境变量
  const envUseMock = import.meta.env.VITE_USE_MOCK;
  const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const envSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // 2. 判断逻辑
  let useMock = false;

  // 如果明确设置了使用 mock
  if (envUseMock === 'true') {
    useMock = true;
  }
  // 如果 Supabase 配置不完整，自动使用 mock
  else if (!envSupabaseUrl || !envSupabaseKey) {
    useMock = true;
    console.warn('Supabase configuration incomplete, falling back to mock services');
  }
  // 开发环境默认可以使用 mock（可选）
  else if (import.meta.env.MODE === 'development' && envUseMock === 'dev') {
    useMock = true;
    console.log('Development mode: using mock services');
  }

  return {
    useMock,
    mockDelay: 1000 + Math.random() * 1000, // 1-2 seconds
  };
};

// =================================================================================================
// Exports
// =================================================================================================

export const serviceConfig = getServiceConfig();
