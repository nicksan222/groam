import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { AppIcon } from './app-icon';

afterEach(cleanup);

test('renders the Groam mark for assistive tech', () => {
  render(<AppIcon />);

  const icon = screen.getByRole('img', { name: 'Groam' });
  expect(icon.getAttribute('viewBox')).toBe('0 0 32 32');
  expect(icon.querySelectorAll('path')).toHaveLength(2);
});

test('hides the mark when decorative', () => {
  render(<AppIcon decorative />);

  expect(screen.queryByRole('img', { name: 'Groam' })).toBeNull();
  expect(document.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
});

test('merges a size class onto the svg', () => {
  render(<AppIcon className="size-14" />);

  expect(screen.getByRole('img', { name: 'Groam' }).getAttribute('class')).toContain('size-14');
});
