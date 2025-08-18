import React from 'react';

const SimpleLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    {children}
  </div>
);

export default SimpleLayout;
