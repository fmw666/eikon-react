/**
 * @file Modal.tsx
 * @description Modal component with animation effects
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React, { useEffect, useState } from 'react';

// --- Third-party Libraries ---
import ReactDOM from 'react-dom';

import { XMarkIcon } from '@heroicons/react/24/outline';

// --- Absolute Imports ---
import { Button } from '@/shared/components/Button';

// =================================================================================================
// Types
// =================================================================================================

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

// =================================================================================================
// Component
// =================================================================================================

interface ModalProps {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
  size?: ModalSize;
}

// =================================================================================================
// Component
// =================================================================================================

const getModalSizeClasses = (size: ModalSize): string => {
  switch (size) {
    case 'sm':
      return 'max-w-sm';
    case 'md':
      return 'max-w-md';
    case 'lg':
      return 'max-w-lg';
    case 'xl':
      return 'max-w-xl';
    case 'full':
      return 'max-w-4xl';
    default:
      return 'max-w-md';
  }
};

const getModalPadding = (size: ModalSize): string => {
  switch (size) {
    case 'sm':
      return 'p-4';
    case 'md':
      return 'p-6';
    case 'lg':
      return 'p-6';
    case 'xl':
      return 'p-8';
    case 'full':
      return 'p-8';
    default:
      return 'p-6';
  }
};

const Modal: React.FC<ModalProps> = ({ 
  open, 
  title, 
  children, 
  onClose, 
  actions, 
  size = 'md' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      // 添加 body 滚动锁定
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      // 延迟隐藏以完成关闭动画
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 300); // 与 CSS transition 时间匹配

      return () => clearTimeout(timer);
    }
  }, [open]);

  // 处理关闭动画
  const handleClose = () => {
    setIsAnimating(false);
    // 延迟调用 onClose 以完成动画
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const modalContent = (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ease-out ${
        isAnimating 
          ? 'bg-black/60 opacity-100' 
          : 'bg-black/0 opacity-0'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-card text-card-foreground rounded-xl shadow-lg w-full transition-all duration-300 ${
          getModalSizeClasses(size)
        } ${getModalPadding(size)} relative ${
          isAnimating 
            ? 'transform scale-100 opacity-100 translate-y-0' 
            : 'transform scale-70 opacity-0 translate-y-12'
        }`}
        style={{
          transitionTimingFunction: isAnimating 
            ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' 
            : 'cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isAnimating 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
            : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          icon={<XMarkIcon className="w-6 h-6" />}
          onClick={handleClose}
          className="absolute right-6 top-5 text-muted-foreground hover:text-foreground transition-colors duration-150"
          aria-label="Close"
        />
        {title && <div className="text-lg font-semibold mb-4">{title}</div>}
        <div>{children}</div>
        {actions && <div className="flex justify-end gap-2 mt-6">{actions}</div>}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

// =================================================================================================
// Exports
// =================================================================================================

export default Modal;
export type { ModalSize, ModalProps };
