import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
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

afterEach(cleanup);

describe('needsSharedTripUpdate', () => {
  test('is true when the shared trip moved ahead or the idea is conflicted', () => {
    expect(needsSharedTripUpdate(proposal({ sourceChanged: true }))).toBe(true);
    expect(needsSharedTripUpdate(proposal({ status: 'conflicted' }))).toBe(true);
    expect(needsSharedTripUpdate(proposal())).toBe(false);
  });
});

describe('IdeaCloneUpdateBanner', () => {
  test('stays hidden for a clean draft', () => {
    const { container } = render(
      <IdeaCloneUpdateBanner onRebase={vi.fn()} pendingAction={null} proposal={proposal()} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders the update flow when the shared trip has changed', () => {
    render(
      <IdeaCloneUpdateBanner
        onRebase={vi.fn()}
        pendingAction={null}
        proposal={proposal({ sourceChanged: true })}
      />
    );
    expect(screen.getByTestId('idea-update-flow')).toBeTruthy();
  });
});
