import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AuthShell } from './auth-shell';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' })
}));

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('renders the branded home link and children', () => {
  render(
    <AuthShell>
      <p>Sign in form</p>
    </AuthShell>
  );

  const home = screen.getByRole('link', { name: 'Groam home' });
  expect(home.getAttribute('href')).toBe('/');
  expect(screen.getByText('groam')).toBeTruthy();
  expect(screen.getByText('Sign in form')).toBeTruthy();
  expect(document.querySelector('[data-slot="aurora-background"]')).toBeTruthy();
});
