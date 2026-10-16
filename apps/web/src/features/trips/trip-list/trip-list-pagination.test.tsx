import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripListPagination } from './trip-list-pagination';

describe('TripListPagination', () => {
  test('requests the next page when the button is clicked', async () => {
    const loadMore = vi.fn();
    await render(<TripListPagination loadMore={loadMore} status="CanLoadMore" />);

    await page.getByRole('button', { name: 'Load more trips' }).click();

    expect(loadMore).toHaveBeenCalledWith(25);
  });

  test('disables the button and says so while more trips load', async () => {
    const loadMore = vi.fn();
    await render(<TripListPagination loadMore={loadMore} status="LoadingMore" />);

    const button = page.getByRole('button', { name: /Loading more trips…/u });
    await expect.element(button).toBeDisabled();
    expect(loadMore).not.toHaveBeenCalled();
  });

  test.each(['Exhausted', 'LoadingFirstPage'] as const)(
    'keeps the load button enabled for status %s',
    async (status) => {
      await render(<TripListPagination loadMore={vi.fn()} status={status} />);
      await expect.element(page.getByRole('button', { name: 'Load more trips' })).toBeEnabled();
    }
  );
});
