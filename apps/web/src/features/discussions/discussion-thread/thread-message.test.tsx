import { stubPopoverEnvironment } from '@groam/ui/lib/stub-popover-environment';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { DiscussionMessage } from '@/features/discussions/hooks/use-discussion-thread';
import { ThreadMessage } from './thread-message';

vi.mock('@groam/ui/ai/chat/assistant-chat-message', () => ({
  AssistantChatMessage: ({ message }: { message: { text: string } }) => <div>{message.text}</div>
}));

vi.mock('@groam/ui/components/dropdown-menu', async () => {
  const { dropdownMenuTestMock } = await import('@/lib/test-mocks/dropdown-menu');
  return dropdownMenuTestMock;
});

function message(partial: Partial<DiscussionMessage> = {}): DiscussionMessage {
  return {
    _creationTime: 1,
    id: 'msg-1',
    key: 'k-1',
    order: 0,
    parts: [],
    role: 'user',
    status: 'success',
    stepOrder: 0,
    text: 'Hi!',
    ...partial
  } as DiscussionMessage;
}

beforeEach(() => {
  stubPopoverEnvironment();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('keeps reaction stamps and edit controls out of the always-visible row', () => {
  render(
    <ThreadMessage
      message={message({ mine: true })}
      onEdit={vi.fn()}
      onReact={vi.fn()}
      onRemove={vi.fn()}
      reactions={[]}
    />
  );

  expect(screen.getByText('Hi!')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Add reaction' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Message actions' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Agree' })).toBeNull();
  expect(screen.queryByText('👍')).toBeNull();
});

test('reacts from the stamp picker', () => {
  const onReact = vi.fn();
  render(<ThreadMessage message={message()} onReact={onReact} reactions={[]} />);

  fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }));
  fireEvent.click(screen.getByRole('button', { name: 'Agree' }));

  expect(onReact).toHaveBeenCalledWith('👍');
});

test('toggles an existing reaction chip on the bubble', () => {
  const onReact = vi.fn();
  render(
    <ThreadMessage
      message={message()}
      onReact={onReact}
      reactions={[{ emoji: '🎉', userId: 'user-b' }]}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: "Let's go" }));
  expect(onReact).toHaveBeenCalledWith('🎉');
});

test("does not offer edit or delete on someone else's message", () => {
  render(
    <ThreadMessage
      message={message({ author: { name: 'Ada', userId: 'user-a' }, mine: false })}
      onReact={vi.fn()}
      reactions={[]}
    />
  );

  expect(screen.queryByRole('button', { name: 'Message actions' })).toBeNull();
});

test('edits a message from the actions menu', async () => {
  const onEdit = vi.fn();
  render(
    <ThreadMessage
      message={message({ mine: true, text: 'Hi!' })}
      onEdit={onEdit}
      onReact={vi.fn()}
      onRemove={vi.fn()}
      reactions={[]}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Message actions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  fireEvent.change(screen.getByLabelText('Edit message'), { target: { value: 'See you in Rome' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(onEdit).toHaveBeenCalledWith('See you in Rome');
});

test('deletes a message after confirmation', async () => {
  const onRemove = vi.fn();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(
    <ThreadMessage
      message={message({ mine: true })}
      onEdit={vi.fn()}
      onReact={vi.fn()}
      onRemove={onRemove}
      reactions={[]}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Message actions' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

  await waitFor(() => expect(onRemove).toHaveBeenCalled());
});
