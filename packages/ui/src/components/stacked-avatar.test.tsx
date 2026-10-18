import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { StackedAvatar } from './stacked-avatar';

test('renders a single face', async () => {
  const { container } = await render(
    <StackedAvatar faces={[{ alt: 'Alex Morgan', fallback: 'AM', src: '/alex.jpg' }]} size="md" />
  );

  await expect.element(page.getByText('AM')).toBeInTheDocument();
  expect(container.firstElementChild?.className).toContain('size-12');
});

test('stacks two faces with overlapping frames', async () => {
  const { container } = await render(
    <StackedAvatar
      faces={[
        { alt: 'Alex Morgan', fallback: 'AM' },
        { alt: 'Sam Planner', fallback: 'SP' }
      ]}
      size="sm"
    />
  );

  await expect.element(page.getByText('AM')).toBeInTheDocument();
  await expect.element(page.getByText('SP')).toBeInTheDocument();
  expect(container.firstElementChild?.className).toContain('size-9');
});
