import { authClient } from '@groam/auth/client';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { use, useState } from 'react';
import { SessionChangeContext } from '@/features/auth/session-change-context';
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
  const { error, isPending, run: perform } = useAsyncAction();
  const [isEnabled, setEnabled] = useState(initiallyEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const changeSession = use(SessionChangeContext);

  const run = async <T extends { error: { message?: null | string } | null }>(
    request: () => Promise<T>,
    failureMessage: string
  ): Promise<null | T> => {
    // A thunk, so a call the guard ignores never sends its request.
    const outcome = await perform(async () => {
      // `async () => request()` so a synchronous throw is caught like a rejection.
      const response = await (async () => request())().catch((cause: unknown) => {
        throw new Error(errorMessage(cause, failureMessage));
      });
      if (response.error) throw new Error(response.error.message ?? failureMessage);
      return response;
    });
    return outcome.status === 'ok' ? outcome.value : null;
  };

  const startEnrollment = async (password: string) => {
    setMessage(null);
    const result = await run(
      () => authClient.twoFactor.enable({ password }),
      'Unable to start two-factor setup'
    );
    if (result) setEnrollment(result.data);
  };

  const confirmEnrollment = async (code: string) => {
    // Confirming enrollment replaces the session.
    const result = await run(
      () =>
        changeSession(() =>
          authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice: true })
        ),
      'Invalid authenticator code'
    );
    if (result) {
      setEnabled(true);
      setMessage('Two-factor authentication is enabled. Your saved backup codes are ready to use.');
    }
  };

  const regenerate = async (password: string) => {
    const result = await run(
      () => authClient.twoFactor.generateBackupCodes({ password }),
      'Unable to regenerate backup codes'
    );
    if (result?.data) {
      downloadBackupCodes(result.data.backupCodes);
      setMessage('New backup codes downloaded. Previous codes no longer work.');
    }
  };

  const disable = async (password: string) => {
    // Disabling replaces the session.
    const result = await run(
      () => changeSession(() => authClient.twoFactor.disable({ password })),
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
