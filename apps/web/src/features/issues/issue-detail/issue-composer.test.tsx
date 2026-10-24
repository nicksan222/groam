import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { IssueComposer } from './issue-composer';

describe('IssueComposer', () => {
  test('comments with the typed text and clears it', async () => {
    const onComment = vi.fn().mockResolvedValue(true);
    await render(<IssueComposer onComment={onComment} />);
    const box = page.getByRole('textbox', { name: 'Issue comment' });
    await box.click();
    await userEvent.keyboard('Looks good');
    await page.getByRole('button', { name: 'Comment' }).click();
    expect(onComment).toHaveBeenCalledWith('Looks good');
    await expect.element(page.getByRole('button', { name: 'Comment' })).toBeDisabled();
  });

  test('disables Comment until there is text', async () => {
    await render(<IssueComposer onComment={vi.fn()} />);
    await expect.element(page.getByRole('button', { name: 'Comment' })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Issue comment' }).click();
    await userEvent.keyboard('   ');
    await expect.element(page.getByRole('button', { name: 'Comment' })).toBeDisabled();
  });

  test('keeps the text, with no alert, when the comment fails', async () => {
    await render(<IssueComposer onComment={vi.fn().mockResolvedValue(false)} />);
    await page.getByRole('textbox', { name: 'Issue comment' }).click();
    await userEvent.keyboard('Retry me');
    await page.getByRole('button', { name: 'Comment' }).click();
    await expect.element(page.getByText('Retry me')).toBeInTheDocument();
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  test('shows the message under the editor when the comment throws', async () => {
    await render(<IssueComposer onComment={vi.fn().mockRejectedValue(new Error('offline'))} />);
    await page.getByRole('textbox', { name: 'Issue comment' }).click();
    await userEvent.keyboard('Retry me');
    await page.getByRole('button', { name: 'Comment' }).click();
    await expect.element(page.getByRole('alert')).toBeInTheDocument();
    await expect.element(page.getByText('Retry me')).toBeInTheDocument();
  });
});
