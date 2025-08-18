import React from 'react';

import Header from './Header';
import Sidebar from './Sidebar';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen">
    <Sidebar />
    <Header />
    <main className="flex flex-col items-center justify-center min-h-screen mx-auto">
      {children}
    </main>
  </div>
);

export default MainLayout;
