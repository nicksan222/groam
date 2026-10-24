import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DecisionStatus } from './decision-status';
import type { ProposalDetail } from './proposal-types';

const proposal = (hasUserReviewer: boolean) =>
  ({
    reviewers: hasUserReviewer ? [{ kind: 'user' }] : []
  }) as unknown as ProposalDetail;

describe('DecisionStatus', () => {
  test.each([
    {
      checks: false,
      remaining: 0,
      self: false,
      status: 'draft',
      title: 'Review and send',
      unresolved: 0
    },
    { checks: true, remaining: 0, self: true, status: 'merged', title: 'Applied', unresolved: 0 },
    { checks: false, remaining: 0, self: false, status: 'closed', title: 'Closed', unresolved: 0 },
    {
      checks: true,
      remaining: 0,
      self: false,
      status: 'in_review',
      title: 'Ready to apply',
      unresolved: 0
    },
    {
      checks: true,
      remaining: 0,
      self: false,
      status: 'conflicted',
      title: 'Update from the shared trip first',
      unresolved: 0
    },
    {
      checks: false,
      remaining: 1,
      self: true,
      status: 'in_review',
      title: 'Approve to continue',
      unresolved: 0
    },
    {
      checks: false,
      remaining: 1,
      self: true,
      status: 'in_review',
      title: 'Almost ready',
      unresolved: 2
    },
    {
      checks: false,
      remaining: 1,
      self: false,
      status: 'in_review',
      title: 'Waiting on the group',
      unresolved: 2
    }
  ] as const)('$status (checks $checks, self $self) shows $title', async (row) => {
    await render(
      <DecisionStatus
        checksPassed={row.checks}
        proposal={proposal(!row.self)}
        remainingApprovals={row.remaining}
        status={row.status}
        unresolvedFeedback={row.unresolved}
      />
    );
    await expect.element(page.getByRole('heading', { name: row.title })).toBeVisible();
  });

  test('describes the outstanding blockers', async () => {
    await render(
      <DecisionStatus
        checksPassed={false}
        proposal={proposal(true)}
        remainingApprovals={2}
        status="in_review"
        unresolvedFeedback={1}
      />
    );
    await expect
      .element(
        page.getByText(
          '2 more approvals and 1 unresolved conversation before this idea can be applied.'
        )
      )
      .toBeVisible();
  });
});
