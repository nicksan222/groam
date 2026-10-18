import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ProposalFeedback } from './proposal-feedback';

type Props = Parameters<typeof ProposalFeedback>[0];

function comment(overrides: Record<string, unknown> = {}) {
  return {
    author: { name: 'Ada Lovelace' },
    changeKey: null,
    content: 'Top-level thought',
    createdAt: Date.now() - 60_000,
    id: 'c1',
    kind: 'comment',
    parentCommentId: null,
    resolvedAt: null,
    ...overrides
  };
}

function setup(overrides: Partial<Props> = {}) {
  const props = {
    addFeedback: vi.fn(async () => true),
    authorName: 'Grace Hopper',
    feedback: [] as unknown as Props['feedback'],
    pendingAction: null,
    resolveFeedback: vi.fn(async () => true),
    run: vi.fn(async (_label: string, action: () => Promise<boolean>) => action()),
    status: 'in_review' as Props['status'],
    ...overrides
  };
  return props;
}

describe('ProposalFeedback', () => {
  test('empty open idea shows the empty state and composer', async () => {
    await render(<ProposalFeedback {...setup()} />);
    await expect.element(page.getByText('No comments yet')).toBeVisible();
    await expect.element(page.getByLabelText('Leave a comment')).toBeVisible();
  });

  test('lists only top-level conversations, with replies nested', async () => {
    const feedback = [
      comment(),
      comment({ content: 'A reply', id: 'c2', parentCommentId: 'c1' }),
      comment({ changeKey: 'k', content: 'Per-change note', id: 'c3' })
    ] as unknown as Props['feedback'];
    await render(<ProposalFeedback {...setup({ feedback })} />);
    await expect.element(page.getByText('Top-level thought')).toBeVisible();
    await expect.element(page.getByText('A reply')).toBeVisible();
    await expect.element(page.getByText('Per-change note')).not.toBeInTheDocument();
    await expect.element(page.getByText('No comments yet')).not.toBeInTheDocument();
  });

  test.each(['closed', 'merged'] as const)('%s ideas hide the composer', async (status) => {
    await render(<ProposalFeedback {...setup({ status })} />);
    await expect.element(page.getByLabelText('Leave a comment')).not.toBeInTheDocument();
    await expect.element(page.getByText('Grace Hopper', { exact: true })).toBeVisible();
  });

  test.each([
    ['Comment', 'comment'],
    ['Request changes', 'change_request']
  ])('%s submits trimmed text and clears the box', async (button, kind) => {
    const props = setup();
    await render(<ProposalFeedback {...props} />);
    const box = page.getByLabelText('Leave a comment');
    await box.fill('  Needs more beach  ');
    await page.getByRole('button', { name: button }).click();
    await expect
      .poll(() => vi.mocked(props.addFeedback).mock.calls)
      .toEqual([['Needs more beach', undefined, undefined, kind]]);
    await expect.poll(() => box.element().textContent?.trim()).toBe('');
  });

  test('keeps the draft when the save fails', async () => {
    const props = setup({ addFeedback: vi.fn(async () => false) });
    await render(<ProposalFeedback {...props} />);
    const box = page.getByLabelText('Leave a comment');
    await box.fill('Keep me');
    await page.getByRole('button', { name: 'Comment' }).click();
    await expect.poll(() => vi.mocked(props.addFeedback).mock.calls.length).toBe(1);
    await expect.element(box).toHaveTextContent('Keep me');
  });

  test('pending action disables the composer buttons', async () => {
    await render(<ProposalFeedback {...setup({ pendingAction: 'approve' })} />);
    await page.getByLabelText('Leave a comment').fill('x');
    await expect.element(page.getByRole('button', { name: 'Comment' })).toBeDisabled();
  });
});
