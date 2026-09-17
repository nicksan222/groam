import { authClient } from '@groam/auth/client';
import { useState } from 'react';
import { errorMessage } from '@/lib/errors';

function downloadAccountRecoveryCodes(codes: string[]) {
  const contents = [
    'Groam account recovery codes',
    '',
    ...codes,
    '',
    'Any one code can reset your password. A successful reset or a new set invalidates this entire set.'
  ].join('\n');
  const href = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.download = 'groam-account-recovery-codes.txt';
  link.href = href;
  link.click();
  URL.revokeObjectURL(href);
}

export function useAccountRecoverySettings() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const generate = async (password: string) => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authClient.accountRecovery.generate({ password });
      if (result.error)
        throw new Error(result.error.message ?? 'Unable to generate recovery codes');
      downloadAccountRecoveryCodes(result.data.codes);
      setMessage('Recovery codes downloaded. Any previous account recovery codes no longer work.');
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Unable to generate recovery codes'));
    } finally {
      setPending(false);
    }
  };

  return { error, generate, isPending, message };
}
