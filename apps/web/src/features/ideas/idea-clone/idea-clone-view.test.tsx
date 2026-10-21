import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaCloneView } from './idea-clone-view';

const state = vi.hoisted(() => ({ proposal: undefined as unknown }));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersion: () => ({ proposal: state.proposal })
}));

vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  IdeaContextProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  Navigate: ({ params, to }: { params: Record<string, string>; to: string }) => (
    <div>
      redirect:
      {Object.entries(params).reduce((href, [key, value]) => href.replace(`$${key}`, value), to)}
    </div>
  )
}));

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>
}));

vi.mock('./idea-clone-workspace', () => ({
  IdeaCloneWorkspace: (props: {
    changeCount: number;
    proposalLoading: boolean;
    workingTripId?: string;
  }) => (
    <div>
      workspace:{String(props.proposalLoading)}:{props.changeCount}:{props.workingTripId ?? 'none'}
    </div>
  )
}));

function renderView(view: 'compare' | 'overview' = 'compare') {
  return render(
    <IdeaCloneView
      addDestinationOpen={false}
      proposalId={'idea-1' as Id<'tripProposals'>}
      sharedTripId={'trip-1' as Id<'trips'>}
      view={view}
    />
  );
}

beforeEach(() => {
  state.proposal = undefined;
});

describe('IdeaCloneView', () => {
  test('shows a not-found screen when the idea is gone', async () => {
    state.proposal = null;
    await renderView();
    await expect.element(page.getByText('Idea not found')).toBeVisible();
    await expect
      .element(page.getByText('It may have been removed, or you do not have access to this trip.'))
      .toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Back to ideas' }))
      .toHaveAttribute('href', '/ideas');
  });

  test('passes loading state to the workspace while the proposal loads', async () => {
    await renderView();
    await expect.element(page.getByText('workspace:true:0:none')).toBeVisible();
  });

  test('renders the workspace for a proposal on this trip', async () => {
    state.proposal = {
      changes: [{}, {}],
      id: 'idea-1',
      sourceTripId: 'trip-1',
      workingTripId: 'trip-2'
    };
    await renderView();
    await expect.element(page.getByText('workspace:false:2:trip-2')).toBeVisible();
  });

  test.each<['compare' | 'overview']>([['compare'], ['overview']])(
    'redirects to the owning trip in the %s view',
    async (view) => {
      state.proposal = {
        changes: [],
        id: 'idea-1',
        sourceTripId: 'trip-9',
        status: 'in_review',
        workingTripId: 'trip-2'
      };
      await renderView(view);
      await expect
        .element(page.getByText(`redirect:/trips/trip-9/ideas/idea-1/${view}`))
        .toBeVisible();
      await expect.element(page.getByText('workspace:', { exact: false })).not.toBeInTheDocument();
    }
  );
});
