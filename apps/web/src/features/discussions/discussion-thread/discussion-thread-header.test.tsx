import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
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

vi.mock('@tanstack/react-router', () => ({
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

vi.mock('@groam/ui/components/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    ...props
  }: {
    children: ReactNode;
    onSelect?: () => void;
  }) => (
    <button onClick={onSelect} type="button" {...props}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>
}));

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
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) }
  });
});

afterEach(cleanup);

test('puts thread actions on the far right of the header', () => {
  render(<DiscussionThreadHeader discussion={discussion} />);

  expect(screen.getByTestId('chat-heading').textContent).toBe('Italy dates');
  expect(screen.getByText('Ada, Grace')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Thread actions' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Back to chats' })).toBeTruthy();
});

test('opens rename, details, participants, and copy link from the overflow menu', async () => {
  render(<DiscussionThreadHeader discussion={discussion} />);

  expect(screen.getByTestId('chat-action-rename').textContent).toContain('Rename');
  expect(screen.getByTestId('chat-action-details').textContent).toContain('View details');
  expect(screen.getByTestId('chat-action-participants').textContent).toContain('Participants');
  expect(screen.getByTestId('chat-action-copy-link').textContent).toContain('Copy link');

  fireEvent.click(screen.getByTestId('chat-action-copy-link'));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
    `${window.location.origin}/chat/discussion-1`
  );
  expect(toast.success).toHaveBeenCalledWith('Chat link copied');

  fireEvent.click(screen.getByTestId('chat-action-rename'));
  expect(screen.getByRole('heading', { name: 'Rename chat' })).toBeTruthy();
});

test('opens details and participants from the menu', () => {
  render(<DiscussionThreadHeader discussion={discussion} />);

  fireEvent.click(screen.getByTestId('chat-action-details'));
  expect(screen.getByRole('heading', { name: 'Chat details' })).toBeTruthy();
});

test('renames the chat from the dialog', async () => {
  render(<DiscussionRenameDialog discussion={discussion} onClose={vi.fn()} open />);

  fireEvent.change(screen.getByLabelText(/Name/u), { target: { value: '  Flights  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

  await waitFor(() =>
    expect(hooks.renameDiscussion).toHaveBeenCalledWith('discussion-1', 'Flights')
  );
});

test('requires a name before renaming', async () => {
  render(<DiscussionRenameDialog discussion={discussion} onClose={vi.fn()} open />);
  fireEvent.change(screen.getByLabelText(/Name/u), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save name' }));

  expect((await screen.findByRole('alert')).textContent).toBe('Give this chat a name.');
  expect(hooks.renameDiscussion).not.toHaveBeenCalled();
});

test('shows chat metadata in the details sheet', () => {
  render(<DiscussionDetailsSheet discussion={discussion} onOpenChange={vi.fn()} open />);

  expect(screen.getByText('Chat details')).toBeTruthy();
  expect(screen.getByText('Ada')).toBeTruthy();
  expect(screen.getByText('2 people')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Rome weekend' })).toBeTruthy();
});

test('lists participants and marks the current viewer', () => {
  render(<DiscussionParticipantsSheet discussion={discussion} onOpenChange={vi.fn()} open />);

  expect(screen.getByText('Ada (you)')).toBeTruthy();
  expect(screen.getByText('Grace')).toBeTruthy();
  expect(screen.getByText('2 people in Italy dates.')).toBeTruthy();
});
