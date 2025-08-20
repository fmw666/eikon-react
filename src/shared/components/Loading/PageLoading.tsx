/**
 * @file PageLoading.tsx
 * @description Full-screen page loading indicator
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

// =================================================================================================
// Component
// =================================================================================================

const PageLoading: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      <p className="text-sm text-muted-foreground">加载中...</p>
    </div>
  </div>
);

// =================================================================================================
// Exports
// =================================================================================================

export { PageLoading };
