/**
 * @file MainLayout.tsx
 * @description MainLayout component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useState } from 'react';

// --- Third-party Libraries ---
import { Bars3Icon } from '@heroicons/react/24/outline';

// --- Absolute Imports ---
import { Button } from '@/shared/components/Button';

// --- Relative Imports ---
import Header from './Header';
import Sidebar from './Sidebar';

// =================================================================================================
// Component
// =================================================================================================

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <Header />
      
      {/* 侧边栏切换按钮 - 只在 md 以下尺寸显示 */}
      <Button
        onClick={toggleSidebar}
        variant="secondary"
        size="md"
        radius="rounded"
        isIcon
        icon={<Bars3Icon className="w-5 h-5" />}
        className="fixed top-20 left-4 z-50 md:hidden"
        aria-label="Toggle sidebar"
      />
      
      <main className="flex flex-col items-center justify-center min-h-screen mx-auto">
        {children}
      </main>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default MainLayout;
