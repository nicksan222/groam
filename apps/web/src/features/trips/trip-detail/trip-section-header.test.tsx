import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { useWorkspaceDialogs } from '@/features/workspace/workspace-shell/workspace-dialog-state';
import { useTripCreateRequestStore } from '@/lib/stores/trip-create-request-store';
import { testIds } from '@/lib/test-ids';
import type { TripState } from './trip-detail-types';
import { TripSectionHeader } from './trip-section-header';

vi.mock('@/lib/navigation/router', async () => ({
  ...(await (await import('@/lib/testing/router-mock')).mockRouterTargets()),
  useParams: () => ({ tripId: 'abc123' })
}));
const workspace = vi.hoisted(() => ({ role: 'member' }));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ activeRole: workspace.role })
}));
const viewport = vi.hoisted(() => ({ phone: false }));
vi.mock('@groam/ui/hooks/use-mobile', () => ({
  useIsNarrow: () => viewport.phone
}));
vi.mock('@/features/trips/hooks/use-trip-travelers', () => ({
  useTripTravelers: () => ({
    goingCount: 2,
    isLoading: false,
    setStatus: vi.fn(),
    travelers: [
      { image: null, name: 'Ada Lovelace', status: 'going', userId: 'u1' },
      { image: null, name: 'Grace Hopper', status: 'going', userId: 'u2' },
      { image: null, name: 'Maybe Person', status: 'maybe', userId: 'u3' }
    ]
  })
}));
vi.mock('./trip-navigation-actions', () => ({
  TripNavigationActions: ({ onStartIdea }: { onStartIdea?: () => void }) => (
    <div>
      <span>trip actions</span>
      {onStartIdea ? <span>menu: new idea</span> : null}
    </div>
  )
}));
vi.mock('@/features/trips/trip-duration', () => ({ dayCountLabel: () => '7 days' }));
vi.mock('@/features/trips/trip-overview/trip-window-value', () => ({
  windowValue: () => 'Sep 12 – 19'
}));

function trip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    archivedAt: null,
    currency: 'USD',
    destination: { name: 'Lisbon', status: 'known' },
    groupMemberCount: 5,
    id: 'trip-1',
    initialBudget: null,
    name: 'Atlantic week',
    permissions: { canPropose: true },
    proposal: null,
    role: 'organizer',
    totalDurationDays: 7,
    totalPlannedCost: 0,
    travelerCount: 3,
    ...overrides
  } as unknown as TripDetail;
}

function mount(props: Partial<Parameters<typeof TripSectionHeader>[0]> = {}) {
  return render(
    <TripSectionHeader
      onEdit={vi.fn()}
      onStartIdea={vi.fn()}
      section="plan"
      trip={trip()}
      tripState={{} as TripState}
      {...props}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  workspace.role = 'member';
  viewport.phone = false;
  useWorkspaceDialogs.getState().closeDialog();
});

describe('TripSectionHeader', () => {
  test('titles the page with the section and keeps the trip name for the journeys', async () => {
    await mount({ section: 'packing' });
    const heading = page.getByTestId(testIds.tripHeading);
    await expect.element(heading).toHaveAttribute('data-trip-name', 'Atlantic week');
    await expect.poll(() => heading.element().textContent).toBe('Packing');
    await expect
      .element(page.getByText('Who brings what, plus your own list.'))
      .not.toBeInTheDocument();
  });

  test('Plan offers Suggest a change and the trip actions, with no New idea in the menu', async () => {
    const onStartIdea = vi.fn();
    await mount({ onStartIdea });
    const suggest = page.getByTestId(testIds.sharedTripNewIdea);
    await expect.element(suggest).toHaveTextContent('Suggest a change');
    await suggest.click();
    expect(onStartIdea).toHaveBeenCalledOnce();
    await expect.element(page.getByText('trip actions')).toBeVisible();
    await expect.element(page.getByText('menu: new idea')).not.toBeInTheDocument();
  });

  test('Packing offers to suggest gear changes', async () => {
    await mount({ section: 'packing' });
    await expect
      .element(page.getByTestId(testIds.sharedTripNewIdea))
      .toHaveTextContent('Suggest gear changes');
  });

  test('an archived trip is read-only: a quiet notice and no Suggest a change', async () => {
    await mount({ trip: trip({ archivedAt: 1 }) });
    await expect.element(page.getByTestId(testIds.sharedTripBanner)).toBeVisible();
    await expect.element(page.getByTestId(testIds.sharedTripNewIdea)).not.toBeInTheDocument();
  });

  test('Plan describes the trip and links the travelers count to People', async () => {
    await mount({ section: 'plan' });
    await expect
      .poll(() => page.getByTestId(testIds.tripDestination).element().textContent)
      .toBe('Lisbon');
    const link = page.getByTestId(testIds.tripPeopleLink);
    await expect.poll(() => link.element().textContent).toMatch(/5 in group · 3 going$/u);
    await expect.element(link).toHaveAttribute('href', '/trips/abc123/people');
  });

  test('the people link says only "going" when the whole group is going', async () => {
    await mount({ section: 'plan', trip: trip({ groupMemberCount: 4, travelerCount: 4 }) });
    await expect.element(page.getByTestId(testIds.tripPeopleLink)).toHaveAccessibleName('4 going');
  });

  test('the going link carries the going faces only, and a hairline follows it', async () => {
    await mount({ section: 'plan' });
    const link = page.getByTestId(testIds.tripPeopleLink).element();
    expect(link.querySelectorAll('[data-slot="avatar"]')).toHaveLength(2);
    await expect.element(page.getByTestId(testIds.tripHeading)).toBeVisible();
    expect(document.querySelector('[data-slot="shell-header-divider"]')).not.toBeNull();
  });

  test('the going link leads the action cluster, then the menu, then the primary button', async () => {
    await mount({ section: 'ideas' });
    const order = [
      page.getByTestId(testIds.tripPeopleLink),
      page.getByText('trip actions'),
      page.getByTestId(testIds.sharedTripNewIdea)
    ].map((locator) => locator.element());
    for (const [index, element] of order.entries()) {
      const next = order[index + 1];
      if (next) {
        expect(
          element.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
      }
    }
  });

  test('People has no going link, so no hairline either', async () => {
    await mount({ section: 'people' });
    await expect.element(page.getByTestId(testIds.tripPeopleLink)).not.toBeInTheDocument();
  });

  test("on phones the going link moves into Plan's facts line, as the only one", async () => {
    viewport.phone = true;
    await mount({ section: 'plan' });
    const link = page.getByTestId(testIds.tripPeopleLink);
    await expect.element(link).toBeVisible();
    expect(link.element().closest('[data-slot="shell-header-meta"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="shell-header-divider"]')).toBeNull();
    expect(link.element().querySelectorAll('[data-slot="avatar"]')).toHaveLength(2);
  });

  test('on phones other sections have no going link', async () => {
    viewport.phone = true;
    await mount({ section: 'ideas' });
    await expect.element(page.getByTestId(testIds.tripPeopleLink)).not.toBeInTheDocument();
  });

  test('the trip name links back to Plan from other sections, and is plain text on Plan', async () => {
    await mount({ section: 'issues' });
    await expect
      .element(page.getByRole('link', { name: 'Atlantic week' }))
      .toHaveAttribute('href', '/trips/abc123/plan');
  });

  test('on Plan the trip name is not a link to itself', async () => {
    await mount({ section: 'plan' });
    await expect.element(page.getByText('Atlantic week')).toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'Atlantic week' })).not.toBeInTheDocument();
  });

  test('Plan puts what the plan costs on its facts line', async () => {
    await mount({
      section: 'plan',
      trip: trip({ initialBudget: 62_400, totalPlannedCost: 29_810 })
    });
    await expect.element(page.getByText('$29,810 of $62,400 planned')).toBeVisible();
  });

  test('a plan with no cost yet says nothing about money', async () => {
    await mount({ section: 'plan' });
    await expect.element(page.getByText(/planned/u)).not.toBeInTheDocument();
  });

  test.each([
    ['research', testIds.researchCreate, 'research'],
    ['issues', testIds.newIssue, 'issue'],
    ['polls', testIds.newPoll, 'poll']
  ] as const)(
    'the %s page has its own creation button, and New idea moves into the menu',
    async (section, testId, kind) => {
      await mount({ section });
      await expect.element(page.getByTestId(testIds.sharedTripNewIdea)).not.toBeInTheDocument();
      await expect.element(page.getByText('menu: new idea')).toBeVisible();
      await page.getByTestId(testId).click();
      expect(useTripCreateRequestStore.getState().requested?.kind).toBe(kind);
    }
  );

  test('Ideas offers New idea as its one button, and keeps it out of the trip actions menu', async () => {
    const onStartIdea = vi.fn();
    await mount({ onStartIdea, section: 'ideas' });
    const button = page.getByTestId(testIds.sharedTripNewIdea);
    await expect.element(button).toHaveTextContent('New idea');
    await expect.element(page.getByText('menu: new idea')).not.toBeInTheDocument();
    await button.click();
    expect(onStartIdea).toHaveBeenCalledOnce();
  });

  test('Calendar phrases the idea button as Suggest a change', async () => {
    await mount({ section: 'calendar' });
    await expect
      .element(page.getByTestId(testIds.sharedTripNewIdea))
      .toHaveTextContent('Suggest a change');
  });

  test('without permission to propose, Ideas has no button', async () => {
    await mount({
      section: 'ideas',
      trip: trip({ permissions: { canPropose: false } as TripDetail['permissions'] })
    });
    await expect.element(page.getByTestId(testIds.sharedTripNewIdea)).not.toBeInTheDocument();
  });

  test('the idea button waits while an idea is being started', async () => {
    await mount({ section: 'ideas', startingIdea: true });
    await expect.element(page.getByTestId(testIds.sharedTripNewIdea)).toBeDisabled();
  });

  test.each(['ideas', 'issues', 'polls'] as const)(
    'an archived trip has no creation button on %s',
    async (section) => {
      await mount({ section, trip: trip({ archivedAt: 1 }) });
      await expect.element(page.getByTestId(testIds.sharedTripNewIdea)).not.toBeInTheDocument();
      await expect.element(page.getByTestId(testIds.newIssue)).not.toBeInTheDocument();
      await expect.element(page.getByTestId(testIds.newPoll)).not.toBeInTheDocument();
    }
  );

  test('activity has no creation button but still offers New idea in the menu', async () => {
    await mount({ section: 'activity' });
    await expect.element(page.getByTestId(testIds.sharedTripNewIdea)).not.toBeInTheDocument();
    await expect.element(page.getByText('menu: new idea')).toBeVisible();
  });

  test.each(['owner', 'admin'])('People offers a group %s Invite to group', async (role) => {
    workspace.role = role;
    await mount({ section: 'people' });
    await page.getByTestId(testIds.tripPeopleInvite).click();
    expect(useWorkspaceDialogs.getState().dialog).toBe('invite');
    await expect.element(page.getByTestId(testIds.sharedTripNewIdea)).not.toBeInTheDocument();
  });

  test('People hides Invite to group from people who do not manage the group', async () => {
    await mount({ section: 'people' });
    await expect.element(page.getByTestId(testIds.tripPeopleInvite)).not.toBeInTheDocument();
  });

  test('no other section offers Invite to group', async () => {
    workspace.role = 'owner';
    await mount({ section: 'packing' });
    await expect.element(page.getByTestId(testIds.tripPeopleInvite)).not.toBeInTheDocument();
  });
});

test.each(['ideas', 'issues', 'polls', 'research', 'activity'] as const)(
  '%s exposes Filter and Sort as mobile shell actions',
  async (section) => {
    await useViewport(390, 844);
    viewport.phone = true;
    await mount({ section });
    const filter = page.getByRole('button', { name: 'Filter', exact: true });
    const sort = page.getByRole('button', { name: 'Sort', exact: true });
    await expect.element(filter).toBeVisible();
    await expect.element(sort).toBeVisible();
    expect(filter.element().closest('[data-slot="shell-header-actions"]')).not.toBeNull();
    await filter.click();
    expect(useTripCreateRequestStore.getState().requested?.kind).toBe('search');
    await sort.click();
    expect(useTripCreateRequestStore.getState().requested?.kind).toBe('sort');
  }
);
