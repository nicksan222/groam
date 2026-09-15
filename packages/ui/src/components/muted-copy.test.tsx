import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { MutedCopy } from './muted-copy';

afterEach(cleanup);

test('renders muted supporting copy', () => {
  render(<MutedCopy>Nothing is waiting on your take right now.</MutedCopy>);

  const copy = screen.getByText('Nothing is waiting on your take right now.');
  expect(copy.tagName).toBe('P');
  expect(copy.className).toContain('text-muted-foreground');
  expect(copy.getAttribute('data-slot')).toBe('muted-copy');
});
