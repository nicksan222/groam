import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { ChatAvatar } from './chat-avatar';

type Member = DiscussionListItem['members'][number];

function makeMember(name: string): Member {
  return { image: null, name, userId: `user-${name}` } as unknown as Member;
}

function makeDiscussion(members: Member[], title = 'Italy dates'): DiscussionListItem {
  return { id: 'discussion-1', members, title } as unknown as DiscussionListItem;
}

describe('ChatAvatar', () => {
  test('shows two stacked initials for a multi-person chat', async () => {
    const members = [makeMember('Ada Lovelace'), makeMember('Grace Hopper')];
    await render(<ChatAvatar discussion={makeDiscussion(members)} face={members[0]} size="list" />);
    await expect.element(page.getByText('AL')).toBeVisible();
    await expect.element(page.getByText('GH')).toBeVisible();
  });

  test('shows the single member initials for a one-person chat', async () => {
    const members = [makeMember('Ada Lovelace')];
    await render(
      <ChatAvatar discussion={makeDiscussion(members)} face={members[0]} size="header" />
    );
    await expect.element(page.getByText('AL')).toBeVisible();
  });

  test('falls back to the chat title without members', async () => {
    await render(
      <ChatAvatar discussion={makeDiscussion([], 'Italy dates')} face={undefined} size="list" />
    );
    await expect.element(page.getByText('ID')).toBeVisible();
  });

  test.each([
    ['list', 'size-12'],
    ['header', 'size-9']
  ] as const)('uses the %s frame size', async (size, className) => {
    const members = [makeMember('Ada Lovelace')];
    await render(<ChatAvatar discussion={makeDiscussion(members)} face={members[0]} size={size} />);
    await expect
      .element(
        page.getByText('AL').element().closest('[data-slot="stacked-avatar"]') as HTMLElement
      )
      .toHaveClass(className);
  });
});
