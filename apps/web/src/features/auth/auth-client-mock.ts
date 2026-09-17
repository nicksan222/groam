import { beforeEach, vi } from 'vitest';

const doubles = vi.hoisted(() => ({
  generateRecoveryCodes: vi.fn(),
  passkey: vi.fn(),
  resetPasswordWithRecoveryCode: vi.fn(),
  signInEmail: vi.fn(),
  signInUsername: vi.fn(),
  signUp: vi.fn(),
  verifyBackupCode: vi.fn(),
  verifyTotp: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({
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
}));

export const auth = {
  get recoverAccount() {
    return doubles.resetPasswordWithRecoveryCode;
  },
  get signIn() {
    return doubles.signInUsername;
  },
  get signInEmail() {
    return doubles.signInEmail;
  },
  get signUp() {
    return doubles.signUp;
  },
  get verifyBackupCode() {
    return doubles.verifyBackupCode;
  },
  get verifyTotp() {
    return doubles.verifyTotp;
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  doubles.passkey.mockResolvedValue({ data: {}, error: null });
  doubles.generateRecoveryCodes.mockResolvedValue({ data: { codes: [] }, error: null });
  doubles.resetPasswordWithRecoveryCode.mockResolvedValue({ data: { status: true }, error: null });
  doubles.signInEmail.mockResolvedValue({ data: {}, error: null });
  doubles.signInUsername.mockResolvedValue({ data: {}, error: null });
  doubles.signUp.mockResolvedValue({ data: {}, error: null });
  doubles.verifyBackupCode.mockResolvedValue({ data: {}, error: null });
  doubles.verifyTotp.mockResolvedValue({ data: {}, error: null });
});
