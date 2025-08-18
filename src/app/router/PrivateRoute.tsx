/**
 * @file PrivateRoute.tsx
 * @description Private route component for authentication protection
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { useEffect, useRef } from 'react';

import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

import { toast } from 'sonner';

import { useUser, useAuthInitialized, useAuthLoading } from '@/features/auth';

import { ROUTES } from './constants';
import type { PrivateRouteProps } from './types';

// =================================================================================================
// Component
// =================================================================================================

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  fallback = <div>Loading...</div>,
  redirectTo = ROUTES.HOME
}) => {
  const user = useUser();
  const isInitialized = useAuthInitialized();
  const isLoading = useAuthLoading();
  const { t } = useTranslation();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (!user && isInitialized && !isLoading && !hasShownToast.current) {
      console.log('not logged in');
      toast.error(t('auth.notLoggedIn'));
      hasShownToast.current = true;
    }
  }, [user, isInitialized, isLoading, t]);

  if (!isInitialized || isLoading) {
    return <>{fallback}</>;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

// =================================================================================================
// Exports
// =================================================================================================

export { PrivateRoute };
