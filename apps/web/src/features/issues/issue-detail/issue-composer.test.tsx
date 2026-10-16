import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IssueComposer } from './issue-composer';

describe('IssueComposer', () => {
  test('reports typing', async () => {
    const onChange = vi.fn();
    await render(
      <IssueComposer content="" onChange={onChange} onComment={vi.fn()} pending={false} />
    );
    await page.getByRole('textbox', { name: 'Issue comment' }).fill('a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  test('comments with the current text', async () => {
    const onComment = vi.fn();
    await render(
      <IssueComposer
        content="Looks good"
        onChange={vi.fn()}
        onComment={onComment}
        pending={false}
      />
    );
    await expect
      .element(page.getByRole('textbox', { name: 'Issue comment' }))
      .toHaveValue('Looks good');
    await page.getByRole('button', { name: 'Comment' }).click();
    expect(onComment).toHaveBeenCalledTimes(1);
  });

  test.each<[string, string, boolean]>([
    ['empty text', '', false],
    ['whitespace only', '   ', false],
    ['pending', 'Hello', true]
  ])('disables Comment for %s', async (_, content, pending) => {
    await render(
      <IssueComposer content={content} onChange={vi.fn()} onComment={vi.fn()} pending={pending} />
    );
    await expect.element(page.getByRole('button', { name: 'Comment' })).toBeDisabled();
  });
});
