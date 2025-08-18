/**
 * @file LoginModal.tsx
 * @description Login modal component
 * @author fmw666@github
 */

// =================================================================================================
// Imports
// =================================================================================================

import React, { useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';

import { useAuthActions } from '@/features/auth';

// =================================================================================================
// Types
// =================================================================================================

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

// =================================================================================================
// Component
// =================================================================================================

const LoginModal: React.FC<LoginModalProps> = ({ open, onClose }) => {
  const [email, setEmail] = useState('test@test.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pwdLogin } = useAuthActions();
  const { t } = useTranslation();

  const handleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await pwdLogin(email, password);
      onClose();
    } catch (error) {
      setError('auth.loginModal.invalidEmailOrPassword');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('auth.loginModal.title')}>
      <div className="flex flex-col gap-4 p-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.loginModal.email')}
          className="border p-2 rounded"
          autoComplete="email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.loginModal.password')}
          className="border p-2 rounded"
          autoComplete="current-password"
        />
        {error && <div className="text-red-500 text-sm">{t(error)}</div>}
        <Button onClick={handleLogin} disabled={loading}>
          {loading ? t('auth.loginModal.loggingIn') : t('auth.loginModal.login')}
        </Button>
      </div>
    </Modal>
  );
};

// =================================================================================================
// Exports
// =================================================================================================

export default LoginModal;
