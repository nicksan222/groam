import { render } from '@groam/vitest-config/react';
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AuthShell } from './auth-shell';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' })
}));

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('renders the branded home link and children', async () => {
  await render(
    <AuthShell>
      <p>Sign in form</p>
    </AuthShell>
  );

  const home = page.getByRole('link', { name: 'Groam home' }).element();
  expect(home.getAttribute('href')).toBe('/');
  await expect.element(page.getByText('groam')).toBeInTheDocument();
  await expect.element(page.getByText('Sign in form')).toBeInTheDocument();
  expect(document.querySelector('[data-slot="aurora-background"]')).toBeTruthy();
});
