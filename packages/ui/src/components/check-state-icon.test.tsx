import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { CheckStateIcon } from './check-state-icon';

test('renders a filled check when passed', async () => {
  const { container, rerender } = await render(<CheckStateIcon passed />);
  expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-primary');

  await rerender(<CheckStateIcon passed={false} />);
  expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-muted-foreground');
});
