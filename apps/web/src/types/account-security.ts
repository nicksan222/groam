import type { authClient } from '@groam/auth/client';

export type Passkey = NonNullable<
  Awaited<ReturnType<typeof authClient.passkey.listUserPasskeys>>['data']
>[number];

export type TwoFactorEnrollment = {
  backupCodes: string[];
  totpURI: string;
};

/**
 * Runs an auth request while the workspace is paused. When the request succeeds it must end or
 * replace the session; a result with an `error` (or a throw) means the session survived.
 */
export type ChangeSession = <Result extends { error: unknown }>(
  request: () => Promise<Result>
) => Promise<Result>;
