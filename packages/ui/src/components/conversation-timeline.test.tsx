import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ConversationTimeline } from './conversation-timeline';

test('renders items and loads earlier messages', async () => {
  const loadMore = vi.fn();
  await render(
    <ConversationTimeline
      empty={<span>Empty</span>}
      isLoading={false}
      items={[{ content: <span>Hello</span>, key: 'one' }]}
      loadMore={loadMore}
      status="CanLoadMore"
    />
  );
  await expect.element(page.getByText('Hello')).toBeInTheDocument();
  await page.getByRole('button', { name: 'Load earlier messages' }).click();
  expect(loadMore).toHaveBeenCalledWith(30);
});

test('renders loading instead of the empty state', async () => {
  await render(
    <ConversationTimeline
      empty={<span>Empty</span>}
      isLoading
      items={[]}
      loadMore={vi.fn()}
      status="LoadingFirstPage"
    />
  );
  await expect.element(page.getByRole('status', { name: 'Loading messages' })).toBeInTheDocument();
  await expect.element(page.getByText('Empty')).not.toBeInTheDocument();
});
