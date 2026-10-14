import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vite-plus/test';
import { CheckStateIcon } from './check-state-icon';

afterEach(cleanup);

test('renders a filled check when passed', () => {
  const { container, rerender } = render(<CheckStateIcon passed />);
  expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-primary');

  rerender(<CheckStateIcon passed={false} />);
  expect(container.querySelector('svg')?.getAttribute('class')).toContain('text-muted-foreground');
});
