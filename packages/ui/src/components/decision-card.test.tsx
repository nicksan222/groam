import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DecisionCard } from './decision-card';

test('renders title, description, actions, and optional error', async () => {
  await render(
    <DecisionCard
      actions={<button type="button">Accept</button>}
      description="Ada invited you to join as a member."
      error="That invite expired."
      icon={<span>Org</span>}
      title="Join Groam Demo"
    />
  );

  await expect.element(page.getByRole('heading', { name: 'Join Groam Demo' })).toBeInTheDocument();
  await expect.element(page.getByText('Ada invited you to join as a member.')).toBeInTheDocument();
  await expect.element(page.getByText('That invite expired.')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
});
