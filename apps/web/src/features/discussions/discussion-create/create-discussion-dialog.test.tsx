import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
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

afterEach(cleanup);

test('requires a title before creating a chat', async () => {
  render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);
  fireEvent.click(screen.getByRole('button', { name: /Ada Lovelace/u }));
  fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Give this chat a name.');
  expect(dialog.createDiscussion).not.toHaveBeenCalled();
});

test('requires at least one member', async () => {
  render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);
  fireEvent.change(screen.getByLabelText(/Title/u), { target: { value: 'Italy dates' } });
  fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Invite at least one group member.');
  expect(dialog.createDiscussion).not.toHaveBeenCalled();
});

test('creates a chat and reports the new id', async () => {
  const onCreated = vi.fn();
  render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={onCreated} open />);

  fireEvent.change(screen.getByLabelText(/Title/u), { target: { value: '  Italy dates  ' } });
  fireEvent.click(screen.getByRole('button', { name: /Ada Lovelace/u }));
  fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));

  await waitFor(() =>
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
  render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);

  fireEvent.change(screen.getByLabelText(/Title/u), { target: { value: 'Italy dates' } });
  fireEvent.click(screen.getByRole('button', { name: /Ada Lovelace/u }));
  fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));

  expect((await screen.findByRole('alert')).textContent).toBe('Unable to start this chat');
});

test('blocks creating a chat when the group has no members', () => {
  dialog.members = [];
  render(<CreateDiscussionDialog onClose={vi.fn()} onCreated={vi.fn()} open />);
  expect(screen.getByText('Invite someone to your group before starting a chat.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start chat' })).toHaveProperty('disabled', true);
});
