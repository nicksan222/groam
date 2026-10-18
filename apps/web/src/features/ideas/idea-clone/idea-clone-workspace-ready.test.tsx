import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaCloneWorkspaceReady } from './idea-clone-workspace-ready';

const state = vi.hoisted(() => ({
  needsUpdate: false,
  page: {} as Record<string, unknown>
}));
const openView = vi.hoisted(() => vi.fn());
const rebase = vi.hoisted(() => vi.fn());
const run = vi.hoisted(() => vi.fn());
const resolve = vi.hoisted(() => vi.fn());
const openPanel = vi.hoisted(() => vi.fn());

vi.mock('@/features/ideas/hooks/idea-needs-update', () => ({
  needsSharedTripUpdate: () => state.needsUpdate
}));

vi.mock('@/features/ideas/hooks/use-idea-clone-workspace', () => ({
  useIdeaCloneWorkspace: () => state.page
}));

vi.mock('@/features/trips/trip-detail/trip-details-editor', () => ({
  TripDetailsEditor: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose} type="button">
      details-editor
    </button>
  )
}));
vi.mock('@/features/trips/trip-detail/trip-not-found', () => ({
  TripNotFound: () => <p>trip-not-found</p>
}));
vi.mock('@/features/trips/trip-detail/trip-page-shell', () => ({
  TripPageShell: ({
    banner,
    body,
    children,
    hero,
    isLoading,
    nav,
    notice
  }: Record<string, ReactNode>) => (
    <div data-loading={String(Boolean(isLoading))}>
      {hero}
      {nav}
      {banner}
      {notice}
      {body}
      {children}
    </div>
  )
}));
vi.mock('@/features/trips/trip-detail/trip-toolbar-skeleton', () => ({
  TripToolbarSkeleton: () => <p>toolbar-skeleton</p>
}));
vi.mock('@/features/trips/trip-ideas/trip-idea-notice', () => ({
  TripIdeaNotice: () => <p>idea-notice</p>
}));
vi.mock('./idea-clone-body', () => ({
  IdeaCloneBody: ({ showLoading }: { showLoading: boolean }) => <p>body:{String(showLoading)}</p>
}));
vi.mock('./idea-clone-header', () => ({
  IdeaCloneHeader: (props: {
    onCloseIdea?: () => void;
    onResolve?: () => void;
    primary: { intent: string } | null;
    sourceTripName?: string;
    status: string;
  }) => (
    <div>
      <p>
        header:{props.status}:{props.primary?.intent ?? 'no-primary'}:
        {props.sourceTripName ?? 'no-source'}
      </p>
      {props.onCloseIdea ? (
        <button onClick={props.onCloseIdea} type="button">
          header-close
        </button>
      ) : null}
      {props.onResolve ? (
        <button onClick={props.onResolve} type="button">
          header-resolve
        </button>
      ) : null}
    </div>
  )
}));
vi.mock('./idea-clone-lifecycle-dialogs', () => ({
  IdeaCloneLifecycleDialogs: ({ closingOpen }: { closingOpen: boolean }) => (
    <p>dialogs:{String(closingOpen)}</p>
  )
}));
vi.mock('./idea-clone-nav', () => ({
  IdeaCloneNav: ({
    changeCount,
    isLoading,
    onOpen,
    stopCount,
    viewOnly
  }: {
    changeCount?: number;
    isLoading?: boolean;
    onOpen?: (view: string) => void;
    stopCount?: number;
    viewOnly?: boolean;
  }) =>
    isLoading ? (
      <p>nav-loading</p>
    ) : (
      <button onClick={() => onOpen?.('compare')} type="button">
        nav:{changeCount}:{stopCount}:{String(viewOnly)}
      </button>
    )
}));
vi.mock('./idea-clone-update-banner', () => ({
  IdeaCloneUpdateBanner: ({
    onRebase,
    onReviewConflicts
  }: {
    onRebase: () => void;
    onReviewConflicts?: () => void;
  }) => (
    <div>
      <p>update-banner</p>
      <button onClick={onRebase} type="button">
        banner-rebase
      </button>
      {onReviewConflicts ? (
        <button onClick={onReviewConflicts} type="button">
          banner-review
        </button>
      ) : null}
    </div>
  )
}));

function readyPage(overrides: Record<string, unknown> = {}) {
  return {
    closingIdea: { open: false, openPanel, setOpen: vi.fn() },
    confirmingApply: false,
    editDetails: vi.fn(),
    editing: { closePanel: vi.fn(), open: false },
    idea: { sharedTrip: { name: 'Atlantic week' } },
    missing: false,
    navigation: {},
    openShared: vi.fn(),
    openView,
    pendingAction: null,
    planningSection: 'itinerary',
    primary: { intent: 'submit', label: 'Send for review' },
    proposal: { canResolve: false, status: 'draft' },
    run,
    runPrimary: vi.fn(),
    setConfirmingApply: vi.fn(),
    showLoading: false,
    trip: { destinations: [{}, {}, {}], permissions: { canEdit: true } },
    version: { canClose: false, proposal: { canClose: false }, rebase, resolve },
    workingState: { update: vi.fn() },
    ...overrides
  };
}

function renderReady(view: 'compare' | 'overview' = 'overview') {
  return render(
    <IdeaCloneWorkspaceReady
      addDestinationOpen={false}
      changeCount={4}
      proposalId={'idea-1' as Id<'tripProposals'>}
      sharedTripId={'trip-1' as Id<'trips'>}
      view={view}
      workingTripId={'trip-2' as Id<'trips'>}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.needsUpdate = false;
  state.page = readyPage();
});

describe('IdeaCloneWorkspaceReady', () => {
  test('shows a not-found page for a missing idea', async () => {
    state.page = readyPage({ missing: true });
    await renderReady();
    await expect.element(page.getByText('trip-not-found')).toBeVisible();
    await expect.element(page.getByText('idea-notice')).not.toBeInTheDocument();
  });

  test('renders the header, nav, notice, body, and dialogs for a ready idea', async () => {
    await renderReady();
    await expect.element(page.getByText('header:draft:submit:Atlantic week')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'nav:4:3:false' })).toBeVisible();
    await expect.element(page.getByText('idea-notice')).toBeVisible();
    await expect.element(page.getByText('body:false')).toBeVisible();
    await expect.element(page.getByText('dialogs:false')).toBeVisible();
    await expect.element(page.getByText('update-banner')).toBeVisible();
  });

  test('viewers without edit rights get a view-only nav', async () => {
    state.page = readyPage({ trip: { destinations: [], permissions: { canEdit: false } } });
    await renderReady();
    await expect.element(page.getByRole('button', { name: 'nav:4:0:true' })).toBeVisible();
  });

  test('loading shows skeletons and hides the banner', async () => {
    state.page = readyPage({ showLoading: true, trip: undefined });
    await renderReady();
    await expect.element(page.getByText('toolbar-skeleton')).toBeVisible();
    await expect.element(page.getByText('nav-loading')).toBeVisible();
    await expect.element(page.getByText('body:true')).toBeVisible();
    await expect.element(page.getByText('update-banner')).not.toBeInTheDocument();
  });

  test('a proposal without status keeps the toolbar skeleton', async () => {
    state.page = readyPage({ proposal: { status: undefined } });
    await renderReady();
    await expect.element(page.getByText('toolbar-skeleton')).toBeVisible();
  });

  test('opens the details editor while editing', async () => {
    const closePanel = vi.fn();
    state.page = readyPage({ editing: { closePanel, open: true } });
    await renderReady();
    await page.getByRole('button', { name: 'details-editor' }).click();
    expect(closePanel).toHaveBeenCalledTimes(1);
  });

  test('the update banner reviews conflicts outside compare, but not inside it', async () => {
    await renderReady('overview');
    await page.getByRole('button', { name: 'banner-review' }).click();
    expect(openView).toHaveBeenCalledWith('compare');
  });

  test('compare view has no review-conflicts action', async () => {
    await renderReady('compare');
    await expect
      .element(page.getByRole('button', { name: 'banner-review' }))
      .not.toBeInTheDocument();
  });

  test('rebase is wired to the version', async () => {
    await renderReady();
    await page.getByRole('button', { name: 'banner-rebase' }).click();
    expect(rebase).toHaveBeenCalledTimes(1);
  });

  test.each<[string, boolean, string]>([
    ['hidden when an update is prompted', true, 'header:conflicted:no-primary:Atlantic week'],
    ['kept otherwise', false, 'header:conflicted:rebase:Atlantic week']
  ])('the rebase primary action is %s', async (_, needsUpdate, text) => {
    state.needsUpdate = needsUpdate;
    state.page = readyPage({
      primary: { intent: 'rebase', label: 'Update from shared trip' },
      proposal: { canResolve: false, status: 'conflicted' }
    });
    await renderReady();
    await expect.element(page.getByText(text)).toBeVisible();
  });

  test('close and resolve are offered only when allowed', async () => {
    state.page = readyPage({
      proposal: { canResolve: true, status: 'conflicted' },
      version: { proposal: { canClose: true }, rebase, resolve }
    });
    run.mockImplementation((_name: string, task: () => unknown) => task());
    await renderReady();
    await page.getByRole('button', { name: 'header-close' }).click();
    expect(openPanel).toHaveBeenCalledTimes(1);
    await page.getByRole('button', { name: 'header-resolve' }).click();
    expect(run).toHaveBeenCalledWith('resolve', expect.any(Function));
    expect(resolve).toHaveBeenCalledWith([]);
  });

  test('no close or resolve controls by default', async () => {
    await renderReady();
    await expect
      .element(page.getByRole('button', { name: 'header-close' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'header-resolve' }))
      .not.toBeInTheDocument();
  });
});
