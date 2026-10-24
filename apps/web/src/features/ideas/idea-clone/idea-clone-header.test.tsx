import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import type { IdeaStatus } from '@/types/ideas';
import { IdeaCloneHeader } from './idea-clone-header';

const ideaState = vi.hoisted(() => ({ idea: null as unknown }));

vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ideaState.idea
}));

vi.mock('@/lib/navigation/router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal);
});

vi.mock('./idea-header-status', () => ({
  IdeaHeaderStatus: ({ status }: { status: string }) => <p>header-status:{status}</p>
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
    currency: 'USD',
    initialBudget: 2000,
    permissions: { canEdit },
    totalPlannedCost: 1500
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
  test('falls back to the working trip name and leads with Ideas', async () => {
    await renderHeader().view;
    await expect
      .element(page.getByTestId(testIds.tripHeading))
      .toHaveTextContent('Atlantic week (idea)');
    await expect
      .element(page.getByTestId(testIds.tripHeading))
      .toHaveAttribute('data-trip-id', 'trip-2');
    await expect.element(page.getByRole('link', { name: 'Ideas' })).toBeVisible();
    await expect.element(page.getByText('header-status:draft')).toBeVisible();
  });

  test('no longer repeats the trip as a subtitle or an editing chip', async () => {
    await renderHeader().view;
    await expect.element(page.getByText(/Idea for/u)).not.toBeInTheDocument();
    await expect.element(page.getByText('Editing idea')).not.toBeInTheDocument();
  });

  test('prefers the idea title from context and exposes the idea on the workspace wrapper', async () => {
    ideaState.idea = { proposal: { title: 'Coast day' }, sharedTrip: { name: 'Atlantic week' } };
    await renderHeader({ ideaName: 'Coast idea' }).view;
    await expect.element(page.getByTestId(testIds.tripHeading)).toHaveTextContent('Coast day');
    const wrapper = page.getByTestId(testIds.ideaWorkspace);
    await expect.element(wrapper).toHaveAttribute('data-idea-id', 'idea-1');
    await expect.element(wrapper).toHaveAttribute('data-idea-name', 'Coast idea');
  });

  test('the facts line folds in the draft notice', async () => {
    await renderHeader().view;
    await expect.element(page.getByText('Draft · not part of the agreed plan')).toBeVisible();
  });

  test('says when the viewer can only read, and when changes are under review', async () => {
    await renderHeader({ trip: makeTrip(false), view: 'compare' }).view;
    await expect.element(page.getByText('Read-only')).toBeVisible();
    await expect.element(page.getByText('Reviewing changes')).toBeVisible();
  });

  test.each<[IdeaStatus, boolean]>([
    ['draft', true],
    ['in_review', true],
    ['merged', false]
  ])('the draft line for a %s idea is shown: %s', async (status, shown) => {
    await renderHeader({ status }).view;
    const line = page.getByText('Draft · not part of the agreed plan');
    if (shown) await expect.element(line).toBeVisible();
    else await expect.element(line).not.toBeInTheDocument();
  });

  test('passes viewer permissions down', async () => {
    await renderHeader({ trip: makeTrip(false) }).view;
    await expect.element(page.getByText(/actions:false/u)).toBeVisible();
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
