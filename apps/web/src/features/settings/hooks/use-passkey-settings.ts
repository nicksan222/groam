import { authClient } from '@groam/auth/client';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import type { Passkey } from '@/types/account-security';

export function usePasskeySettings() {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await authClient.passkey.listUserPasskeys();
      if (result.error) throw new Error(result.error.message ?? 'Unable to load passkeys');
      setPasskeys(result.data ?? []);
      setLoadError(null);
    } catch (cause: unknown) {
      setLoadError(errorMessage(cause, 'Unable to load passkeys'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const action = useAsyncAction({ fallbackError: 'Unable to update passkeys' });
  const { isPending, run } = action;
  // Which passkey ('add' for a new one) the running action is for; shown only while it runs.
  const [target, setTarget] = useState<string | null>(null);

  const add = async (name: string) => {
    await run(async () => {
      setTarget('add');
      setLoadError(null);
      const result = await authClient.passkey.addPasskey({ name: name.trim() || 'Passkey' });
      if (result.error) throw new Error(result.error.message ?? 'Unable to add passkey');
      await refresh();
    });
  };

  const remove = async (id: string) => {
    await run(async () => {
      setTarget(id);
      setLoadError(null);
      const result = await authClient.passkey.deletePasskey({ id });
      if (result.error) throw new Error(result.error.message ?? 'Unable to remove passkey');
      setPasskeys((current) => current.filter((passkey) => passkey.id !== id));
    });
  };

  return {
    add,
    error: action.error ?? loadError,
    isLoading,
    passkeys,
    pendingId: isPending ? target : null,
    refresh,
    remove
  };
}
