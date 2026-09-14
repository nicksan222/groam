import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { WorkspaceNotice } from './workspace-notice';

test('renders workspace context with an optional action', () => {
  render(
    <WorkspaceNotice
      action={<button type="button">View original</button>}
      description="Changes remain separate until approval."
      icon={<span>icon</span>}
      title="You’re working in a fork"
    />
  );

  expect(screen.getByText('You’re working in a fork')).toBeTruthy();
  expect(screen.getByText('Changes remain separate until approval.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'View original' })).toBeTruthy();
});

test('renders a compact inset chip instead of a full-bleed strip', () => {
  render(
    <WorkspaceNotice
      compact
      description="Stay on any section of this idea."
      icon={<span>icon</span>}
      title="You’re shaping an idea"
    />
  );

  const notice = screen.getByText('You’re shaping an idea').closest('section');
  expect(notice?.className).toContain('py-1.5');
  expect(notice?.className).toContain('rounded-lg');
  expect(notice?.className).not.toContain('p-4');
  expect(notice?.className).not.toContain('rounded-none');
});
