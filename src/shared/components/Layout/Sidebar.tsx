/**
 * @file Sidebar.tsx
 * @description Sidebar component
 * @author fmw666@github
 */

// =================================================================================================
// Import
// =================================================================================================

import React from 'react';

import { useTranslation } from 'react-i18next';

// =================================================================================================
// Types
// =================================================================================================

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// =================================================================================================
// Component
// =================================================================================================

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <>
      {/* 遮罩层 - 只在 md 以下尺寸且侧边栏打开时显示 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* 侧边栏 */}
      <aside
        className={`
          fixed left-0 top-1/2 -translate-y-1/2 w-20 h-[30vh] min-h-[200px] 
          border-t border-r border-gray-200 rounded-r-lg flex flex-col items-center 
          shadow-lg z-40 bg-white px-2 transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex-1 flex flex-col justify-center items-center w-full">
          Sidebar
        </div>
        <div className="mb-3 w-full flex flex-col items-center">
          <select
            className="p-1 border border-gray-300 rounded bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition hover:border-blue-400 text-xs"
            value={i18n.language}
            onChange={handleChange}
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </div>
      </aside>
    </>
  );
};

// =================================================================================================
// Export
// =================================================================================================

export default Sidebar;
