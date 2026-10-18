import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaCloneWorkspace } from './idea-clone-workspace';

vi.mock('./idea-clone-loading-shell', () => ({
  IdeaCloneLoadingShell: ({ view }: { view: string }) => <div>loading-shell:{view}</div>
}));

vi.mock('./idea-clone-workspace-ready', () => ({
  IdeaCloneWorkspaceReady: (props: {
    changeCount: number;
    view: string;
    workingTripId: string;
  }) => (
    <div>
      ready:{props.view}:{props.workingTripId}:{props.changeCount}
    </div>
  )
}));

function renderWorkspace(overrides: Partial<Parameters<typeof IdeaCloneWorkspace>[0]> = {}) {
  return render(
    <IdeaCloneWorkspace
      addDestinationOpen={false}
      changeCount={3}
      proposalId={'idea-1' as Id<'tripProposals'>}
      sharedTripId={'trip-1' as Id<'trips'>}
      view="compare"
      workingTripId={'trip-2' as Id<'trips'>}
      {...overrides}
    />
  );
}

describe('IdeaCloneWorkspace', () => {
  test.each<[string, Partial<Parameters<typeof IdeaCloneWorkspace>[0]>]>([
    ['the proposal is loading', { proposalLoading: true }],
    ['there is no working trip yet', { workingTripId: undefined }]
  ])('shows the loading shell when %s', async (_, overrides) => {
    await renderWorkspace(overrides);
    await expect.element(page.getByText('loading-shell:compare')).toBeVisible();
    await expect.element(page.getByText('ready:', { exact: false })).not.toBeInTheDocument();
  });

  test('shows the ready workspace once the working trip is known', async () => {
    await renderWorkspace();
    await expect.element(page.getByText('ready:compare:trip-2:3')).toBeVisible();
    await expect.element(page.getByText('loading-shell', { exact: false })).not.toBeInTheDocument();
  });
});
