import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { WorkspaceNotice } from './workspace-notice';

test('renders workspace context with an optional action', async () => {
  await render(
    <WorkspaceNotice
      action={<button type="button">View original</button>}
      description="Changes remain separate until approval."
      icon={<span>icon</span>}
      title="You’re working in a fork"
    />
  );

  await expect.element(page.getByText('You’re working in a fork')).toBeInTheDocument();
  await expect
    .element(page.getByText('Changes remain separate until approval.'))
    .toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'View original' })).toBeInTheDocument();
});

test('renders a compact inset chip instead of a full-bleed strip', async () => {
  await render(
    <WorkspaceNotice
      compact
      description="Stay on any section of this idea."
      icon={<span>icon</span>}
      title="You’re shaping an idea"
    />
  );

  const notice = page.getByText('You’re shaping an idea').element().closest('section');
  expect(notice?.className).toContain('py-2');
  expect(notice?.className).toContain('rounded-lg');
  expect(notice?.className).not.toContain('p-4');
  expect(notice?.className).not.toContain('rounded-none');
});
