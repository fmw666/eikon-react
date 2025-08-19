import React from 'react';

const SimpleLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    {children}
  </div>
);

export default SimpleLayout;
