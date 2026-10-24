import { authClient } from '@groam/auth/client';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { useState } from 'react';
import { downloadTextFile } from '@/lib/download-text-file';

function downloadAccountRecoveryCodes(codes: string[]) {
  const contents = [
    'Groam account recovery codes',
    '',
    ...codes,
    '',
    'Any one code can reset your password. A successful reset or a new set invalidates this entire set.'
  ].join('\n');
  downloadTextFile('groam-account-recovery-codes.txt', contents);
}

export function useAccountRecoverySettings() {
  const { error, isPending, run } = useAsyncAction({
    fallbackError: 'Unable to generate recovery codes'
  });
  const [message, setMessage] = useState<string | null>(null);

  const generate = async (password: string) => {
    setMessage(null);
    await run(async () => {
      const result = await authClient.accountRecovery.generate({ password });
      if (result.error)
        throw new Error(result.error.message ?? 'Unable to generate recovery codes');
      downloadAccountRecoveryCodes(result.data.codes);
      setMessage('Recovery codes downloaded. Any previous account recovery codes no longer work.');
    });
  };

  return { error, generate, isPending, message };
}
