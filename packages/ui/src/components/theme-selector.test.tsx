import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ThemeSelector } from './theme-selector';

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: vi.fn(), theme: 'light' })
}));

test('exports ThemeSelector with light, dark, and system choices', async () => {
  await render(<ThemeSelector labels={{ dark: 'Dark', light: 'Light', system: 'System' }} />);

  await expect.element(page.getByRole('group', { name: 'Color theme' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Light' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Dark' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'System' })).toBeInTheDocument();
});
