import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { auth } from '@/features/auth/auth-client-mock';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';
import { AuthScreen } from './auth-screen';

beforeEach(() => {
  useAuthFormStore.getState().reset();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AuthScreen', () => {
  test('renders the sign-in form by default', () => {
    render(<AuthScreen />);

    expect(screen.getByRole('link', { name: 'Groam home' })).toBeTruthy();
    expect(screen.getByText('Welcome back')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.queryByLabelText(/^Name/u)).toBeNull();
  });

  test('switches to sign-up and shows the name field', () => {
    render(<AuthScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(screen.getByText('Create your account')).toBeTruthy();
    expect(screen.getByLabelText(/^Name/u)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
  });

  test('shows validation feedback when required fields are missing', async () => {
    render(<AuthScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Complete every required field to continue.'
    );
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  test('shows auth errors returned from sign-in', async () => {
    auth.signIn.mockResolvedValue({
      data: null,
      error: { message: 'Invalid email or password' }
    });
    render(<AuthScreen />);

    fireEvent.change(screen.getByLabelText(/^Email/u), {
      target: { value: 'traveler@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^Password/u), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Invalid email or password')
    );
  });

  test('submits sign-up credentials on the create-account flow', async () => {
    render(<AuthScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    fireEvent.change(screen.getByLabelText(/^Name/u), { target: { value: 'Traveler' } });
    fireEvent.change(screen.getByLabelText(/^Email/u), {
      target: { value: 'traveler@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/^Password/u), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith({
        email: 'traveler@example.com',
        name: 'Traveler',
        password: 'password123'
      })
    );
  });
});
