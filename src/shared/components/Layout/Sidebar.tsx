/**
 * @file Sidebar.tsx
 * @description Sidebar component
 * @author fmw666@github
 */

// =================================================================================================
// Import
// =================================================================================================

import React, { useCallback, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Cog6ToothIcon } from '@heroicons/react/24/outline';

import { Button } from '@/shared/components/Button';
import { SettingsModal } from '@/shared/components/Modal';

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
  const { t } = useTranslation();
  const [openSettings, setOpenSettings] = useState(false);

  const handleOpenSettings = useCallback(() => setOpenSettings(true), []);
  const handleCloseSettings = useCallback(() => setOpenSettings(false), []);

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
          fixed left-0 top-1/2 -translate-y-1/2 h-[30vh] min-h-[200px] 
          border-t border-r border-gray-200 rounded-r-lg flex flex-col items-center 
          shadow-lg z-40 bg-white px-2 transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex-1 flex flex-col justify-center items-center w-full gap-3">
          <div>Sidebar</div>
        </div>
        <div className="mb-3 w-full flex flex-col items-center">
          <Button
            variant="secondary"
            size="sm"
            className="text-xs"
            onClick={handleOpenSettings}
            leftIcon={<Cog6ToothIcon className="w-4 h-4" />}
          >
            {t('settings.open')}
          </Button>
        </div>
      </aside>

      <SettingsModal open={openSettings} onClose={handleCloseSettings} />
    </>
  );
};

// =================================================================================================
// Export
// =================================================================================================

export default Sidebar;
