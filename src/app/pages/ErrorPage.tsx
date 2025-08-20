/**
 * @file ErrorPage.tsx
 * @description Global error fallback page
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

// --- Absolute Imports ---
import { Button } from '@/shared/components/Button';

// =================================================================================================
// Component
// =================================================================================================

const ErrorPage: React.FC = () => {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
			<div className="mb-6 text-7xl font-bold text-gray-300">😵</div>
			<h1 className="mb-3 text-2xl font-semibold">Something went wrong</h1>
			<p className="mb-6 max-w-md text-gray-600">
				An unexpected error occurred. You can try to reload the page or go back to the home page.
			</p>
			<div className="flex gap-4">
				<Button variant="primary" onClick={() => window.location.reload()}>
					Reload
				</Button>
				<a href="/">
					<Button variant="secondary">Go Home</Button>
				</a>
			</div>
		</div>
	);
};

// =================================================================================================
// Exports
// =================================================================================================

export default ErrorPage;
