/**
 * @file OptimizedUserInfo.tsx
 * @description User info component with optimized state management
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { memo } from 'react';

import { 
  useUserName, 
  useUserEmail, 
  useUserAvatar, 
  useIsAuthenticated,
  useAuthLoading,
  useAuthActions 
} from '../selectors';

// =================================================================================================
// Types
// =================================================================================================

interface OptimizedUserInfoProps {
  className?: string;
  showAvatar?: boolean;
  showEmail?: boolean;
  showLogout?: boolean;
  compact?: boolean;
}

// =================================================================================================
// Components
// =================================================================================================

/**
 * 用户头像组件 - 独立渲染，避免不必要的重渲染
 */
const UserAvatar = memo<{ avatar?: string; name?: string }>(({ avatar, name }) => {
  if (!avatar) {
    return (
      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
        {name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    );
  }

  return (
    <img
      src={avatar}
      alt={name || '用户头像'}
      className="w-10 h-10 rounded-full object-cover"
      loading="lazy"
    />
  );
});

UserAvatar.displayName = 'UserAvatar';

/**
 * 用户基本信息组件 - 独立渲染
 */
const UserBasicInfo = memo<{ name?: string; email?: string; compact?: boolean }>(
  ({ name, email, compact }) => {
    if (compact) {
      return (
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">{name}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">{name}</span>
        {email && (
          <span className="text-sm text-gray-500">{email}</span>
        )}
      </div>
    );
  }
);

UserBasicInfo.displayName = 'UserBasicInfo';

/**
 * 加载状态组件
 */
const LoadingState = memo(() => (
  <div className="flex items-center space-x-3 animate-pulse">
    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
      <div className="h-3 bg-gray-200 rounded w-32"></div>
    </div>
  </div>
));

LoadingState.displayName = 'LoadingState';

/**
 * 未登录状态组件
 */
const NotAuthenticatedState = memo(() => (
  <div className="flex items-center space-x-3 text-gray-500">
    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </div>
    <span className="text-sm">未登录</span>
  </div>
));

NotAuthenticatedState.displayName = 'NotAuthenticatedState';

/**
 * 主组件
 */
const OptimizedUserInfo: React.FC<OptimizedUserInfoProps> = ({
  className = '',
  showAvatar = true,
  showEmail = true,
  showLogout = true,
  compact = false,
}) => {
  // 使用细粒度状态订阅
  const userName = useUserName();
  const userEmail = useUserEmail();
  const userAvatar = useUserAvatar();
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const { logout } = useAuthActions();

  // 处理登出
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className={`optimized-user-info ${className}`}>
        <LoadingState />
      </div>
    );
  }

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <div className={`optimized-user-info ${className}`}>
        <NotAuthenticatedState />
      </div>
    );
  }

  return (
    <div className={`optimized-user-info flex items-center space-x-3 ${className}`}>
      {/* 用户头像 */}
      {showAvatar && (
        <UserAvatar avatar={userAvatar} name={userName} />
      )}

      {/* 用户信息 */}
      <UserBasicInfo 
        name={userName} 
        email={showEmail ? userEmail : undefined}
        compact={compact}
      />

      {/* 登出按钮 */}
      {showLogout && (
        <button
          onClick={handleLogout}
          className="ml-auto px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          title="登出"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      )}
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default memo(OptimizedUserInfo);
