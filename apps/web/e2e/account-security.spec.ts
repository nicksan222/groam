import {
  completeOnboarding,
  enableTwoFactorAndSignInWithBackupCode,
  openSettingsSecuritySection,
  recoverAccountWithDownloadedCode,
  registerPasskeyAndSignIn
} from '@groam/app-actions/playwright';
import { test } from '@playwright/test';

const recoveredPassword = 'Recovered-password-1234';
test.setTimeout(120_000);

test('resets a forgotten password with a downloaded account recovery code', async ({ page }) => {
  const { user } = await completeOnboarding(page, { groupName: `Recovery ${Date.now()}` });
  await openSettingsSecuritySection(page);
  await recoverAccountWithDownloadedCode(page, user.username, recoveredPassword, user.password);
});

test('registers a passkey and signs in with the discoverable credential', async ({ page }) => {
  await completeOnboarding(page, { groupName: `Passkey ${Date.now()}` });
  await openSettingsSecuritySection(page);
  await registerPasskeyAndSignIn(page, 'Playwright authenticator');
});

test('enables an authenticator and signs in with a downloaded backup code', async ({ page }) => {
  const { user } = await completeOnboarding(page, { groupName: `Authenticator ${Date.now()}` });
  await openSettingsSecuritySection(page);
  await enableTwoFactorAndSignInWithBackupCode(page, user);
});
