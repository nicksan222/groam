import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ReviewerSummary } from './reviewer-summary';

type Props = Parameters<typeof ReviewerSummary>[0];

const ada = { kind: 'user', name: 'Ada Lovelace', userId: 'u-ada' };
const grace = { kind: 'user', name: 'Grace Hopper', userId: 'u-grace' };
const agent = { agentId: 'reviewer', kind: 'agent', name: 'Idea reviewer' };

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    approvals: [],
    availableReviewers: [ada, grace],
    canManageReviewers: true,
    groamReview: null,
    reviewers: [],
    status: 'in_review',
    ...overrides
  } as unknown as Props['proposal'];
}

function setup(proposal: Props['proposal'], overrides: Partial<Props> = {}) {
  const props = {
    pendingAction: null,
    proposal,
    requestAgentReview: vi.fn(async () => true),
    run: vi.fn(async (_label: string, action: () => Promise<boolean>) => action()),
    setReviewers: vi.fn(async () => true),
    ...overrides
  };
  return props;
}

describe('ReviewerSummary', () => {
  test('empty reviewers show the empty copy', async () => {
    await render(<ReviewerSummary {...setup(makeProposal())} />);
    await expect.element(page.getByRole('heading', { name: 'Reviewers' })).toBeVisible();
    await expect.element(page.getByText('Only the idea reviewer so far.')).toBeVisible();
  });

  test('lists pending, approved and AI reviewers', async () => {
    const proposal = makeProposal({
      approvals: [{ userId: 'u-ada' }],
      reviewers: [ada, grace, agent]
    });
    await render(<ReviewerSummary {...setup(proposal)} />);
    await expect.element(page.getByText('Approved', { exact: true })).toBeVisible();
    await expect.element(page.getByText('Pending', { exact: true })).toBeVisible();
    await expect.element(page.getByText('AI', { exact: true })).toBeVisible();
  });

  test('removes a human reviewer through run', async () => {
    const props = setup(makeProposal({ reviewers: [ada, grace] }));
    await render(<ReviewerSummary {...props} />);
    await page.getByRole('button', { name: 'Remove Ada Lovelace as reviewer' }).click();
    await expect.poll(() => vi.mocked(props.setReviewers).mock.calls).toEqual([[[grace]]]);
    expect(vi.mocked(props.run).mock.calls[0]?.[0]).toBe('reviewers');
  });

  test('cannot manage: no ask button or remove buttons', async () => {
    await render(
      <ReviewerSummary {...setup(makeProposal({ canManageReviewers: false, reviewers: [ada] }))} />
    );
    await expect
      .element(page.getByRole('button', { name: 'Ask people to review' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Remove Ada Lovelace as reviewer' }))
      .not.toBeInTheDocument();
  });

  test('adds and filters reviewers from the picker', async () => {
    const props = setup(makeProposal({ reviewers: [] }));
    await render(<ReviewerSummary {...props} />);
    await page.getByRole('button', { name: 'Ask people to review' }).click();
    await page.getByLabelText('Filter reviewers').fill('grace');
    await expect.element(page.getByText('Ada Lovelace')).not.toBeInTheDocument();
    await page.getByRole('button', { name: /Grace Hopper/ }).click();
    await expect.poll(() => vi.mocked(props.setReviewers).mock.calls).toEqual([[[grace]]]);
  });

  test('picker shows an empty result', async () => {
    await render(<ReviewerSummary {...setup(makeProposal())} />);
    await page.getByRole('button', { name: 'Ask people to review' }).click();
    await page.getByLabelText('Filter reviewers').fill('zzz');
    await expect.element(page.getByText('No reviewers found')).toBeVisible();
  });

  test.each([
    ['passed', 0, 'Idea reviewer found no blocking concerns'],
    ['changes_requested', 1, '1 change requested'],
    ['changes_requested', 3, '3 changes requested']
  ])('shows a %s idea review (%s comments)', async (status, commentCount, headline) => {
    const groamReview = { commentCount, completedAt: Date.now(), status, summary: 'Looks fine' };
    await render(<ReviewerSummary {...setup(makeProposal({ groamReview, reviewers: [agent] }))} />);
    await expect.element(page.getByText(headline)).toBeVisible();
    await expect.element(page.getByText('Looks fine')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Run idea review again' })).toBeVisible();
  });

  test('runs the idea review when requested', async () => {
    const props = setup(makeProposal({ reviewers: [agent] }));
    await render(<ReviewerSummary {...props} />);
    await page.getByRole('button', { name: 'Run idea review' }).click();
    await expect.poll(() => vi.mocked(props.requestAgentReview).mock.calls.length).toBe(1);
    expect(vi.mocked(props.run).mock.calls[0]?.[0]).toBe('agent-review');
  });

  test('draft ideas explain the reviewer runs on send', async () => {
    await render(
      <ReviewerSummary {...setup(makeProposal({ reviewers: [agent], status: 'draft' }))} />
    );
    await expect
      .element(
        page.getByText('The idea reviewer runs automatically when you send this to the group.')
      )
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Run idea review' }))
      .not.toBeInTheDocument();
  });

  test('pending action disables the run and ask buttons', async () => {
    await render(
      <ReviewerSummary
        {...setup(makeProposal({ reviewers: [agent] }), { pendingAction: 'approve' })}
      />
    );
    await expect.element(page.getByRole('button', { name: 'Run idea review' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Ask people to review' })).toBeDisabled();
  });
});
