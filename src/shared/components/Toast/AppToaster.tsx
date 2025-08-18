/**
 * @file AppToaster.tsx
 * @description Global toaster root with responsive configuration
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { useEffect, useState } from 'react';

import { Toaster } from 'sonner';

// =================================================================================================
// Component
// =================================================================================================

const AppToaster: React.FC = () => {
	const [isMobile, setIsMobile] = useState(false);

	// 检测移动端
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);

		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	return (
		<Toaster
			position={isMobile ? 'top-right' : 'top-center'}
			duration={isMobile ? 4000 : 3000}
			richColors
			closeButton={isMobile}
			expand={true}
			toastOptions={{
				className: isMobile ? 'mx-4 max-w-sm' : 'max-w-md',
				style: {
					background: 'white',
					border: '1px solid #e5e7eb',
					borderRadius: '8px',
					boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
				},
			}}
		/>
	);
};

// =================================================================================================
// Exports
// =================================================================================================

export { AppToaster };
