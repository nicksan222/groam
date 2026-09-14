import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ThemeSelector } from './theme-selector';

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: vi.fn(), theme: 'light' })
}));

afterEach(cleanup);

test('exports ThemeSelector with light, dark, and system choices', () => {
  render(<ThemeSelector labels={{ dark: 'Dark', light: 'Light', system: 'System' }} />);

  expect(screen.getByRole('group', { name: 'Color theme' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Light' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Dark' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'System' })).toBeTruthy();
});
