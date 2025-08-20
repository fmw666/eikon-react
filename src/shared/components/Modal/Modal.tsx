/**
 * @file Modal.tsx
 * @description Modal component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

// --- Core Libraries ---
import React from 'react';

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
  if (!open) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className={`bg-card text-card-foreground rounded-xl shadow-lg w-full ${getModalSizeClasses(size)} ${getModalPadding(size)} relative`}>
        <Button
          variant="ghost"
          size="sm"
          icon={<XMarkIcon className="w-6 h-6" />}
          onClick={onClose}
          className="absolute right-6 top-5 text-muted-foreground hover:text-foreground"
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
