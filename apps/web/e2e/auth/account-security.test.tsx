import {
  by,
  completeOnboarding,
  ids,
  enableTwoFactorAndSignInWithBackupCode,
  openSettingsSecuritySection,
  recoverAccountWithDownloadedCode,
  registerPasskeyAndSignIn
} from '@groam/app-actions/vitest';
import { expect, test } from 'vite-plus/test';
import { openSignedOutApp } from '@/testing/open-app';

const recoveredPassword = 'Recovered-password-1234';

test('resets a forgotten password with a downloaded account recovery code', async () => {
  await openSignedOutApp();
  const { user } = await completeOnboarding({ groupName: `Recovery ${Date.now()}` });
  await openSettingsSecuritySection();
  await recoverAccountWithDownloadedCode(user.username, recoveredPassword, user.password);
  await expect.element(by(ids.navTrips)).toBeVisible();
});

test('registers a passkey and signs in with the discoverable credential', async () => {
  await openSignedOutApp();
  await completeOnboarding({ groupName: `Passkey ${Date.now()}` });
  await openSettingsSecuritySection();
  await registerPasskeyAndSignIn('Virtual authenticator');
  await expect.element(by(ids.navTrips)).toBeVisible();
});

test('enables an authenticator and signs in with a downloaded backup code', async () => {
  await openSignedOutApp();
  const { user } = await completeOnboarding({ groupName: `Authenticator ${Date.now()}` });
  await openSettingsSecuritySection();
  await enableTwoFactorAndSignInWithBackupCode(user);
  await expect.element(by(ids.navTrips)).toBeVisible();
});
