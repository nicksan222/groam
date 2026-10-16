import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { MutedCopy } from './muted-copy';

test('renders muted supporting copy', async () => {
  await render(<MutedCopy>Nothing is waiting on your take right now.</MutedCopy>);

  const copy = page.getByText('Nothing is waiting on your take right now.').element();
  expect(copy.tagName).toBe('P');
  expect(copy.className).toContain('text-muted-foreground');
  expect(copy.getAttribute('data-slot')).toBe('muted-copy');
});
