import { beforeEach, vi } from 'vitest';

const doubles = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn()
}));

vi.mock('@groam/auth/client', () => ({
  authClient: {
    signIn: { email: doubles.signIn },
    signUp: { email: doubles.signUp }
  }
}));

export const auth = {
  get signIn() {
    return doubles.signIn;
  },
  get signUp() {
    return doubles.signUp;
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  doubles.signIn.mockResolvedValue({ data: {}, error: null });
  doubles.signUp.mockResolvedValue({ data: {}, error: null });
});
