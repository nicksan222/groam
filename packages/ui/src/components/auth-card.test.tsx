import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { AuthCard } from './auth-card';

afterEach(cleanup);

test('renders the title, description, children, and footer', () => {
  render(
    <AuthCard
      description="Sign in to continue"
      footer="By continuing you agree to the terms."
      title="Welcome back"
    >
      <button type="button">Sign in</button>
    </AuthCard>
  );

  expect(screen.getByText('Welcome back')).toBeTruthy();
  expect(screen.getByText('Sign in to continue')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  expect(screen.getByText('By continuing you agree to the terms.')).toBeTruthy();
});

test('renders optional header extra content', () => {
  render(
    <AuthCard headerExtra={<span>Your workspace awaits</span>} title="Create your account">
      <input aria-label="Email" />
    </AuthCard>
  );

  expect(screen.getByText('Your workspace awaits')).toBeTruthy();
  expect(screen.getByLabelText('Email')).toBeTruthy();
});
