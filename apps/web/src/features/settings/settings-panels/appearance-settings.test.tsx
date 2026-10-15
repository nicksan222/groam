import { UiThemeProvider } from '@groam/ui/components/theme-provider';
import { render } from '@groam/vitest-config/react';
import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AppearanceSettings } from './appearance-settings';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = () => document.documentElement.classList.contains('dark');

beforeEach(() => {
  localStorage.removeItem('groam-theme');
});

afterEach(() => {
  localStorage.removeItem('groam-theme');
  document.documentElement.classList.remove('dark', 'light');
  return page.viewport(1280, 800);
});

async function renderAppearance() {
  return render(
    <UiThemeProvider>
      <AppearanceSettings />
    </UiThemeProvider>
  );
}

describe('color theme', () => {
  test('follows the device setting until a theme is chosen', async () => {
    await renderAppearance();
    await expect.poll(isDark).toBe(prefersDark());
    expect(localStorage.getItem('groam-theme')).toBeNull();
  });

  test('applies and remembers an explicit light or dark choice', async () => {
    await renderAppearance();
    await page.getByRole('button', { name: 'Dark' }).click();
    await expect.poll(isDark).toBe(true);
    expect(localStorage.getItem('groam-theme')).toBe('dark');

    await page.getByRole('button', { name: 'Light' }).click();
    await expect.poll(isDark).toBe(false);
    expect(localStorage.getItem('groam-theme')).toBe('light');
  });

  test('returns to the device setting when System is selected again', async () => {
    await renderAppearance();
    await page.getByRole('button', { name: 'Dark' }).click();
    await expect.poll(isDark).toBe(true);
    await page.getByRole('button', { name: 'System' }).click();
    await expect.poll(isDark).toBe(prefersDark());
    expect(localStorage.getItem('groam-theme')).toBe('system');
  });

  test('reports the saved choice as the pressed one', async () => {
    localStorage.setItem('groam-theme', 'dark');
    await renderAppearance();
    await expect
      .element(page.getByRole('button', { name: 'Dark' }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect
      .element(page.getByRole('button', { name: 'System' }))
      .toHaveAttribute('aria-pressed', 'false');
  });

  test('fits a phone without scrolling sideways', async () => {
    await page.viewport(390, 844);
    await renderAppearance();
    await expect.element(page.getByRole('button', { name: 'System' })).toBeVisible();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth
    );
  });
});
