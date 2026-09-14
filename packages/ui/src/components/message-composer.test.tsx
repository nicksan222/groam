import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { MessageComposer, type MessageComposerApi } from './message-composer';

afterEach(cleanup);

test('submits and clears a composed message', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  render(<MessageComposer label="Add comment" onSubmit={onSubmit} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Add comment' }), {
    target: { value: '  Looks good  ' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith('Looks good');
    expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Add comment' }).value).toBe(
      ''
    );
  });
});

test('allows empty submit when attachments are pending', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  render(<MessageComposer allowEmptySubmit label="Message" onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(''));
});

test('exposes composer api slots for inserts and attach', async () => {
  const onAttachFiles = vi.fn();
  const captured: { api: MessageComposerApi | null } = { api: null };
  render(
    <MessageComposer
      label="Message"
      onAttachFiles={onAttachFiles}
      onSubmit={vi.fn().mockResolvedValue(true)}
      toolbarStart={(composer) => {
        captured.api = composer;
        return (
          <button onClick={() => composer.insertText('@groam ')} type="button">
            Ask Groam
          </button>
        );
      }}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Ask Groam' }));
  expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Message' }).value).toContain(
    '@groam'
  );
  expect(captured.api?.text).toContain('@groam');
  fireEvent.click(screen.getByRole('button', { name: 'Attach files' }));
});
