import { SidebarProvider } from '@groam/ui/components/sidebar';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SidebarNestedLoadMore } from './sidebar-nested-load-more';

test('invokes onLoadMore from the idle control', async () => {
  const onLoadMore = vi.fn();
  await render(
    <SidebarProvider>
      <ul>
        <SidebarNestedLoadMore onLoadMore={onLoadMore} />
      </ul>
    </SidebarProvider>
  );

  await page.getByText('Load more').click();
  expect(onLoadMore).toHaveBeenCalledTimes(1);
});

test('disables the control while more items are loading', async () => {
  const onLoadMore = vi.fn();
  await render(
    <SidebarProvider>
      <ul>
        <SidebarNestedLoadMore isLoadingMore onLoadMore={onLoadMore} />
      </ul>
    </SidebarProvider>
  );

  // Real clicks wait for an enabled target; force it to prove the disabled control ignores it.
  await page.getByText('Loading…').click({ force: true });
  expect(onLoadMore).not.toHaveBeenCalled();
});
