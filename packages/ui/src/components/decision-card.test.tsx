import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { DecisionCard } from './decision-card';

afterEach(cleanup);

test('renders title, description, actions, and optional error', () => {
  render(
    <DecisionCard
      actions={<button type="button">Accept</button>}
      description="Ada invited you to join as a member."
      error="That invite expired."
      icon={<span>Org</span>}
      title="Join Groam Demo"
    />
  );

  expect(screen.getByRole('heading', { name: 'Join Groam Demo' })).toBeTruthy();
  expect(screen.getByText('Ada invited you to join as a member.')).toBeTruthy();
  expect(screen.getByText('That invite expired.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Accept' })).toBeTruthy();
});
