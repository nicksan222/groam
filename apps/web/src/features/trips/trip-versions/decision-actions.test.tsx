import { render } from '@groam/vitest-config/react';
import type { ComponentProps } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DecisionActions } from './decision-actions';

type Proposal = ComponentProps<typeof DecisionActions>['proposal'];

const emptyMessage = 'Add a change before you can send this to the group.';
const changedMessage =
  'Reviewers can compare, comment, and approve. The shared trip stays unchanged.';

function proposal(overrides: Partial<Proposal> & { changeCount?: number } = {}): Proposal {
  const { changeCount = 0, ...rest } = overrides;
  return {
    canApprove: false,
    canMerge: false,
    changes: Array.from({ length: changeCount }, (_, index) => ({ key: `change-${index}` })),
    hasApproved: false,
    reviewers: [],
    status: 'draft',
    ...rest
  } as unknown as Proposal;
}

function actions(subject: Proposal, props: Partial<ComponentProps<typeof DecisionActions>> = {}) {
  return (
    <DecisionActions
      approve={vi.fn()}
      conversationsReady
      merge={vi.fn()}
      pendingAction={null}
      proposal={subject}
      remainingApprovals={0}
      reviewReady
      run={vi.fn()}
      submit={vi.fn()}
      unresolvedFeedback={0}
      {...props}
    />
  );
}

const renderActions = (...args: Parameters<typeof actions>) => render(actions(...args));

const sendForReview = () => page.getByRole('button', { name: 'Send for review' });

describe('sending a draft idea for review', () => {
  test('an idea without changes cannot be sent and says why', async () => {
    await renderActions(proposal());
    await expect.element(sendForReview()).toBeDisabled();
    await expect.element(page.getByText(emptyMessage)).toBeVisible();
    await expect.element(page.getByText(changedMessage)).not.toBeInTheDocument();
  });

  test.each([1, 4])('an idea with %i change(s) can be sent', async (changeCount) => {
    await renderActions(proposal({ changeCount }));
    await expect.element(sendForReview()).toBeEnabled();
    await expect.element(page.getByText(changedMessage)).toBeVisible();
    await expect.element(page.getByText(emptyMessage)).not.toBeInTheDocument();
  });

  test('becomes sendable as soon as the idea gains a change', async () => {
    const view = await renderActions(proposal());
    await expect.element(sendForReview()).toBeDisabled();
    await view.rerender(actions(proposal({ changeCount: 1 })));
    await expect.element(sendForReview()).toBeEnabled();
  });

  test('runs the submit action when clicked', async () => {
    const run = vi.fn();
    const submit = vi.fn();
    await renderActions(proposal({ changeCount: 1 }), { run, submit });
    await sendForReview().click();
    expect(run).toHaveBeenCalledWith('submit', submit);
  });

  test('stays disabled while another action is running', async () => {
    await renderActions(proposal({ changeCount: 2 }), { pendingAction: 'approve' });
    await expect.element(sendForReview()).toBeDisabled();
  });

  test.each(['in_review', 'conflicted', 'merged', 'closed'] as const)(
    'offers no send button once the idea is %s',
    async (status) => {
      await renderActions(proposal({ changeCount: 1, status }));
      await expect.element(sendForReview()).not.toBeInTheDocument();
      await expect.element(page.getByText(emptyMessage)).not.toBeInTheDocument();
    }
  );
});
