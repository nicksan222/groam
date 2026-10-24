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

test('applies a per-face initials class and the frame class', async () => {
  const { container } = await render(
    <StackedAvatar
      className="dark:saturate-150"
      faces={[{ alt: '', fallback: 'AM', fallbackClassName: 'bg-chart-1' }]}
    />
  );

  expect(container.firstElementChild?.className).toContain('dark:saturate-150');
  expect(page.getByText('AM').element().className).toContain('bg-chart-1');
});

test('the second face takes the ring class', async () => {
  await render(
    <StackedAvatar
      faces={[
        { alt: '', fallback: 'AM' },
        { alt: '', fallback: 'SP' }
      ]}
      ringClassName="ring-muted"
    />
  );

  const second = page.getByText('SP').element().closest('[data-slot="avatar"]');
  expect(second?.className).toContain('ring-muted');
});
