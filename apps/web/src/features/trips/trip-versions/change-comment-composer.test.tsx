import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ChangeCommentComposer } from './change-comment-composer';

test('locks the composer during posting and only submits once', async () => {
  let complete: (saved: boolean) => void = () => {};
  const onComment = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        complete = resolve;
      })
  );
  const onCancel = vi.fn();
  await render(
    <ChangeCommentComposer label="Museum visit" onCancel={onCancel} onComment={onComment} />
  );
  await page.getByRole('textbox').fill('  Can we go earlier?  ');
  await page.getByRole('button', { name: 'Add comment' }).click();
  await expect.element(page.getByRole('textbox')).toBeDisabled();
  await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  page.getByRole('textbox').element().closest('form')?.requestSubmit();
  expect(onComment).toHaveBeenCalledTimes(1);
  expect(onComment).toHaveBeenCalledWith('Can we go earlier?');
  complete(true);
  await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
});

test('keeps the draft after an error and allows a successful retry', async () => {
  const onComment = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(true);
  const onCancel = vi.fn();
  await render(
    <ChangeCommentComposer label="Museum visit" onCancel={onCancel} onComment={onComment} />
  );
  await page.getByRole('textbox').fill('Keep the afternoon free.');
  await page.getByRole('button', { name: 'Add comment' }).click();
  await expect.element(page.getByRole('alert')).toBeInTheDocument();
  await expect.element(page.getByRole('textbox')).toHaveValue('Keep the afternoon free.');
  expect(onCancel).not.toHaveBeenCalled();
  await page.getByRole('button', { name: 'Add comment' }).click();
  await vi.waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
});
