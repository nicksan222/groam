import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ChatTimeline } from './chat-timeline';

test('renders items in a labelled log and loads earlier messages', async () => {
  const loadMore = vi.fn();
  await render(
    <div style={{ height: 400, display: 'flex' }}>
      <ChatTimeline
        empty={<span>Empty</span>}
        isLoading={false}
        items={[{ content: <span>Hello</span>, key: 'one' }]}
        label="Trip chat"
        loadMore={loadMore}
        status="CanLoadMore"
      />
    </div>
  );
  await expect.element(page.getByRole('log', { name: 'Trip chat' })).toBeInTheDocument();
  await expect.element(page.getByText('Hello')).toBeInTheDocument();
  await page.getByRole('button', { name: 'Load earlier messages' }).click();
  expect(loadMore).toHaveBeenCalledWith(30);
});

test('renders loading instead of the empty state', async () => {
  await render(
    <ChatTimeline
      empty={<span>Empty</span>}
      isLoading
      items={[]}
      loadMore={vi.fn()}
      status="LoadingFirstPage"
    />
  );
  await expect.element(page.getByText('Loading messages')).toBeInTheDocument();
  await expect.element(page.getByText('Empty')).not.toBeInTheDocument();
});

test('shows the empty state and pending content', async () => {
  await render(
    <ChatTimeline
      empty={<span>Empty</span>}
      isLoading={false}
      items={[]}
      loadMore={vi.fn()}
      pending={<span>Thinking</span>}
      status="Exhausted"
    />
  );
  await expect.element(page.getByText('Thinking')).toBeInTheDocument();
  await expect.element(page.getByText('Empty')).not.toBeInTheDocument();
});

test('opens each calendar day with a date pill', async () => {
  const today = Date.now();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const { container } = await render(
    <ChatTimeline
      empty={<span>Empty</span>}
      isLoading={false}
      items={[
        { content: <span>Old</span>, createdAt: yesterday, key: 'one' },
        { content: <span>Older reply</span>, createdAt: yesterday + 1, key: 'two' },
        { content: <span>Event</span>, key: 'event' },
        { content: <span>New</span>, createdAt: today, key: 'three' }
      ]}
      loadMore={vi.fn()}
      status="Exhausted"
    />
  );
  const pills = [...container.querySelectorAll('[data-slot="chat-date-pill"]')];
  expect(pills.map((pill) => pill.textContent)).toEqual(['Yesterday', 'Today']);
  await expect.element(page.getByText('Today')).toBeInTheDocument();
});
