/**
 * @file SentryDemo.tsx
 * @description Sentry error capture examples: ErrorBoundary, captureException, captureMessage, Breadcrumb, User, async error
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

// --- Absolute Imports ---
import { useMemoizedThemeState } from '@/app/providers';
import { Button } from '@/shared/components/Button';
import { Sentry } from '@/shared/infrastructure/external/sentry';

// =================================================================================================
// Component
// =================================================================================================

const SentryDemo: React.FC = () => {
  const { isDarkMode } = useMemoizedThemeState();

  const handleThrowError = () => {
    throw new Error('Sentry ErrorBoundary test error');
  };

  const handleCaptureException = () => {
    try {
      throw new Error('Sentry captureException test');
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const handleCaptureMessage = () => {
    Sentry.captureMessage('Sentry captureMessage: informational note', 'info');
  };

  const handleBreadcrumbThenError = () => {
    Sentry.addBreadcrumb({
      category: 'ui.click',
      message: 'User clicked breadcrumb+error button',
      level: 'info'
    });
    Sentry.captureException(new Error('Error after breadcrumb'));
  };

  const handleSetUserAndCapture = () => {
    Sentry.setUser({ id: 'demo-user-123', email: 'demo@example.com' });
    Sentry.setContext('feature', { name: 'SentryDemo', version: '1.0.0' });
    Sentry.captureMessage('Sentry: user and context set', 'info');
  };

  const handleAsyncError = () => {
    setTimeout(() => {
      throw new Error('Sentry async error (setTimeout)');
    }, 0);
  };

  return (
    <div className={`space-y-8 transition-all duration-500 ease-out ${
      isDarkMode ? 'text-gray-200' : 'text-gray-800'
    }`}>
      <div className={`text-center mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        <h2 className={`text-3xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          🛡️ Sentry 捕获示例
        </h2>
        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          通过多个按钮快速验证 Sentry 是否接入成功
        </p>
      </div>

      <section className={`rounded-none p-6 border-4 border-black ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ boxShadow: '8px 8px 0px #000' }}>
        <h3 className={`text-xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>ErrorBoundary 捕获</h3>
        <p className={`mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>抛出错误，由全局 ErrorBoundary 捕获并上报</p>
        <Button variant="danger" onClick={handleThrowError}>抛出错误（ErrorBoundary）</Button>
      </section>

      <section className={`rounded-none p-6 border-4 border-black ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ boxShadow: '8px 8px 0px #000' }}>
        <h3 className={`text-xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>API 直接上报</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={handleCaptureException}>captureException</Button>
          <Button variant="secondary" onClick={handleCaptureMessage}>captureMessage</Button>
          <Button variant="outline" onClick={handleBreadcrumbThenError}>添加 Breadcrumb 后上报</Button>
        </div>
      </section>

      <section className={`rounded-none p-6 border-4 border-black ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ boxShadow: '8px 8px 0px #000' }}>
        <h3 className={`text-xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>用户与上下文</h3>
        <p className={`mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>设置用户和自定义上下文，便于定位问题</p>
        <Button variant="primary" onClick={handleSetUserAndCapture}>设置用户和上下文并上报</Button>
      </section>

      <section className={`rounded-none p-6 border-4 border-black ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ boxShadow: '8px 8px 0px #000' }}>
        <h3 className={`text-xl font-black mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>异步异常</h3>
        <p className={`mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>在 setTimeout 中抛错，验证全局捕获</p>
        <Button variant="danger" onClick={handleAsyncError}>触发异步错误</Button>
      </section>
    </div>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export { SentryDemo };
