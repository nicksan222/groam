import { authClient } from '@groam/auth/client';
import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@/lib/errors';
import type { Passkey } from '@/types/account-security';

export function usePasskeySettings() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await authClient.passkey.listUserPasskeys();
      if (result.error) throw new Error(result.error.message ?? 'Unable to load passkeys');
      setPasskeys(result.data ?? []);
      setError(null);
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Unable to load passkeys'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = async (name: string) => {
    setPendingId('add');
    setError(null);
    try {
      const result = await authClient.passkey.addPasskey({ name: name.trim() || 'Passkey' });
      if (result.error) throw new Error(result.error.message ?? 'Unable to add passkey');
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Unable to add passkey'));
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (id: string) => {
    setPendingId(id);
    setError(null);
    try {
      const result = await authClient.passkey.deletePasskey({ id });
      if (result.error) throw new Error(result.error.message ?? 'Unable to remove passkey');
      setPasskeys((current) => current.filter((passkey) => passkey.id !== id));
    } catch (cause: unknown) {
      setError(errorMessage(cause, 'Unable to remove passkey'));
    } finally {
      setPendingId(null);
    }
  };

  return { add, error, isLoading, passkeys, pendingId, refresh, remove };
}
