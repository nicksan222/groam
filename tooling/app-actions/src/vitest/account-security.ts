import { expect, vi } from 'vite-plus/test';
import { cdp, page } from 'vite-plus/test/browser';
import { ids } from '#src/testing/ids';
import type { TestUserCredentials } from '#src/testing/unique-test-user';
import { reloadAppPage } from './app-host';
import { signIn, signOut } from './auth';
import { by } from './locators';
import { tap, enter } from './queries';

/** Clicks a control that downloads a text file and returns what the file would contain. */
async function downloadedText(testId: string): Promise<string> {
  const original = URL.createObjectURL.bind(URL);
  const blobs: Blob[] = [];
  const spy = vi.spyOn(URL, 'createObjectURL').mockImplementation((object) => {
    if (object instanceof Blob) blobs.push(object);
    return original(object);
  });
  try {
    await tap(by(testId));
    await expect.poll(() => blobs.length).toBeGreaterThan(0);
    const [blob] = blobs;
    if (!blob) throw new Error('The control did not download a file');
    return await blob.text();
  } finally {
    spy.mockRestore();
  }
}

function decodeBase32(value: string): Uint8Array<ArrayBuffer> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const character of value.toUpperCase().replaceAll('=', '')) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('Authenticator secret is not valid base32');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes = bits.match(/.{8}/gu)?.map((byte) => Number.parseInt(byte, 2)) ?? [];
  return new Uint8Array(bytes);
}

/** The current one-time code for an `otpauth://` URI, as an authenticator app would show it. */
async function currentTotp(uri: string): Promise<string> {
  const parsed = new URL(uri);
  const secret = parsed.searchParams.get('secret');
  if (!secret) throw new Error('Authenticator URI has no secret');
  const period = Number(parsed.searchParams.get('period') ?? 30);
  const digits = Number(parsed.searchParams.get('digits') ?? 6);
  const algorithm = (parsed.searchParams.get('algorithm') ?? 'SHA1').toUpperCase();
  const counter = new ArrayBuffer(8);
  new DataView(counter).setBigUint64(0, BigInt(Math.floor(Date.now() / 1000 / period)));
  const key = await crypto.subtle.importKey(
    'raw',
    decodeBase32(secret),
    { hash: `SHA-${algorithm.replace('SHA', '') || '1'}`, name: 'HMAC' },
    false,
    ['sign']
  );
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter));
  const offset = (digest.at(-1) ?? 0) & 0x0f;
  const view = new DataView(digest.buffer);
  const binary = (view.getUint32(offset) & 0x7fffffff) % 10 ** digits;
  return binary.toString().padStart(digits, '0');
}

export async function recoverAccountWithDownloadedCode(
  username: string,
  newPassword: string,
  currentPassword: string
): Promise<void> {
  await enter(by(ids.settingsRecoveryPassword), currentPassword);
  const contents = await downloadedText(ids.settingsRecoveryGenerate);
  const recoveryCode = contents.match(/[A-Z0-9]{4}(?:-[A-Z0-9]{4}){4}/u)?.[0];
  if (!recoveryCode) throw new Error('Downloaded file contained no account recovery code');

  await signOut();
  await tap(by(ids.authRecoveryOpen));
  await enter(by(ids.authRecoveryUsername), username);
  await enter(by(ids.authRecoveryCode), recoveryCode);
  await enter(by(ids.authRecoveryNewPassword), newPassword);
  await tap(by(ids.authSubmit));
  await signIn({ email: username, password: newPassword });
  await expect.element(by(ids.navTrips)).toBeVisible();
}

/** Registers a passkey on a virtual authenticator, signs out and back in with it. */
export async function registerPasskeyAndSignIn(name: string): Promise<void> {
  const session = cdp();
  await session.send('WebAuthn.enable');
  await session.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      automaticPresenceSimulation: true,
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      protocol: 'ctap2',
      transport: 'internal'
    }
  });

  await enter(by(ids.settingsPasskeyName), name);
  await tap(by(ids.settingsPasskeyAdd));
  await expect.element(page.getByText(name)).toBeVisible();
  await signOut();
  await tap(page.getByRole('button', { name: 'Use a passkey' }));
  await expect.element(by(ids.navTrips)).toBeVisible();
}

export async function enableTwoFactorAndSignInWithBackupCode(
  user: TestUserCredentials
): Promise<void> {
  await enter(by(ids.settingsTwoFactorPassword), user.password);
  await tap(by(ids.settingsTwoFactorStart));
  await expect.element(by(ids.settingsTwoFactorUri)).toMatchTextContent(/otpauth:/u);
  const uri = by(ids.settingsTwoFactorUri).element().textContent;
  if (!uri) throw new Error('Two-factor enrollment did not expose an authenticator URI');

  const contents = await downloadedText(ids.settingsTwoFactorDownload);
  const backupCode = contents
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.includes(' ') && line !== 'Groam backup codes');
  if (!backupCode) throw new Error('Downloaded file contained no two-factor backup code');

  await enter(by(ids.settingsTwoFactorCode), await currentTotp(uri));
  await tap(by(ids.settingsTwoFactorConfirm));
  await expect.element(page.getByText(/Status:\s*Enabled/u)).toBeVisible();
  await signOut();
  // Wait for the auth form to remount after sign-out before entering new credentials.
  await reloadAppPage();
  await expect.element(by(ids.authEmail)).toBeVisible();
  await signIn({ email: user.username, password: user.password });
  await enter(by(ids.authTwoFactorCode), backupCode);
  await tap(by(ids.authSubmit));
  await expect.element(by(ids.navTrips)).toBeVisible();
}
