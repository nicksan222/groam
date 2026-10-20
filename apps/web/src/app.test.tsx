import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import App from './app';

const session = vi.hoisted(() => ({ authenticated: true }));
vi.mock('@groam/env/web-client', () => ({ env: { siteUrl: 'https://groam.example/app/' } }));
vi.mock('convex/react', () => ({
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
vi.mock('@/router', () => ({ AppRouter: () => <p>Signed in workspace</p> }));

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
    await render(<App />);
    await expect.element(page.getByText('Account recovery screen')).toBeInTheDocument();
    await expect.element(page.getByText('Signed in workspace')).not.toBeInTheDocument();
  }
);

test('keeps legacy reset links working at the public app root', async () => {
  window.history.replaceState(null, '', '/app/?token=legacy-reset-token');
  await render(<App />);
  await expect.element(page.getByText('Account recovery screen')).toBeInTheDocument();
  await expect.element(page.getByText('Signed in workspace')).not.toBeInTheDocument();
});

test.each(['/app/trips/example/board?token=other-token', '/app/?auth=reset-password', '/app/'])(
  'keeps ordinary workspace URLs in the router: %s',
  async (path) => {
    window.history.replaceState(null, '', path);
    await render(<App />);
    await expect.element(page.getByText('Signed in workspace')).toBeInTheDocument();
    await expect.element(page.getByText('Account recovery screen')).not.toBeInTheDocument();
  }
);
