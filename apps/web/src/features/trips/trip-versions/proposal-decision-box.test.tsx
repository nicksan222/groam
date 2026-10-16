import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ProposalDecisionBox } from './proposal-decision-box';
import type { ProposalDetail } from './proposal-types';

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    approvalCount: 0,
    approvals: [],
    canApprove: false,
    canClose: false,
    canMerge: false,
    changes: [{ key: 'c' }],
    hasApproved: false,
    requiredApprovals: 1,
    reviewers: [{ kind: 'user', name: 'Ada', userId: 'u1' }],
    status: 'in_review',
    ...overrides
  } as unknown as ProposalDetail;
}

function setup(proposal: ProposalDetail, unresolvedFeedback = 0) {
  const props = {
    approve: vi.fn(async () => true),
    close: vi.fn(async () => true),
    merge: vi.fn(async () => true),
    pendingAction: null,
    proposal,
    run: vi.fn(async (_label: string, action: () => Promise<boolean>) => action()),
    submit: vi.fn(async () => true),
    unresolvedFeedback
  };
  return props;
}

describe('ProposalDecisionBox', () => {
  test('waiting on approvals and conversations', async () => {
    await render(<ProposalDecisionBox {...setup(makeProposal(), 2)} />);
    await expect.element(page.getByText('What happens next')).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Waiting on the group' })).toBeVisible();
    await expect.element(page.getByText('1 more approval required')).toBeVisible();
    await expect.element(page.getByText('2 unresolved conversations')).toBeVisible();
  });

  test('ready to apply when checks pass and viewer can merge', async () => {
    const props = setup(makeProposal({ approvalCount: 1, canMerge: true }));
    await render(<ProposalDecisionBox {...props} />);
    await expect.element(page.getByRole('heading', { name: 'Ready to apply' })).toBeVisible();
    await expect.element(page.getByText('All review conversations resolved')).toBeVisible();
  });

  test('draft sends for review through run', async () => {
    const props = setup(makeProposal({ status: 'draft' }));
    await render(<ProposalDecisionBox {...props} />);
    await page.getByRole('button', { name: 'Send for review' }).click();
    await expect.poll(() => vi.mocked(props.submit).mock.calls.length).toBe(1);
    expect(props.run).toHaveBeenCalledWith('submit', props.submit);
  });

  test('approvers are listed and approve fires with the toggled value', async () => {
    const props = setup(
      makeProposal({ approvals: [{ name: 'Grace Hopper', userId: 'u2' }], canApprove: true })
    );
    await render(<ProposalDecisionBox {...props} />);
    await expect.element(page.getByText('Approved by')).toBeVisible();
    await expect.element(page.getByText('Grace Hopper', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: /approve/i }).click();
    await expect.poll(() => vi.mocked(props.approve).mock.calls).toEqual([[true]]);
  });

  test.each([
    [true, true],
    [false, false]
  ])('canClose=%s shows the pass-on control=%s', async (canClose, visible) => {
    await render(<ProposalDecisionBox {...setup(makeProposal({ canClose }))} />);
    const control = page.getByRole('button', { name: /pass on|close|delete/i });
    if (visible) await expect.element(control.first()).toBeVisible();
    else await expect.element(control).not.toBeInTheDocument();
  });
});
