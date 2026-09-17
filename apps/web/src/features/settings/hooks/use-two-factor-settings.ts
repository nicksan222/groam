import { authClient } from '@groam/auth/client';
import { useState } from 'react';
import { downloadTextFile } from '@/lib/download-text-file';
import { errorMessage } from '@/lib/errors';
import type { TwoFactorEnrollment } from '@/types/account-security';

export function downloadBackupCodes(codes: string[]) {
  const contents = ['Groam backup codes', '', ...codes, '', 'Each code can be used once.'].join(
    '\n'
  );
  downloadTextFile('groam-backup-codes.txt', contents);
}

export function useTwoFactorSettings(initiallyEnabled: boolean) {
  const [enrollment, setEnrollment] = useState<TwoFactorEnrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setEnabled] = useState(initiallyEnabled);
  const [isPending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: () => Promise<void>, failureMessage: string) => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (cause: unknown) {
      setError(errorMessage(cause, failureMessage));
    } finally {
      setPending(false);
    }
  };

  const startEnrollment = (password: string) => {
    setMessage(null);
    return run(async () => {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error) throw new Error(result.error.message ?? 'Unable to start two-factor setup');
      setEnrollment(result.data);
    }, 'Unable to start two-factor setup');
  };

  const confirmEnrollment = (code: string) =>
    run(async () => {
      const result = await authClient.twoFactor.verifyTotp({
        code: code.trim(),
        trustDevice: true
      });
      if (result.error) throw new Error(result.error.message ?? 'Invalid authenticator code');
      setEnabled(true);
      setMessage('Two-factor authentication is enabled. Your saved backup codes are ready to use.');
    }, 'Invalid authenticator code');

  const regenerate = (password: string) =>
    run(async () => {
      const result = await authClient.twoFactor.generateBackupCodes({ password });
      if (result.error)
        throw new Error(result.error.message ?? 'Unable to regenerate backup codes');
      downloadBackupCodes(result.data.backupCodes);
      setMessage('New backup codes downloaded. Previous codes no longer work.');
    }, 'Unable to regenerate backup codes');

  const disable = (password: string) =>
    run(async () => {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error)
        throw new Error(result.error.message ?? 'Unable to disable two-factor authentication');
      setEnabled(false);
      setEnrollment(null);
      setMessage('Two-factor authentication is disabled.');
    }, 'Unable to disable two-factor authentication');

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
