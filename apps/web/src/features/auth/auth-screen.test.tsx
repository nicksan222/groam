import { env } from '@groam/env/web-client';
import { render } from '@groam/vitest-config/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { authHandlers, resolveAuthDoubles } from '@/features/auth/testing/auth-doubles';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';
import { AuthScreen } from './auth-screen';

const doubles = await vi.hoisted(async () => {
  const { createAuthDoubles } = await import('@/features/auth/testing/auth-doubles');
  return createAuthDoubles();
});

const auth = authHandlers(doubles);

vi.mock('@groam/auth/client', async () => {
  const { authClientMock } = await import('@/features/auth/testing/auth-doubles');
  return authClientMock(doubles);
});

beforeEach(() => {
  vi.clearAllMocks();
  resolveAuthDoubles(doubles);
  useAuthFormStore.getState().reset();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthScreen', () => {
  test('renders the sign-in form by default', async () => {
    await render(<AuthScreen />);

    await expect.element(page.getByRole('link', { name: 'Groam home' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('link', { name: 'Terms of Service' }))
      .toHaveAttribute('href', new URL('/terms/', env.siteUrl).href);
    await expect
      .element(page.getByRole('link', { name: 'Privacy Policy' }))
      .toHaveAttribute('href', new URL('/privacy/', env.siteUrl).href);
    await expect.element(page.getByText('Welcome back')).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    await expect.element(page.getByLabelText(/^Name/u)).not.toBeInTheDocument();
  });

  test('switches to sign-up and shows the name field', async () => {
    await render(<AuthScreen />);

    await page.getByRole('button', { name: 'Sign up' }).click();

    await expect.element(page.getByText('Create your account')).toBeInTheDocument();
    await expect.element(page.getByLabelText(/^Name/u)).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  test('shows validation feedback when required fields are missing', async () => {
    await render(<AuthScreen />);

    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Complete every required field to continue.');
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  test('shows auth errors returned from sign-in', async () => {
    auth.signIn.mockResolvedValue({
      data: null,
      error: { message: 'Invalid email or password' }
    });
    await render(<AuthScreen />);

    await page.getByLabelText(/^Username or email/u).fill('traveler');
    await page.getByLabelText(/^Password/u).fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  test('submits sign-up credentials on the create-account flow', async () => {
    await render(<AuthScreen />);

    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.getByLabelText(/^Name/u).fill('Traveler');
    await page.getByLabelText(/^Username/u).fill('traveler');
    await page.getByLabelText(/^Password/u).fill('password123');
    await page.getByRole('button', { name: 'Create account' }).click();

    await vi.waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith({
        email: expect.stringMatching(/@users\.invalid$/u),
        name: 'Traveler',
        password: 'password123',
        username: 'traveler'
      })
    );
  });

  test('shows the saved-code recovery form', async () => {
    await render(<AuthScreen />);

    await page.getByRole('button', { name: 'Recover account with a saved code' }).click();

    await expect.element(page.getByText('Recover your account')).toBeInTheDocument();
    await expect.element(page.getByLabelText(/^Saved recovery code/u)).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Reset password' })).toBeInTheDocument();
  });
});
