import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { TripToolbarSkeleton } from './trip-toolbar-skeleton';

test('renders a decorative placeholder hidden from assistive tech', async () => {
  const screen = await render(<TripToolbarSkeleton />);
  const root = screen.container.querySelector('[data-slot="trip-toolbar-skeleton"]');
  expect(root).not.toBeNull();
  expect(root?.getAttribute('aria-hidden')).toBe('true');
});
