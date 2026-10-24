import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { needsSharedTripUpdate } from '@/features/ideas/hooks/idea-needs-update';
import type { ProposalDetail } from '@/types/trips';
import { IdeaCloneUpdateBanner } from './idea-clone-update-banner';

vi.mock('@/features/ideas/idea-update/idea-update-flow', () => ({
  IdeaUpdateFlow: () => <div data-testid="idea-update-flow" />
}));

function proposal(overrides: Partial<ProposalDetail> = {}): ProposalDetail {
  return {
    canRebase: true,
    conflicts: [],
    sourceChanged: false,
    status: 'draft',
    ...overrides
  } as ProposalDetail;
}

describe('needsSharedTripUpdate', () => {
  test('is true when the shared trip moved ahead or the idea is conflicted', async () => {
    expect(needsSharedTripUpdate(proposal({ sourceChanged: true }))).toBe(true);
    expect(needsSharedTripUpdate(proposal({ status: 'conflicted' }))).toBe(true);
    expect(needsSharedTripUpdate(proposal())).toBe(false);
  });
});

describe('IdeaCloneUpdateBanner', () => {
  test('stays hidden for a clean draft', async () => {
    const { container } = await render(
      <IdeaCloneUpdateBanner onRebase={vi.fn()} pendingAction={null} proposal={proposal()} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders the update flow when the shared trip has changed', async () => {
    await render(
      <IdeaCloneUpdateBanner
        onRebase={vi.fn()}
        pendingAction={null}
        proposal={proposal({ sourceChanged: true })}
      />
    );
    await expect.element(page.getByTestId('idea-update-flow')).toBeInTheDocument();
  });
});
