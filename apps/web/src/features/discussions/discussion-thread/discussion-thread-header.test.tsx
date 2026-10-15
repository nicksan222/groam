import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DiscussionDetailsSheet } from '@/features/discussions/discussion-sheets/discussion-details-sheet';
import { DiscussionParticipantsSheet } from '@/features/discussions/discussion-sheets/discussion-participants-sheet';
import { DiscussionRenameDialog } from '@/features/discussions/discussion-sheets/discussion-rename-dialog';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { DiscussionThreadHeader } from './discussion-thread-header';

const hooks = vi.hoisted(() => ({
  renameDiscussion: vi.fn().mockResolvedValue(true),
  viewerUserId: 'user-a' as string | undefined
}));

const toast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn()
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () =>
    hooks.viewerUserId ? { session: { user: { id: hooks.viewerUserId } } } : null
}));

vi.mock('@groam/ui/components/toast', () => ({
  toast
}));

vi.mock('@/features/discussions/hooks/use-discussions', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/discussions/hooks/use-discussions')
  >('@/features/discussions/hooks/use-discussions');
  return {
    ...actual,
    useRenameDiscussion: () => ({ renameDiscussion: hooks.renameDiscussion })
  };
});

const discussion = {
  createdBy: { name: 'Ada', userId: 'user-a' },
  id: 'discussion-1',
  lastMessage: null,
  members: [
    { image: null, name: 'Ada', userId: 'user-a' },
    { image: null, name: 'Grace', userId: 'user-g' }
  ],
  threadId: 'thread-1',
  title: 'Italy dates',
  tripId: 'trip-1',
  tripName: 'Rome weekend',
  unread: false,
  updatedAt: Date.UTC(2026, 7, 21, 14, 30)
} as DiscussionListItem;

beforeEach(() => {
  vi.clearAllMocks();
  hooks.renameDiscussion.mockResolvedValue(true);
  hooks.viewerUserId = 'user-a';
  vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
});

test('puts thread actions on the far right of the header', async () => {
  await useViewport(390, 844);
  await render(<DiscussionThreadHeader discussion={discussion} />);

  await expect.element(page.getByTestId('chat-heading')).toHaveTextContent('Italy dates');
  await expect.element(page.getByText('Ada, Grace')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Thread actions' })).toBeInTheDocument();
  await expect.element(page.getByRole('link', { name: 'Back to chats' })).toBeInTheDocument();
});

test('opens rename, details, participants, and copy link from the overflow menu', async () => {
  await render(<DiscussionThreadHeader discussion={discussion} />);

  await page.getByRole('button', { name: 'Thread actions' }).click();
  await expect.element(page.getByTestId('chat-action-rename')).toHaveTextContent('Rename');
  await expect.element(page.getByTestId('chat-action-details')).toHaveTextContent('View details');
  await expect
    .element(page.getByTestId('chat-action-participants'))
    .toHaveTextContent('Participants');
  await expect.element(page.getByTestId('chat-action-copy-link')).toHaveTextContent('Copy link');

  await page.getByTestId('chat-action-copy-link').click();
  await vi.waitFor(() =>
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/chat/discussion-1`
    )
  );
  await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith('Chat link copied'));

  await page.getByRole('button', { name: 'Thread actions' }).click();
  await page.getByTestId('chat-action-rename').click();
  await expect.element(page.getByRole('heading', { name: 'Rename chat' })).toBeInTheDocument();
});

test('opens details and participants from the menu', async () => {
  await render(<DiscussionThreadHeader discussion={discussion} />);

  await page.getByRole('button', { name: 'Thread actions' }).click();
  await page.getByTestId('chat-action-details').click();
  await expect.element(page.getByRole('heading', { name: 'Chat details' })).toBeInTheDocument();
});

test('renames the chat from the dialog', async () => {
  await render(<DiscussionRenameDialog discussion={discussion} onClose={vi.fn()} open />);

  await page.getByLabelText(/Name/u).fill('  Flights  ');
  await page.getByRole('button', { name: 'Save name' }).click();

  await vi.waitFor(() =>
    expect(hooks.renameDiscussion).toHaveBeenCalledWith('discussion-1', 'Flights')
  );
});

test('requires a name before renaming', async () => {
  await render(<DiscussionRenameDialog discussion={discussion} onClose={vi.fn()} open />);
  await page.getByLabelText(/Name/u).fill('   ');
  await page.getByRole('button', { name: 'Save name' }).click();

  await expect.element(page.getByRole('alert')).toHaveTextContent('Give this chat a name.');
  expect(hooks.renameDiscussion).not.toHaveBeenCalled();
});

test('shows chat metadata in the details sheet', async () => {
  await render(<DiscussionDetailsSheet discussion={discussion} onOpenChange={vi.fn()} open />);

  await expect.element(page.getByText('Chat details')).toBeInTheDocument();
  await expect.element(page.getByText('Ada')).toBeInTheDocument();
  await expect.element(page.getByText('2 people')).toBeInTheDocument();
  await expect.element(page.getByRole('link', { name: 'Rome weekend' })).toBeInTheDocument();
});

test('lists participants and marks the current viewer', async () => {
  await render(<DiscussionParticipantsSheet discussion={discussion} onOpenChange={vi.fn()} open />);

  await expect.element(page.getByText('Ada (you)')).toBeInTheDocument();
  await expect.element(page.getByText('Grace')).toBeInTheDocument();
  await expect.element(page.getByText('2 people in Italy dates.')).toBeInTheDocument();
});
