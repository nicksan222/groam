import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ProposalFeedbackItem } from './proposal-types';
import { ReviewComment } from './review-comment';

function makeComment(overrides: Record<string, unknown> = {}) {
  return {
    author: { name: 'Ada Lovelace' },
    changeKey: null,
    content: 'Please move lunch earlier',
    createdAt: Date.now() - 3 * 60 * 60 * 1000,
    id: 'comment-1',
    kind: 'comment',
    parentCommentId: null,
    resolvedAt: null,
    ...overrides
  } as unknown as ProposalFeedbackItem;
}

function setup(
  comment: ProposalFeedbackItem,
  overrides: Partial<Parameters<typeof ReviewComment>[0]> = {}
) {
  const props = {
    comment,
    disabled: false,
    onReply: vi.fn(async () => true),
    onResolve: vi.fn(async () => true),
    replies: [] as ProposalFeedbackItem[],
    ...overrides
  };
  return props;
}

describe('ReviewComment', () => {
  test('shows the comment with its author and replies', async () => {
    const reply = makeComment({ author: { name: 'Grace' }, content: 'Done', id: 'reply-1' });
    await render(<ReviewComment {...setup(makeComment(), { replies: [reply] })} />);
    await expect.element(page.getByText('Please move lunch earlier')).toBeVisible();
    await expect.element(page.getByText('Ada Lovelace').first()).toBeVisible();
    await expect.element(page.getByText('Done')).toBeVisible();
    await expect.element(page.getByText('Grace', { exact: false })).toBeVisible();
  });

  test('marks agent authors as AI reviewers', async () => {
    await render(
      <ReviewComment {...setup(makeComment({ author: { kind: 'agent', name: 'Groam' } }))} />
    );
    await expect.element(page.getByText('AI reviewer')).toBeVisible();
  });

  test('plain comments have no resolve button', async () => {
    await render(<ReviewComment {...setup(makeComment())} />);
    await expect.element(page.getByRole('button', { name: 'Reply' })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: /Resolve request/ }))
      .not.toBeInTheDocument();
  });

  test('change requests show a badge and can be resolved', async () => {
    const props = setup(makeComment({ kind: 'change_request' }));
    await render(<ReviewComment {...props} />);
    await expect.element(page.getByText('Changes requested')).toBeVisible();
    await page.getByRole('button', { name: /Resolve request/ }).click();
    await expect.poll(() => vi.mocked(props.onResolve).mock.calls.length).toBe(1);
  });

  test('a resolved comment is collapsed until expanded', async () => {
    await render(
      <ReviewComment {...setup(makeComment({ kind: 'change_request', resolvedAt: Date.now() }))} />
    );
    await expect.element(page.getByText(/was resolved/)).toBeVisible();
    await expect.element(page.getByText('Please move lunch earlier')).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Show conversation' }).click();
    await expect.element(page.getByText('Please move lunch earlier')).toBeVisible();
    await expect.element(page.getByText('Resolved', { exact: true })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Reopen' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Reply' })).not.toBeInTheDocument();
  });

  test('replies are submitted trimmed and cancel closes the box', async () => {
    const props = setup(makeComment());
    await render(<ReviewComment {...props} />);
    await page.getByRole('button', { name: 'Reply' }).click();
    const box = page.getByLabelText('Reply to Ada Lovelace');
    await expect.element(page.getByRole('button', { name: 'Reply' }).last()).toBeDisabled();
    await box.fill('  On it  ');
    await page.getByRole('button', { name: 'Reply' }).last().click();
    await expect.poll(() => vi.mocked(props.onReply).mock.calls).toEqual([['On it']]);
    await expect.element(box).not.toBeInTheDocument();
  });

  test('cancel dismisses the reply box', async () => {
    await render(<ReviewComment {...setup(makeComment())} />);
    await page.getByRole('button', { name: 'Reply' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect.element(page.getByLabelText('Reply to Ada Lovelace')).not.toBeInTheDocument();
  });

  test('disabled blocks reply and resolve', async () => {
    await render(
      <ReviewComment {...setup(makeComment({ kind: 'change_request' }), { disabled: true })} />
    );
    await expect.element(page.getByRole('button', { name: 'Reply' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: /Resolve request/ })).toBeDisabled();
  });
});
