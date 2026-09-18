import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';
import { ids } from './ids';
import { by } from './locators';
import { signOut } from './sign-out';
import type { TestUserCredentials } from './unique-test-user';

async function downloadedText(page: Page, testId: (typeof ids)[keyof typeof ids]) {
  const downloadPromise = page.waitForEvent('download');
  await by(page, testId).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('Browser did not persist the downloaded security file');
  return await readFile(path, 'utf8');
}

function decodeBase32(value: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const character of value.toUpperCase().replaceAll('=', '')) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('Authenticator secret is not valid base32');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes = bits.match(/.{8}/gu)?.map((byte) => Number.parseInt(byte, 2)) ?? [];
  return Buffer.from(bytes);
}

function currentTotp(uri: string): string {
  const parsed = new URL(uri);
  const secret = parsed.searchParams.get('secret');
  if (!secret) throw new Error('Authenticator URI has no secret');
  const period = Number(parsed.searchParams.get('period') ?? 30);
  const digits = Number(parsed.searchParams.get('digits') ?? 6);
  const algorithm = (parsed.searchParams.get('algorithm') ?? 'SHA1').toLowerCase();
  const counter = BigInt(Math.floor(Date.now() / 1000 / period));
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(counter);
  const digest = createHmac(algorithm, decodeBase32(secret)).update(buffer).digest();
  const offset = (digest.at(-1) ?? 0) & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return binary.toString().padStart(digits, '0');
}

export async function recoverAccountWithDownloadedCode(
  page: Page,
  username: string,
  newPassword: string,
  currentPassword: string
) {
  await by(page, ids.settingsRecoveryPassword).fill(currentPassword);
  const contents = await downloadedText(page, ids.settingsRecoveryGenerate);
  const recoveryCode = contents.match(/[A-Z0-9]{4}(?:-[A-Z0-9]{4}){4}/u)?.[0];
  if (!recoveryCode) throw new Error('Downloaded file contained no account recovery code');

  await signOut(page);
  await by(page, ids.authRecoveryOpen).click();
  await by(page, ids.authRecoveryUsername).fill(username);
  await by(page, ids.authRecoveryCode).fill(recoveryCode);
  await by(page, ids.authRecoveryNewPassword).fill(newPassword);
  await by(page, ids.authSubmit).click();
  await by(page, ids.authEmail).fill(username);
  await by(page, ids.authPassword).fill(newPassword);
  await by(page, ids.authSubmit).click();
  await expect(by(page, ids.navTrips)).toBeVisible();
}

export async function registerPasskeyAndSignIn(page: Page, name: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      automaticPresenceSimulation: true,
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      protocol: 'ctap2',
      transport: 'internal'
    }
  });

  await by(page, ids.settingsPasskeyName).fill(name);
  await by(page, ids.settingsPasskeyAdd).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await signOut(page);
  await page.getByRole('button', { name: 'Use a passkey' }).click();
  await expect(by(page, ids.navTrips)).toBeVisible();
}

export async function enableTwoFactorAndSignInWithBackupCode(
  page: Page,
  user: TestUserCredentials
) {
  await by(page, ids.settingsTwoFactorPassword).fill(user.password);
  await by(page, ids.settingsTwoFactorStart).click();
  const uri = await by(page, ids.settingsTwoFactorUri).textContent();
  if (!uri) throw new Error('Two-factor enrollment did not expose an authenticator URI');

  const contents = await downloadedText(page, ids.settingsTwoFactorDownload);
  const backupCode = contents
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.includes(' ') && line !== 'Groam backup codes');
  if (!backupCode) throw new Error('Downloaded file contained no two-factor backup code');

  await by(page, ids.settingsTwoFactorCode).fill(currentTotp(uri));
  await by(page, ids.settingsTwoFactorConfirm).click();
  await expect(page.getByText(/Status:\s*Enabled/u)).toBeVisible();
  await signOut(page);
  await by(page, ids.authEmail).fill(user.username);
  await by(page, ids.authPassword).fill(user.password);
  await by(page, ids.authSubmit).click();
  await by(page, ids.authTwoFactorCode).fill(backupCode);
  await by(page, ids.authSubmit).click();
  await expect(by(page, ids.navTrips)).toBeVisible();
}
