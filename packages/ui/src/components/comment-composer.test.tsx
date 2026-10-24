import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { CommentComposer } from './comment-composer';

async function type(name: string, text: string) {
  await page.getByRole('textbox', { name }).click();
  await userEvent.keyboard(text);
}

test('sends the trimmed comment and clears the draft', async () => {
  const onSubmit = vi.fn(() => Promise.resolve(true));
  await render(
    <CommentComposer
      label="Issue comment"
      onSubmit={onSubmit}
      placeholder="Leave a comment"
      submitLabel="Comment"
    />
  );
  const submit = page.getByRole('button', { name: 'Comment' });
  await expect.element(submit).toBeDisabled();
  await type('Issue comment', 'Looks good');
  await submit.click();
  expect(onSubmit).toHaveBeenCalledWith('Looks good');
  await expect.element(submit).toBeDisabled();
});

test('keeps the draft quietly when a reported send fails, and shows a thrown error', async () => {
  const onSubmit = vi
    .fn<(content: string) => Promise<unknown>>()
    .mockResolvedValueOnce(false)
    .mockRejectedValueOnce(new Error('Thread is closed'));
  await render(
    <CommentComposer
      label="Reply"
      onSubmit={onSubmit}
      placeholder="Write a reply…"
      submitLabel="Reply"
    />
  );
  await type('Reply', 'Can we leave earlier?');
  await page.getByRole('button', { name: 'Reply' }).click();
  await expect.element(page.getByText('Can we leave earlier?')).toBeInTheDocument();
  await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  await page.getByRole('button', { name: 'Reply' }).click();
  await expect.element(page.getByRole('alert')).toHaveTextContent('Thread is closed');
});

test('stays editable while sending and keeps only the text typed meanwhile', async () => {
  let finish: (value: boolean) => void = () => {};
  const onSubmit = vi.fn(() => new Promise<boolean>((resolve) => (finish = resolve)));
  await render(
    <CommentComposer
      label="Issue comment"
      onSubmit={onSubmit}
      placeholder="Leave a comment"
      submitLabel="Comment"
    />
  );
  await type('Issue comment', 'First');
  await page.getByRole('button', { name: 'Comment' }).click();
  await type('Issue comment', ' and more');
  finish(true);
  await expect.element(page.getByText('and more', { exact: true })).toBeInTheDocument();
  await expect.element(page.getByText('First and more')).not.toBeInTheDocument();
  expect(onSubmit).toHaveBeenCalledWith('First');
});

test('the shortcut can send the gentler alternative', async () => {
  const onSubmit = vi.fn(() => Promise.resolve(true));
  const comment = vi.fn(() => Promise.resolve(true));
  await render(
    <CommentComposer
      alternative={{ label: 'Comment', onSubmit: comment, shortcut: true }}
      label="Leave a comment"
      onSubmit={onSubmit}
      placeholder="Leave a comment"
      submitLabel="Request changes"
    />
  );
  await type('Leave a comment', 'Quick note');
  await userEvent.keyboard('{Control>}{Enter}{/Control}');
  await expect.poll(() => comment.mock.calls.length).toBe(1);
  expect(onSubmit).not.toHaveBeenCalled();
});

test('the alternative sends through its own handler', async () => {
  const onSubmit = vi.fn(() => Promise.resolve(true));
  const alternative = vi.fn(() => Promise.resolve(true));
  await render(
    <CommentComposer
      alternative={{ label: 'Comment', onSubmit: alternative }}
      label="Leave a comment"
      onSubmit={onSubmit}
      placeholder="Leave a comment"
      submitLabel="Request changes"
    />
  );
  await type('Leave a comment', 'Swap day 2');
  await page.getByRole('button', { name: 'Comment', exact: true }).click();
  expect(alternative).toHaveBeenCalledWith('Swap day 2');
  expect(onSubmit).not.toHaveBeenCalled();
});

test('a visible label and Cancel for inline replies', async () => {
  const onCancel = vi.fn();
  await render(
    <CommentComposer
      label="Comment on Day 2"
      onCancel={onCancel}
      onSubmit={vi.fn()}
      placeholder="Ask a question…"
      showLabel
      submitLabel="Add comment"
      surface="plain"
    />
  );
  await expect.element(page.getByText('Comment on Day 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(onCancel).toHaveBeenCalledOnce();
});
