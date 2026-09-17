import { authClient } from '@groam/auth/client';
import { useState } from 'react';
import { errorMessage } from '@/lib/errors';
import type { TwoFactorEnrollment } from '@/types/account-security';

export function downloadBackupCodes(codes: string[]) {
  const contents = ['Groam backup codes', '', ...codes, '', 'Each code can be used once.'].join(
    '\n'
  );
  const href = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.download = 'groam-backup-codes.txt';
  link.href = href;
  link.click();
  URL.revokeObjectURL(href);
}

export function useTwoFactorSettings(initiallyEnabled: boolean) {
  const [enrollment, setEnrollment] = useState<TwoFactorEnrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setEnabled] = useState(initiallyEnabled);
  const [isPending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const startEnrollment = async (password: string) => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) throw new Error(result.error.message ?? 'Unable to start two-factor setup');
      setEnrollment(result.data);
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Unable to start two-factor setup'));
    } finally {
      setPending(false);
    }
  };

  const confirmEnrollment = async (code: string) => {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: code.trim(),
        trustDevice: true
      });
      if (result.error) throw new Error(result.error.message ?? 'Invalid authenticator code');
      setEnabled(true);
      setMessage('Two-factor authentication is enabled. Your saved backup codes are ready to use.');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Invalid authenticator code'));
    } finally {
      setPending(false);
    }
  };

  const regenerate = async (password: string) => {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.twoFactor.generateBackupCodes({ password });
      if (result.error)
        throw new Error(result.error.message ?? 'Unable to regenerate backup codes');
      downloadBackupCodes(result.data.backupCodes);
      setMessage('New backup codes downloaded. Previous codes no longer work.');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Unable to regenerate backup codes'));
    } finally {
      setPending(false);
    }
  };

  const disable = async (password: string) => {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error)
        throw new Error(result.error.message ?? 'Unable to disable two-factor authentication');
      setEnabled(false);
      setEnrollment(null);
      setMessage('Two-factor authentication is disabled.');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Unable to disable two-factor authentication'));
    } finally {
      setPending(false);
    }
  };

  return {
    confirmEnrollment,
    disable,
    enrollment,
    error,
    isEnabled,
    isPending,
    message,
    regenerate,
    startEnrollment
  };
}
