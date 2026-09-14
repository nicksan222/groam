import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ChangeCommentComposer } from './change-comment-composer';

afterEach(cleanup);

test('locks the composer during posting and only submits once', async () => {
  let complete: (saved: boolean) => void = () => {};
  const onComment = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        complete = resolve;
      })
  );
  const onCancel = vi.fn();
  render(<ChangeCommentComposer label="Museum visit" onCancel={onCancel} onComment={onComment} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Can we go earlier?  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));
  expect(screen.getByRole('textbox')).toHaveProperty('disabled', true);
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true);
  fireEvent.submit(screen.getByRole('textbox').closest('form')!);
  expect(onComment).toHaveBeenCalledTimes(1);
  expect(onComment).toHaveBeenCalledWith('Can we go earlier?');
  complete(true);
  await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
});

test('keeps the draft after an error and allows a successful retry', async () => {
  const onComment = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(true);
  const onCancel = vi.fn();
  render(<ChangeCommentComposer label="Museum visit" onCancel={onCancel} onComment={onComment} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Keep the afternoon free.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('textbox')).toHaveProperty('value', 'Keep the afternoon free.');
  expect(onCancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Add comment' }));
  await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
});
