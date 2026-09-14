import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { auth } from '@/features/auth/auth-client-mock';
import { useAuthFormStore } from '@/lib/stores/auth-form-store';
import { useAuthForm } from './use-auth-form';

describe('useAuthForm', () => {
  beforeEach(() => {
    useAuthFormStore.getState().reset();
  });
  test('signs in with email and password', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({
        email: 'traveler@example.com',
        password: 'password123'
      })
    );

    await act(() => result.current.submit());

    expect(auth.signIn).toHaveBeenCalledWith({
      email: 'traveler@example.com',
      password: 'password123'
    });
    expect(result.current.state).toMatchObject({
      error: null,
      isPending: false
    });
  });

  test('signs up with trimmed name', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({
        email: 'traveler@example.com',
        flow: 'signUp',
        name: '  Traveler  ',
        password: 'password123'
      })
    );

    await act(() => result.current.submit());

    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'traveler@example.com',
      name: 'Traveler',
      password: 'password123'
    });
    expect(result.current.state).toMatchObject({
      error: null,
      isPending: false
    });
  });

  test('rejects incomplete sign-in fields without calling auth', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.updateState({ email: 'traveler@example.com' }));

    await act(() => result.current.submit());

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(result.current.state.error).toBe('Complete every required field to continue.');
  });

  test('rejects sign-up without a name', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({
        email: 'traveler@example.com',
        flow: 'signUp',
        password: 'password123'
      })
    );

    await act(() => result.current.submit());

    expect(auth.signUp).not.toHaveBeenCalled();
    expect(result.current.state.error).toBe('Complete every required field to continue.');
  });

  test('rejects passwords shorter than 8 characters', async () => {
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({
        email: 'traveler@example.com',
        password: 'short'
      })
    );

    await act(() => result.current.submit());

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(result.current.state.error).toBe('Your password must be at least 8 characters.');
  });

  test('surfaces sign-in auth errors', async () => {
    auth.signIn.mockResolvedValue({
      data: null,
      error: { message: 'Invalid email or password' }
    });
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({
        email: 'traveler@example.com',
        password: 'password123'
      })
    );

    await act(() => result.current.submit());

    expect(result.current.state).toMatchObject({
      error: 'Invalid email or password',
      isPending: false
    });
  });

  test('surfaces sign-up auth errors', async () => {
    auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'An account with this email already exists' }
    });
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({
        email: 'traveler@example.com',
        flow: 'signUp',
        name: 'Traveler',
        password: 'password123'
      })
    );

    await act(() => result.current.submit());

    expect(result.current.state).toMatchObject({
      error: 'An account with this email already exists',
      isPending: false
    });
  });

  test('switchFlow clears the password and error', () => {
    const { result } = renderHook(() => useAuthForm());
    act(() =>
      result.current.updateState({
        error: 'Authentication failed',
        password: 'password123'
      })
    );

    act(() => result.current.switchFlow());

    expect(result.current.isSignIn).toBe(false);
    expect(result.current.state).toMatchObject({
      error: null,
      flow: 'signUp',
      password: ''
    });
  });
});
