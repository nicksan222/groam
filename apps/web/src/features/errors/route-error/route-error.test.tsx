import { render } from '@groam/vitest-config/react';
import type { ErrorComponentProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { RouteError } from './route-error';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}));

describe('RouteError', () => {
  test.each([
    ['an Error', new Error('Trip failed to load'), 'Trip failed to load'],
    ['a non-Error value', 'boom', 'An unexpected error occurred.']
  ])('shows the message for %s', async (_, error, text) => {
    await render(
      <RouteError {...({} as ErrorComponentProps)} error={error as Error} reset={vi.fn()} />
    );
    await expect.element(page.getByText('Something went wrong')).toBeVisible();
    await expect.element(page.getByText(text)).toBeVisible();
  });

  test('retries via reset', async () => {
    const reset = vi.fn();
    await render(
      <RouteError {...({} as ErrorComponentProps)} error={new Error('x')} reset={reset} />
    );
    await page.getByTestId(testIds.workspaceErrorRetry).click();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  test('links home', async () => {
    await render(
      <RouteError {...({} as ErrorComponentProps)} error={new Error('x')} reset={vi.fn()} />
    );
    await expect.element(page.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });
});
