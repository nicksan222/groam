import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ConversationTimeline } from './conversation-timeline';

afterEach(cleanup);

test('renders items and loads earlier messages', () => {
  const loadMore = vi.fn();
  render(
    <ConversationTimeline
      empty={<span>Empty</span>}
      isLoading={false}
      items={[{ content: <span>Hello</span>, key: 'one' }]}
      loadMore={loadMore}
      status="CanLoadMore"
    />
  );
  expect(screen.getByText('Hello')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Load earlier messages' }));
  expect(loadMore).toHaveBeenCalledWith(30);
});

test('renders loading instead of the empty state', () => {
  render(
    <ConversationTimeline
      empty={<span>Empty</span>}
      isLoading
      items={[]}
      loadMore={vi.fn()}
      status="LoadingFirstPage"
    />
  );
  expect(screen.getByRole('status', { name: 'Loading messages' })).toBeDefined();
  expect(screen.queryByText('Empty')).toBeNull();
});
