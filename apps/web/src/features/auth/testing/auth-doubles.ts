import { vi } from 'vite-plus/test';

/** Spies for every `authClient` call the auth screen and form hook make. */
export function createAuthDoubles() {
  return {
    generateRecoveryCodes: vi.fn(),
    passkey: vi.fn(),
    resetPasswordWithRecoveryCode: vi.fn(),
    signInEmail: vi.fn(),
    signInUsername: vi.fn(),
    signUp: vi.fn(),
    verifyBackupCode: vi.fn(),
    verifyTotp: vi.fn()
  };
}

/** The handlers `useAuthForm` receives, wired to the spies. */
export function authHandlers(doubles: ReturnType<typeof createAuthDoubles>) {
  return {
    passkey: doubles.passkey,
    recoverAccount: doubles.resetPasswordWithRecoveryCode,
    signIn: doubles.signInUsername,
    signInEmail: doubles.signInEmail,
    signUp: doubles.signUp,
    verifyBackupCode: doubles.verifyBackupCode,
    verifyTotp: doubles.verifyTotp
  };
}

/** Module mock for `@groam/auth/client`. */
export function authClientMock(doubles: ReturnType<typeof createAuthDoubles>) {
  return {
    authClient: {
      accountRecovery: {
        generate: doubles.generateRecoveryCodes,
        resetPassword: doubles.resetPasswordWithRecoveryCode
      },
      signIn: {
        email: doubles.signInEmail,
        passkey: doubles.passkey,
        username: doubles.signInUsername
      },
      signUp: { email: doubles.signUp },
      twoFactor: {
        verifyBackupCode: doubles.verifyBackupCode,
        verifyTotp: doubles.verifyTotp
      }
    }
  };
}

/** Make every spy resolve successfully, as after `vi.clearAllMocks()`. */
export function resolveAuthDoubles(doubles: ReturnType<typeof createAuthDoubles>) {
  doubles.passkey.mockResolvedValue({ data: {}, error: null });
  doubles.generateRecoveryCodes.mockResolvedValue({ data: { codes: [] }, error: null });
  doubles.resetPasswordWithRecoveryCode.mockResolvedValue({ data: { status: true }, error: null });
  doubles.signInEmail.mockResolvedValue({ data: {}, error: null });
  doubles.signInUsername.mockResolvedValue({ data: {}, error: null });
  doubles.signUp.mockResolvedValue({ data: {}, error: null });
  doubles.verifyBackupCode.mockResolvedValue({ data: {}, error: null });
  doubles.verifyTotp.mockResolvedValue({ data: {}, error: null });
}
