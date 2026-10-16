import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { TripState } from '@/features/trips/trip-detail/trip-detail-types';
import { testIds } from '@/lib/test-ids';
import type { IdeaStatus } from '@/types/ideas';
import { IdeaCloneHeader } from './idea-clone-header';

const ideaState = vi.hoisted(() => ({ idea: null as unknown }));

vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ideaState.idea
}));

vi.mock('@/features/trips/trip-detail/use-trip-cover', () => ({
  useTripCover: () => ({ src: null })
}));

vi.mock('@/features/trips/trip-detail/trip-toolbar-facts', () => ({
  tripToolbarFacts: () => ({ marker: 'facts' })
}));

vi.mock('@/features/trips/trip-detail/trip-toolbar-chips', () => ({
  TripToolbarChips: ({ destinationStatus }: { destinationStatus: string }) => (
    <p>chips:{destinationStatus}</p>
  )
}));

vi.mock('@/features/trips/trip-detail/trip-header', () => ({
  TripHeader: ({
    actions,
    chips,
    dataTripId,
    dataTripName,
    status,
    testId,
    title
  }: {
    actions: ReactNode;
    chips: ReactNode;
    dataTripId: string;
    dataTripName: string;
    status: ReactNode;
    testId: string;
    title: string;
  }) => (
    <header data-trip-id={dataTripId} data-trip-name={dataTripName}>
      <h1 data-testid={testId}>{title}</h1>
      {status}
      {chips}
      {actions}
    </header>
  )
}));

vi.mock('./idea-header-status', () => ({
  IdeaHeaderStatus: ({
    canEdit,
    reviewing,
    sharedTripName,
    status
  }: {
    canEdit: boolean;
    reviewing: boolean;
    sharedTripName: string;
    status: string;
  }) => (
    <p>
      header-status:{status}:{String(canEdit)}:{String(reviewing)}:{sharedTripName}
    </p>
  )
}));

vi.mock('./idea-clone-header-actions', () => ({
  IdeaCloneHeaderActions: ({
    canEdit,
    onCloseIdea,
    onEdit,
    onPrimary,
    onResolve,
    pending,
    primary
  }: {
    canEdit: boolean;
    onCloseIdea?: () => void;
    onEdit: () => void;
    onPrimary: () => void;
    onResolve?: () => void;
    pending?: boolean;
    primary: { label: string } | null;
  }) => (
    <div>
      <p>
        actions:{String(canEdit)}:{String(Boolean(pending))}:{primary?.label ?? 'no-primary'}:
        {onCloseIdea ? 'closable' : 'not-closable'}:{onResolve ? 'resolvable' : 'not-resolvable'}
      </p>
      <button onClick={onEdit} type="button">
        edit
      </button>
      <button onClick={onPrimary} type="button">
        primary
      </button>
    </div>
  )
}));

function makeTrip(canEdit = true): TripDetail {
  return {
    destination: { status: 'chosen' },
    id: 'trip-2' as Id<'trips'>,
    name: 'Atlantic week (idea)',
    permissions: { canEdit }
  } as unknown as TripDetail;
}

function renderHeader(overrides: Partial<Parameters<typeof IdeaCloneHeader>[0]> = {}) {
  const handlers = { onEdit: vi.fn(), onOpenShared: vi.fn(), onPrimary: vi.fn() };
  const view = render(
    <IdeaCloneHeader
      primary={{ intent: 'submit', label: 'Send for review' }}
      proposalId={'idea-1' as Id<'tripProposals'>}
      sharedTripId={'trip-1' as Id<'trips'>}
      status="draft"
      trip={makeTrip()}
      tripState={{ retryCover: vi.fn() } as unknown as TripState}
      view="overview"
      {...handlers}
      {...overrides}
    />
  );
  return { handlers, view };
}

beforeEach(() => {
  ideaState.idea = null;
});

describe('IdeaCloneHeader', () => {
  test('falls back to the working trip name and facts', async () => {
    await renderHeader().view;
    await expect
      .element(page.getByTestId(testIds.tripHeading))
      .toHaveTextContent('Atlantic week (idea)');
    await expect.element(page.getByText('chips:chosen')).toBeVisible();
    await expect.element(page.getByRole('banner')).toHaveAttribute('data-trip-id', 'trip-2');
  });

  test('prefers the idea title from context and exposes the idea on the workspace wrapper', async () => {
    ideaState.idea = {
      proposal: { title: 'Coast day' },
      sharedTrip: { name: 'Atlantic week' }
    };
    await renderHeader({ ideaName: 'Coast idea' }).view;
    await expect.element(page.getByTestId(testIds.tripHeading)).toHaveTextContent('Coast day');
    const wrapper = page.getByTestId(testIds.ideaWorkspace);
    await expect.element(wrapper).toHaveAttribute('data-idea-id', 'idea-1');
    await expect.element(wrapper).toHaveAttribute('data-idea-name', 'Coast idea');
    await expect
      .element(page.getByText(/header-status:draft:true:false:Atlantic week/u))
      .toBeVisible();
  });

  test.each<[string, Partial<Parameters<typeof IdeaCloneHeader>[0]>, string]>([
    ['source trip name wins', { sourceTripName: 'Source trip' }, 'Source trip'],
    ['working trip name is the last fallback', {}, 'Atlantic week (idea)']
  ])('shared trip name: %s', async (_, props, name) => {
    await renderHeader(props).view;
    await expect.element(page.getByText(`header-status:draft:true:false:${name}`)).toBeVisible();
  });

  test.each<[string, 'compare' | 'overview', boolean]>([
    ['compare', 'compare', true],
    ['overview', 'overview', false]
  ])('reviewing is %s', async (_, view, reviewing) => {
    await renderHeader({ view }).view;
    await expect
      .element(page.getByText(`header-status:draft:true:${reviewing}:`, { exact: false }))
      .toBeVisible();
  });

  test('passes viewer permissions down', async () => {
    await renderHeader({ trip: makeTrip(false) }).view;
    await expect.element(page.getByText(/actions:false/u)).toBeVisible();
    await expect.element(page.getByText(/header-status:draft:false/u)).toBeVisible();
  });

  test.each<[string, Partial<Parameters<typeof IdeaCloneHeader>[0]>, string]>([
    [
      'pending, no primary',
      { pending: true, primary: null },
      'actions:true:true:no-primary:not-closable:not-resolvable'
    ],
    [
      'closable and resolvable',
      { onCloseIdea: vi.fn(), onResolve: vi.fn(), status: 'conflicted' as IdeaStatus },
      'actions:true:false:Send for review:closable:resolvable'
    ]
  ])('actions: %s', async (_, props, text) => {
    await renderHeader(props).view;
    await expect.element(page.getByText(text)).toBeVisible();
  });

  test('forwards edit and primary clicks', async () => {
    const { handlers, view } = renderHeader();
    await view;
    await page.getByRole('button', { name: 'edit' }).click();
    await page.getByRole('button', { name: 'primary' }).click();
    expect(handlers.onEdit).toHaveBeenCalledTimes(1);
    expect(handlers.onPrimary).toHaveBeenCalledTimes(1);
  });
});
