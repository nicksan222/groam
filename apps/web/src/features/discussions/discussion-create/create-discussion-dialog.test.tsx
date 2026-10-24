import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { CreateDiscussionDialog } from './create-discussion-dialog';

const dialog = vi.hoisted(() => ({
  createDiscussion: vi.fn(),
  members: [
    { image: null, name: 'Ada Lovelace', userId: 'user-a' },
    { image: null, name: 'Alan Turing', userId: 'user-b' }
  ],
  rosterLoading: false
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

test('keeps Start chat disabled until there is a title', async () => {
  await render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);
  await page.getByRole('button', { name: /Ada Lovelace/u }).click();
  await expect.element(page.getByRole('button', { name: 'Start chat' })).toBeDisabled();
  await page.getByLabelText(/Title/u).fill('   ');
  await expect.element(page.getByRole('button', { name: 'Start chat' })).toBeDisabled();
  await page.getByLabelText(/Title/u).fill('Italy dates');
  await expect.element(page.getByRole('button', { name: 'Start chat' })).toBeEnabled();
  expect(dialog.createDiscussion).not.toHaveBeenCalled();
});

test('keeps Start chat disabled until a member is selected', async () => {
  await render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);
  await page.getByLabelText(/Title/u).fill('Italy dates');
  await expect.element(page.getByRole('button', { name: 'Start chat' })).toBeDisabled();
  await page.getByRole('button', { name: /Ada Lovelace/u }).click();
  await expect.element(page.getByRole('button', { name: 'Start chat' })).toBeEnabled();
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

test('a chat from the chat page has no trip to pick', async () => {
  await render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);
  await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
  await expect.element(page.getByTestId(testIds.newChatTrip)).not.toBeInTheDocument();
  await page.getByLabelText(/Title/u).fill('Dinner');
  await page.getByRole('button', { name: /Ada Lovelace/u }).click();
  await page.getByRole('button', { name: 'Start chat' }).click();
  await vi.waitFor(() => expect(dialog.createDiscussion).toHaveBeenCalled());
  expect(dialog.createDiscussion.mock.calls[0]?.[0]).not.toHaveProperty('tripId');
});

test('from a trip the chat is locked to that trip, with no way to unlink it', async () => {
  await render(
    <CreateDiscussionDialog
      onClose={vi.fn()}
      onCreated={vi.fn()}
      open
      trip={{ id: 'trip-far' as never, name: 'Atlantic week' }}
    />
  );
  await expect.element(page.getByTestId(testIds.newChatTrip)).toHaveTextContent('In Atlantic week');
  await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
  await expect.element(page.getByText('No trip')).not.toBeInTheDocument();

  await page.getByLabelText(/Title/u).fill('Dinner');
  await page.getByRole('button', { name: /Ada Lovelace/u }).click();
  await page.getByRole('button', { name: 'Start chat' }).click();
  await vi.waitFor(() =>
    expect(dialog.createDiscussion).toHaveBeenCalledWith(
      expect.objectContaining({ tripId: 'trip-far' })
    )
  );
});
