/**
 * @file NotFoundPage.tsx
 * @description Not found page component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React from 'react';

import { useNavigate } from 'react-router-dom';

import { Button } from '@/shared/components/Button';

// =================================================================================================
// Component
// =================================================================================================

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="mb-8 text-9xl font-bold text-gray-300">404</div>
      <h1 className="mb-4 text-2xl font-semibold">Page Not Found</h1>
      <p className="mb-8 max-w-md text-gray-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Button variant="primary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Go Home
        </Button>
      </div>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default NotFoundPage;
