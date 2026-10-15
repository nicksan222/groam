import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaContextProvider, useIdeaContext, useOptionalIdeaContext } from './use-idea-context';

const deps = vi.hoisted(() => ({
  useOptionalWorkspace: vi.fn(),
  useTrip: vi.fn(),
  useTripRecord: vi.fn(),
  useTripVersion: vi.fn()
}));

vi.mock('@/features/trips/hooks/use-trip-record', () => ({
  useTripRecord: (...args: unknown[]) => deps.useTripRecord(...args)
}));

vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersion: (...args: unknown[]) => deps.useTripVersion(...args)
}));

vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrip: (...args: unknown[]) => deps.useTrip(...args)
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => deps.useOptionalWorkspace()
}));

function ContextProbe() {
  const context = useIdeaContext();
  return <output aria-label="Idea context">{JSON.stringify(context)}</output>;
}

function OptionalContextProbe() {
  const context = useOptionalIdeaContext();
  return <output aria-label="Optional idea context">{String(context)}</output>;
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.useOptionalWorkspace.mockReturnValue({ session: { user: { id: 'user-lea' } } });
  deps.useTripRecord.mockReturnValue({ id: 'shared-trip', name: 'Shared Portugal' });
  deps.useTripVersion.mockReturnValue({
    proposal: {
      author: { userId: 'user-lea' },
      id: 'proposal-1',
      workingTripId: 'working-trip'
    }
  });
  deps.useTrip.mockReturnValue({ trip: { id: 'working-trip', name: 'My Portugal' } });
});

test('provides shared, working, and viewer-author idea state', async () => {
  await render(
    <IdeaContextProvider
      proposalId={'proposal-1' as never}
      sharedTripId={'shared-trip' as never}
      view="compare"
    >
      <ContextProbe />
    </IdeaContextProvider>
  );

  const context = page.getByRole('status', { name: 'Idea context' }).element().textContent;
  expect(context).toContain('"isViewerAuthor":true');
  expect(context).toContain('"view":"compare"');
  expect(context).toContain('"working-trip"');
  expect(deps.useTrip).toHaveBeenCalledWith('working-trip');
});

test('keeps the context usable while the proposal has no working trip', async () => {
  deps.useTripVersion.mockReturnValue({ proposal: undefined });
  await render(
    <IdeaContextProvider
      proposalId={'proposal-1' as never}
      sharedTripId={'shared-trip' as never}
      view="overview"
    >
      <ContextProbe />
    </IdeaContextProvider>
  );

  const context = page.getByRole('status', { name: 'Idea context' }).element().textContent;
  expect(context).toContain('"isViewerAuthor":false');
  expect(context).not.toContain('"workingTrip"');
  expect(deps.useTrip).not.toHaveBeenCalled();
});

test('returns null from the optional hook when no provider is present', async () => {
  await render(<OptionalContextProbe />);

  await expect
    .element(page.getByRole('status', { name: 'Optional idea context' }))
    .toHaveTextContent('null');
});
