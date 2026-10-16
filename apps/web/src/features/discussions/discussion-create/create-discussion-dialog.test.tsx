import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { CreateDiscussionDialog } from './create-discussion-dialog';

const dialog = vi.hoisted(() => ({
  createDiscussion: vi.fn(),
  members: [
    { image: null, name: 'Ada Lovelace', userId: 'user-a' },
    { image: null, name: 'Alan Turing', userId: 'user-b' }
  ],
  rosterLoading: false
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: () => ({ trips: [] })
}));

vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useCreateDiscussion: () => ({ createDiscussion: dialog.createDiscussion }),
  useDiscussionRoster: () => ({
    isLoading: dialog.rosterLoading,
    members: dialog.members
  })
}));

beforeEach(() => {
  vi.clearAllMocks();
  dialog.createDiscussion.mockResolvedValue('discussion-1');
  dialog.members = [
    { image: null, name: 'Ada Lovelace', userId: 'user-a' },
    { image: null, name: 'Alan Turing', userId: 'user-b' }
  ];
  dialog.rosterLoading = false;
});

test('requires a title before creating a chat', async () => {
  await render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);
  await page.getByRole('button', { name: /Ada Lovelace/u }).click();
  await page.getByRole('button', { name: 'Start chat' }).click();
  await expect.element(page.getByRole('alert')).toHaveTextContent('Give this chat a name.');
  expect(dialog.createDiscussion).not.toHaveBeenCalled();
});

test('requires at least one member', async () => {
  await render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);
  await page.getByLabelText(/Title/u).fill('Italy dates');
  await page.getByRole('button', { name: 'Start chat' }).click();
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent('Invite at least one group member.');
  expect(dialog.createDiscussion).not.toHaveBeenCalled();
});

test('creates a chat and reports the new id', async () => {
  const onCreated = vi.fn();
  await render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={onCreated} open />);

  await page.getByLabelText(/Title/u).fill('  Italy dates  ');
  await page.getByRole('button', { name: /Ada Lovelace/u }).click();
  await page.getByRole('button', { name: 'Start chat' }).click();

  await vi.waitFor(() =>
    expect(dialog.createDiscussion).toHaveBeenCalledWith({
      clientRequestId: expect.any(String),
      memberUserIds: ['user-a'],
      title: 'Italy dates'
    })
  );
  expect(onCreated).toHaveBeenCalledWith('discussion-1');
});

test('surfaces create failures in the dialog', async () => {
  dialog.createDiscussion.mockResolvedValue(null);
  await render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);

  await page.getByLabelText(/Title/u).fill('Italy dates');
  await page.getByRole('button', { name: /Ada Lovelace/u }).click();
  await page.getByRole('button', { name: 'Start chat' }).click();

  await expect.element(page.getByRole('alert')).toHaveTextContent('Unable to start this chat');
});

test('blocks creating a chat when the group has no members', async () => {
  dialog.members = [];
  await render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);
  await expect
    .element(page.getByText('Invite someone to your group before starting a chat.'))
    .toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Start chat' })).toBeDisabled();
});
