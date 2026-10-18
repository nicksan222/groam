import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { testIds } from '@/lib/test-ids';
import { DiscussionParticipantsSheet } from './discussion-participants-sheet';

const workspace = vi.hoisted(() => ({ viewerUserId: 'user-a' as string | undefined }));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () =>
    workspace.viewerUserId ? { session: { user: { id: workspace.viewerUserId } } } : null
}));

function makeDiscussion(names: string[]): DiscussionListItem {
  return {
    id: 'discussion-1',
    members: names.map((name, index) => ({
      image: null,
      name,
      userId: index === 0 ? 'user-a' : `user-${index}`
    })),
    title: 'Italy dates'
  } as unknown as DiscussionListItem;
}

beforeEach(() => {
  workspace.viewerUserId = 'user-a';
});

describe('DiscussionParticipantsSheet', () => {
  test('lists members and marks the viewer', async () => {
    await render(
      <DiscussionParticipantsSheet
        discussion={makeDiscussion(['Ada Lovelace', 'Grace Hopper'])}
        onOpenChange={vi.fn()}
        open
      />
    );
    await expect.element(page.getByText('2 people in Italy dates.')).toBeVisible();
    await expect.element(page.getByText('Ada Lovelace (you)')).toBeVisible();
    await expect.element(page.getByText('Grace Hopper', { exact: true })).toBeVisible();
  });

  test('uses the singular count for one person', async () => {
    await render(
      <DiscussionParticipantsSheet
        discussion={makeDiscussion(['Ada Lovelace'])}
        onOpenChange={vi.fn()}
        open
      />
    );
    await expect.element(page.getByText('1 person in Italy dates.')).toBeVisible();
  });

  test('does not mark anyone without a workspace session', async () => {
    workspace.viewerUserId = undefined;
    await render(
      <DiscussionParticipantsSheet
        discussion={makeDiscussion(['Ada Lovelace'])}
        onOpenChange={vi.fn()}
        open
      />
    );
    await expect.element(page.getByText('Ada Lovelace', { exact: true })).toBeVisible();
    await expect.element(page.getByText('(you)')).not.toBeInTheDocument();
  });

  test('renders nothing while closed', async () => {
    await render(
      <DiscussionParticipantsSheet
        discussion={makeDiscussion(['Ada Lovelace'])}
        onOpenChange={vi.fn()}
        open={false}
      />
    );
    await expect.element(page.getByTestId(testIds.chatParticipants)).not.toBeInTheDocument();
  });

  test('asks to close from the dialog close control', async () => {
    const onOpenChange = vi.fn();
    await render(
      <DiscussionParticipantsSheet
        discussion={makeDiscussion(['Ada Lovelace'])}
        onOpenChange={onOpenChange}
        open
      />
    );
    await page.getByRole('button', { name: 'Close' }).click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
