/**
 * @file LayoutWrapper.tsx
 * @description Layout wrapper component for applying different layouts to routes
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React from 'react';
import type { ComponentType, ReactNode } from 'react';

// =================================================================================================
// Types
// =================================================================================================

interface LayoutWrapperProps {
  children: ReactNode;
  layout?: ComponentType<{ children: ReactNode }>;
}

// =================================================================================================
// Component
// =================================================================================================

const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ children, layout: LayoutComponent }) => {
  if (!LayoutComponent) {
    return children;
  }
  
  return <LayoutComponent>{children}</LayoutComponent>;
};

// =================================================================================================
// Exports
// =================================================================================================

export { LayoutWrapper };
