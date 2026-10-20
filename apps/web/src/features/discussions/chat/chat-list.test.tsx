import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { testIds } from '@/lib/test-ids';
import { ChatList } from './chat-list';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({
    children,
    params,
    to,
    ...props
  }: {
    children?: ReactNode;
    params?: Record<string, string>;
    to: string;
  }) => (
    <a href={to.replace('$discussionId', params?.discussionId ?? '')} {...props}>
      {children}
    </a>
  )
}));

function makeDiscussion(overrides: Partial<DiscussionListItem> = {}): DiscussionListItem {
  return {
    createdBy: { name: 'Ada', userId: 'user-a' },
    id: 'discussion-1',
    lastMessage: { authorName: 'Ada', text: 'Pasta tonight?' },
    members: [{ image: null, name: 'Ada Lovelace', userId: 'user-a' }],
    title: 'Italy dates',
    tripName: null,
    unread: false,
    updatedAt: Date.UTC(2020, 0, 1),
    ...overrides
  } as unknown as DiscussionListItem;
}

describe('ChatList', () => {
  test('shows a labeled loading state', async () => {
    await render(<ChatList discussions={[]} isLoading onCreate={vi.fn()} />);
    await expect.element(page.getByRole('status', { name: 'Loading chats…' })).toBeVisible();
  });

  test('shows the empty state and creates a chat', async () => {
    const onCreate = vi.fn();
    await render(<ChatList discussions={[]} isLoading={false} onCreate={onCreate} />);
    await expect.element(page.getByText('No chats yet')).toBeVisible();
    await page.getByTestId(testIds.newChat).click();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  test('renders a linked row per chat with preview and trip name', async () => {
    await render(
      <ChatList
        discussions={[
          makeDiscussion({ tripName: 'Rome weekend' }),
          makeDiscussion({
            id: 'discussion-2' as DiscussionListItem['id'],
            lastMessage: null,
            title: 'Packing'
          })
        ]}
        isLoading={false}
        onCreate={vi.fn()}
      />
    );
    await expect.poll(() => page.getByTestId(testIds.chatRow).elements().length).toBe(2);
    const rows = page.getByRole('article').elements();
    expect(rows[0]?.getBoundingClientRect().height).toBe(rows[1]?.getBoundingClientRect().height);
    expect(rows[0]?.querySelector('time')?.getAttribute('datetime')).toBe(
      '2020-01-01T00:00:00.000Z'
    );
    await expect.element(page.getByText('Rome weekend', { exact: true })).toBeVisible();
    await expect.element(page.getByText('Ada: Pasta tonight?', { exact: true })).toBeVisible();
    await expect.element(page.getByText('No messages yet')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Italy dates' }))
      .toHaveAttribute('href', '/chat/discussion-1');
  });

  test.each([
    ['active', 'discussion-1', 'page'],
    ['inactive', 'other', null]
  ])('identifies an %s row accessibly', async (_, activeDiscussionId, current) => {
    await render(
      <ChatList
        activeDiscussionId={activeDiscussionId}
        discussions={[makeDiscussion({ unread: true })]}
        isLoading={false}
        onCreate={vi.fn()}
      />
    );
    await expect.element(page.getByRole('list', { name: 'Chats' })).toBeVisible();
    await expect.element(page.getByText('Unread', { exact: true })).toBeVisible();
    if (current) {
      await expect
        .element(page.getByRole('link', { name: 'Italy dates' }))
        .toHaveAttribute('aria-current', current);
    } else {
      await expect
        .element(page.getByRole('link', { name: 'Italy dates' }))
        .not.toHaveAttribute('aria-current');
    }
  });
});

test('gives phone message previews their own full-width line', async () => {
  await useViewport(390, 844);
  await render(
    <ChatList
      discussions={[
        makeDiscussion({ unread: true, tripName: 'Rome weekend' }),
        makeDiscussion({ id: 'discussion-2' as DiscussionListItem['id'], lastMessage: null })
      ]}
      isLoading={false}
      onCreate={vi.fn()}
    />
  );
  const rows = page.getByTestId(testIds.chatRow).elements();
  const preview = rows[0]?.querySelector('[data-slot="record-list-description"]');
  expect(preview?.getBoundingClientRect().width).toBeGreaterThan(280);
  const footer = rows[0]?.querySelector('[data-slot="record-list-badges"]');
  expect(preview?.getBoundingClientRect().bottom).toBeLessThanOrEqual(
    footer!.getBoundingClientRect().top
  );
  expect(rows[0]?.getBoundingClientRect().height).toBe(rows[1]?.getBoundingClientRect().height);
  await expect.element(page.getByText('Ada: Pasta tonight?', { exact: true })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    document.documentElement.clientWidth
  );
});
