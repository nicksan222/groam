import { render } from '@groam/vitest-config/react';
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
    await expect.element(page.getByText('Rome weekend · Ada: Pasta tonight?')).toBeVisible();
    await expect.element(page.getByText('No messages yet')).toBeVisible();
    await expect
      .element(page.getByTestId(testIds.chatRow).first())
      .toHaveAttribute('href', '/chat/discussion-1');
  });

  test.each([
    ['active', 'discussion-1', 'bg-accent'],
    ['inactive', 'other', 'hover:bg-accent']
  ])('styles an %s row', async (_, activeDiscussionId, className) => {
    await render(
      <ChatList
        activeDiscussionId={activeDiscussionId}
        discussions={[makeDiscussion()]}
        isLoading={false}
        onCreate={vi.fn()}
      />
    );
    await expect.element(page.getByTestId(testIds.chatRow)).toHaveClass(className);
  });
});
