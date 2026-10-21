import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import App from './app';

const session = vi.hoisted(() => ({ authenticated: true }));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  Authenticated: ({ children }: { children: ReactNode }) =>
    session.authenticated ? children : null,
  Unauthenticated: ({ children }: { children: ReactNode }) =>
    session.authenticated ? null : children,
  AuthLoading: () => null
}));
vi.mock('@/features/auth/hooks/use-session-change', () => ({
  useSessionChange: () => ({ changeSession: vi.fn(), isChangingSession: false })
}));
vi.mock('@/features/auth/auth-screen', () => ({
  AuthScreen: () => <p>Account recovery screen</p>
}));

let originalURL: string;
beforeEach(() => {
  originalURL = window.location.href;
  session.authenticated = true;
});
afterEach(() => {
  window.history.replaceState(null, '', originalURL);
});

test.each([true, false])(
  'opens marked reset links with authenticated=%s',
  async (authenticated) => {
    session.authenticated = authenticated;
    window.history.replaceState(
      null,
      '',
      '/app/trips/example/board?token=reset-token&auth=reset-password'
    );
    await render(
      <App>
        <p>Signed in workspace</p>
      </App>
    );
    await expect.element(page.getByText('Account recovery screen')).toBeInTheDocument();
    await expect.element(page.getByText('Signed in workspace')).not.toBeInTheDocument();
  }
);

test.each([
  '/app/trips/example/board?token=other-token',
  '/app/?token=unmarked-token',
  '/app/?auth=reset-password',
  '/app/'
])('keeps ordinary workspace URLs in the router: %s', async (path) => {
  window.history.replaceState(null, '', path);
  await render(
    <App>
      <p>Signed in workspace</p>
    </App>
  );
  await expect.element(page.getByText('Signed in workspace')).toBeInTheDocument();
  await expect.element(page.getByText('Account recovery screen')).not.toBeInTheDocument();
});
