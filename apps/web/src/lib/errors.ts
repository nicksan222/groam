import { toast } from '@groam/ui/components/toast';
import { errorMessage } from '@groam/ui/lib/errors';

export { errorMessage };

/**
 * Runs a write and toasts the failure, so hooks never repeat the try/catch. Resolves to the
 * action's result, or `null` after a failure. `success` is toasted only when it worked.
 */
export async function attemptValue<T>(
  action: () => Promise<T>,
  fallback: string,
  success?: string
): Promise<T | null> {
  try {
    const value = await action();
    if (success) toast.success(success);
    return value;
  } catch (error: unknown) {
    toast.error(errorMessage(error, fallback));
    return null;
  }
}

/** `attemptValue` for writes whose result does not matter: resolves to whether it succeeded. */
export async function attempt(
  action: () => Promise<unknown>,
  fallback: string,
  success?: string
): Promise<boolean> {
  const done = await attemptValue(async () => (await action(), true), fallback, success);
  return done === true;
}
