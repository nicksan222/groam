import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { PaginatedListContent } from './paginated-list-content';

type Status = Parameters<typeof PaginatedListContent>[0]['status'];

function mount(props: {
  isEmpty?: boolean;
  onLoadMore?: (n: number) => void;
  pageSize?: number;
  status: Status;
}) {
  return render(
    <PaginatedListContent
      empty={<p>Nothing here</p>}
      isEmpty={props.isEmpty ?? false}
      loadMoreLabel="Load more"
      onLoadMore={props.onLoadMore ?? vi.fn()}
      pageSize={props.pageSize}
      status={props.status}
    >
      <p>Row one</p>
    </PaginatedListContent>
  );
}

describe('PaginatedListContent', () => {
  test('shows only the empty state when empty', async () => {
    await mount({ isEmpty: true, status: 'CanLoadMore' });
    await expect.element(page.getByText('Nothing here')).toBeVisible();
    await expect.element(page.getByText('Row one')).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  test.each<Status>(['Exhausted', 'LoadingFirstPage'])(
    'hides load more when %s',
    async (status) => {
      await mount({ status });
      await expect.element(page.getByText('Row one')).toBeVisible();
      await expect.element(page.getByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    }
  );

  test.each([
    [undefined, 25],
    [10, 10]
  ])('load more with pageSize %s requests %s', async (pageSize, expected) => {
    const onLoadMore = vi.fn();
    await mount({ onLoadMore, pageSize, status: 'CanLoadMore' });
    await page.getByRole('button', { name: 'Load more' }).click();
    expect(onLoadMore).toHaveBeenCalledWith(expected);
  });

  test('disables load more while loading more', async () => {
    await mount({ status: 'LoadingMore' });
    await expect.element(page.getByRole('button', { name: /Load more/ })).toBeDisabled();
  });
});
