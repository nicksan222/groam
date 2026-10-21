import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import App from './app';

vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  Authenticated: ({ children }: { children: ReactNode }) => children,
  Unauthenticated: () => null,
  AuthLoading: () => null
}));
vi.mock('@/features/auth/hooks/use-session-change', () => ({
  useSessionChange: () => ({ changeSession: vi.fn(), isChangingSession: false })
}));
vi.mock('@/features/auth/auth-screen', () => ({
  AuthScreen: () => <p>Account recovery screen</p>
}));

const originalURL = window.location.href;
afterEach(() => window.history.replaceState(null, '', originalURL));

test('signed-in people opening an expired reset link see the recovery screen', async () => {
  window.history.replaceState(
    null,
    '',
    '/app/trips/example/board?auth=reset-password&error=INVALID_TOKEN'
  );
  await render(
    <App>
      <p>Signed in workspace</p>
    </App>
  );
  await expect.element(page.getByText('Account recovery screen')).toBeInTheDocument();
  await expect.element(page.getByText('Signed in workspace')).not.toBeInTheDocument();
});
