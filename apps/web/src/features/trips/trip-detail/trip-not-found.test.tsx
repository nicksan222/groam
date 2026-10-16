import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { TripNotFound } from './trip-not-found';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children, to, ...rest }: { children?: unknown; to: string }) => (
    <a href={to} {...rest}>
      {children as never}
    </a>
  )
}));

test('explains the missing trip and links back to trips', async () => {
  await render(<TripNotFound />);
  await expect.element(page.getByText('Trip not found')).toBeVisible();
  await expect
    .element(page.getByText('This trip may have been removed, or you might not have access.'))
    .toBeVisible();
  const link = page.getByTestId(testIds.notFoundHome);
  await expect.element(link).toHaveTextContent('Back to trips');
  await expect.element(link).toHaveAttribute('href', '/trips');
});
