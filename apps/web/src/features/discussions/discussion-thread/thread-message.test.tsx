import { render } from '@groam/vitest-config/react';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { DiscussionMessage } from '@/features/discussions/hooks/use-discussion-thread';
import { testIds } from '@/lib/test-ids';
import { ThreadMessage } from './thread-message';

vi.mock('./assistant-run-card', () => ({
  AssistantRunCard: ({
    prompt,
    replies
  }: {
    prompt?: { text: string };
    replies: Array<{ key: string; text: string }>;
  }) => (
    <div>
      {prompt ? <p>{prompt.text}</p> : null}
      {replies.map((reply) => (
        <p key={reply.key}>{reply.text}</p>
      ))}
    </div>
  )
}));

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

afterEach(() => {
  vi.restoreAllMocks();
});

test('keeps reaction stamps and edit controls out of the always-visible row', async () => {
  await render(
    <ThreadMessage
      message={message({ mine: true })}
      onEdit={vi.fn()}
      onReact={vi.fn()}
      onRemove={vi.fn()}
      reactions={[]}
    />
  );

  await expect.element(page.getByText('Hi!')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Add reaction' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Message actions' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Agree' })).not.toBeInTheDocument();
  await expect.element(page.getByText('👍')).not.toBeInTheDocument();
});

test('reacts from the stamp picker', async () => {
  const onReact = vi.fn();
  await render(<ThreadMessage message={message()} onReact={onReact} reactions={[]} />);

  await page.getByText('Hi!').hover();
  await page.getByRole('button', { name: 'Add reaction' }).click();
  await page.getByRole('button', { name: 'Agree' }).click();

  expect(onReact).toHaveBeenCalledWith('👍');
});

test.each([true, false])(
  'reacts after hovering a full-width message row (mine: %s)',
  async (mine) => {
    const onReact = vi.fn();
    await render(<ThreadMessage message={message({ mine })} onReact={onReact} reactions={[]} />);

    await page.getByTestId(testIds.chatMessage).hover();
    await page.getByRole('button', { name: 'Add reaction' }).click();
    await page.getByRole('button', { name: 'Agree' }).click();

    expect(onReact).toHaveBeenCalledWith('👍');
  }
);

test('toggles an existing reaction chip on the bubble', async () => {
  const onReact = vi.fn();
  await render(
    <ThreadMessage
      message={message()}
      onReact={onReact}
      reactions={[{ emoji: '🎉', userId: 'user-b' }]}
    />
  );

  await page.getByRole('button', { name: "Let's go" }).click();
  expect(onReact).toHaveBeenCalledWith('🎉');
});

test("does not offer edit or delete on someone else's message", async () => {
  await render(
    <ThreadMessage
      message={message({ author: { name: 'Ada', userId: 'user-a' }, mine: false })}
      onReact={vi.fn()}
      reactions={[]}
    />
  );

  await expect
    .element(page.getByRole('button', { name: 'Message actions' }))
    .not.toBeInTheDocument();
});

test('edits a message from the actions menu', async () => {
  const onEdit = vi.fn();
  await render(
    <ThreadMessage
      message={message({ mine: true, text: 'Hi!' })}
      onEdit={onEdit}
      onReact={vi.fn()}
      onRemove={vi.fn()}
      reactions={[]}
    />
  );

  await page.getByText('Hi!').hover();
  await page.getByRole('button', { name: 'Message actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const editor = page.getByRole('textbox', { name: 'Edit message' });
  await expect.element(editor).toHaveTextContent('Hi!');
  await expect.element(editor).toHaveFocus();
  await editor.fill('See you in Rome');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect.poll(() => onEdit).toHaveBeenCalledWith('See you in Rome');
});

test('keeps Save disabled for an empty edit', async () => {
  await render(
    <ThreadMessage
      message={message({ mine: true, text: 'Hi!' })}
      onEdit={vi.fn()}
      onReact={vi.fn()}
      reactions={[]}
    />
  );

  await page.getByText('Hi!').hover();
  await page.getByRole('button', { name: 'Message actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const save = page.getByRole('button', { name: 'Save' });
  await expect.element(save).toBeEnabled();
  await page.getByRole('textbox', { name: 'Edit message' }).fill('   ');
  await expect.element(save).toBeDisabled();
});

test('saves an edit with Enter and cancels with Escape', async () => {
  const onEdit = vi.fn();
  await render(
    <ThreadMessage
      message={message({ mine: true, text: 'Hi!' })}
      onEdit={onEdit}
      onReact={vi.fn()}
      onRemove={vi.fn()}
      reactions={[]}
    />
  );

  const openEditor = async () => {
    await page.getByText('Hi!').hover();
    await page.getByRole('button', { name: 'Message actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect.element(page.getByRole('textbox', { name: 'Edit message' })).toHaveFocus();
  };

  await openEditor();
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('textbox', { name: 'Edit message' })).not.toBeInTheDocument();
  expect(onEdit).not.toHaveBeenCalled();

  await openEditor();
  await userEvent.keyboard(' there{Enter}');
  await expect.poll(() => onEdit).toHaveBeenCalledWith('Hi! there');
});

test('deletes a message after confirmation', async () => {
  const onRemove = vi.fn();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  await render(
    <ThreadMessage
      message={message({ mine: true })}
      onEdit={vi.fn()}
      onReact={vi.fn()}
      onRemove={onRemove}
      reactions={[]}
    />
  );

  await page.getByText('Hi!').hover();
  await page.getByRole('button', { name: 'Message actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();

  await vi.waitFor(() => expect(onRemove).toHaveBeenCalled());
});

test('shows why Groam could not reply under the failed request', async () => {
  await render(
    <ThreadMessage
      message={message({
        assistantError: 'Too many requests',
        assistantStatus: 'failed',
        mine: true
      })}
      onReact={vi.fn()}
      reactions={[]}
    />
  );
  await expect.element(page.getByText('Hi!')).toBeInTheDocument();
  await expect
    .element(page.getByRole('status').filter({ hasText: "Groam couldn't reply" }))
    .toHaveTextContent("Groam couldn't reply: Too many requests");
});

test('shows no failure notice for a completed request', async () => {
  await render(
    <ThreadMessage
      message={message({ assistantStatus: 'complete', mine: true })}
      onReact={vi.fn()}
      reactions={[]}
    />
  );
  await expect
    .element(page.getByRole('status').filter({ hasText: "Groam couldn't reply" }))
    .not.toBeInTheDocument();
});

test('attaches the Groam runs it asked for beneath the message', async () => {
  await render(
    <ThreadMessage
      message={message({ mine: true })}
      onReact={vi.fn()}
      reactions={[]}
      replies={[{ ...message({}), key: 'a1', role: 'assistant', text: 'Groam answer' }]}
    />
  );
  const prompt = page.getByText('Hi!').element();
  const reply = page.getByText('Groam answer').element();
  expect(prompt.compareDocumentPosition(reply) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
