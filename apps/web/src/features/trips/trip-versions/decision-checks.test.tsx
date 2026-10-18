import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DecisionChecks } from './decision-checks';
import type { ProposalDetail } from './proposal-types';

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    approvalCount: 0,
    requiredApprovals: 2,
    status: 'in_review',
    ...overrides
  } as unknown as ProposalDetail;
}

describe('DecisionChecks', () => {
  test.each(['draft', 'merged', 'closed'])('renders nothing for %s ideas', async (status) => {
    await render(
      <DecisionChecks
        conversationsReady
        proposal={proposal({ status })}
        remainingApprovals={0}
        reviewReady
        unresolvedFeedback={0}
      />
    );
    await expect.element(page.getByRole('list')).not.toBeInTheDocument();
  });

  test.each([
    {
      approvalCopy: '1 more approval required',
      convCopy: '1 unresolved conversation',
      ratio: '0/2',
      ready: false,
      remaining: 1,
      unresolved: 1
    },
    {
      approvalCopy: '2 more approvals required',
      convCopy: '3 unresolved conversations',
      ratio: '0/2',
      ready: false,
      remaining: 2,
      unresolved: 3
    },
    {
      approvalCopy: '2 required approvals received',
      convCopy: 'All review conversations resolved',
      ratio: '2/2',
      ready: true,
      remaining: 0,
      unresolved: 0
    }
  ])('$approvalCopy / $convCopy', async (row) => {
    await render(
      <DecisionChecks
        conversationsReady={row.unresolved === 0}
        proposal={proposal({ approvalCount: row.ready ? 2 : 0 })}
        remainingApprovals={row.remaining}
        reviewReady={row.ready}
        unresolvedFeedback={row.unresolved}
      />
    );
    await expect.element(page.getByText(row.approvalCopy)).toBeVisible();
    await expect.element(page.getByText(row.convCopy)).toBeVisible();
    await expect.element(page.getByText(row.ratio)).toBeVisible();
  });

  test('singular received approval', async () => {
    await render(
      <DecisionChecks
        conversationsReady
        proposal={proposal({ approvalCount: 1, requiredApprovals: 1 })}
        remainingApprovals={0}
        reviewReady
        unresolvedFeedback={0}
      />
    );
    await expect.element(page.getByText('1 required approval received')).toBeVisible();
  });
});
