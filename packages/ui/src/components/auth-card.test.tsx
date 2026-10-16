import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AuthCard } from './auth-card';

test('renders the title, description, children, and footer', async () => {
  await render(
    <AuthCard
      description="Sign in to continue"
      footer="By continuing you agree to the terms."
      title="Welcome back"
    >
      <button type="button">Sign in</button>
    </AuthCard>
  );

  await expect.element(page.getByText('Welcome back')).toBeInTheDocument();
  await expect.element(page.getByText('Sign in to continue')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  await expect.element(page.getByText('By continuing you agree to the terms.')).toBeInTheDocument();
});

test('renders optional header extra content', async () => {
  await render(
    <AuthCard headerExtra={<span>Your workspace awaits</span>} title="Create your account">
      <input aria-label="Email" />
    </AuthCard>
  );

  await expect.element(page.getByText('Your workspace awaits')).toBeInTheDocument();
  await expect.element(page.getByLabelText('Email')).toBeInTheDocument();
});
