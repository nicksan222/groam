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

  const run = async <T extends { error: { message?: null | string } | null }>(
    request: Promise<T>,
    failureMessage: string
  ): Promise<null | T> => {
    setPending(true);
    setError(null);
    try {
      const result = await request;
      if (result.error) throw new Error(result.error.message ?? failureMessage);
      return result;
    } catch (cause: unknown) {
      setError(errorMessage(cause, failureMessage));
      return null;
    } finally {
      setPending(false);
    }
  };

  const startEnrollment = async (password: string) => {
    setMessage(null);
    const result = await run(
      authClient.twoFactor.enable({ password }),
      'Unable to start two-factor setup'
    );
    if (result) setEnrollment(result.data);
  };

  const confirmEnrollment = async (code: string) => {
    const result = await run(
      authClient.twoFactor.verifyTotp({
        code: code.trim(),
        trustDevice: true
      }),
      'Invalid authenticator code'
    );
    if (result) {
      setEnabled(true);
      setMessage('Two-factor authentication is enabled. Your saved backup codes are ready to use.');
    }
  };

  const regenerate = async (password: string) => {
    const result = await run(
      authClient.twoFactor.generateBackupCodes({ password }),
      'Unable to regenerate backup codes'
    );
    if (result?.data) {
      downloadBackupCodes(result.data.backupCodes);
      setMessage('New backup codes downloaded. Previous codes no longer work.');
    }
  };

  const disable = async (password: string) => {
    const result = await run(
      authClient.twoFactor.disable({ password }),
      'Unable to disable two-factor authentication'
    );
    if (result) {
      setEnabled(false);
      setEnrollment(null);
      setMessage('Two-factor authentication is disabled.');
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
