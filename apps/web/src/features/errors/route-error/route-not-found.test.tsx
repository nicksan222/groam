import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { RouteNotFound } from './route-not-found';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}));

test('explains the missing page and links home', async () => {
  await render(<RouteNotFound />);
  await expect.element(page.getByTestId(testIds.notFound)).toBeVisible();
  await expect.element(page.getByText('Page not found')).toBeVisible();
  await expect
    .element(page.getByText('The page may have moved or the link may be incorrect.'))
    .toBeVisible();
  await expect.element(page.getByTestId(testIds.notFoundHome)).toHaveAttribute('href', '/');
});
