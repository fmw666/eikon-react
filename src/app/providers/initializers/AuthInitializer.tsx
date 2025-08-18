/**
 * @file AuthInitializer.tsx
 * @description Initializes auth state at app startup
 * @author fmw666@github
 */

// ================================================================================================
// Imports
// ================================================================================================

import React, { useEffect } from 'react';

import { useAuthActions, useAuthInitialized, useAuthLoading } from '@/features/auth/selectors';

// ================================================================================================
// Component
// ================================================================================================

const AuthInitializer: React.FC = () => {
	const isInitialized = useAuthInitialized();
	const isLoading = useAuthLoading();
	const { initialize } = useAuthActions();

	useEffect(() => {
		if (!isInitialized && !isLoading) {
			initialize();
		}
	}, [isInitialized, isLoading, initialize]);

	return null;
};

// ================================================================================================
// Exports
// ================================================================================================

export { AuthInitializer };
