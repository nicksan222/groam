import type { authClient } from '@groam/auth/client';

export type Passkey = NonNullable<
  Awaited<ReturnType<typeof authClient.passkey.listUserPasskeys>>['data']
>[number];

export type TwoFactorEnrollment = {
  backupCodes: string[];
  totpURI: string;
};
