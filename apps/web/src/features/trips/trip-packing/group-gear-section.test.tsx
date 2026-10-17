import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { usePendingGearClaimStore } from '@/lib/stores/pending-gear-claim-store';
import { testIds } from '@/lib/test-ids';
import { GroupGearSection } from './group-gear-section';

const packing = vi.hoisted(() => ({
  add: vi.fn(),
  bring: vi.fn(),
  isLoading: false,
  items: [] as unknown[],
  remove: vi.fn(),
  update: vi.fn()
}));
const notifications = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));
const travelers = vi.hoisted(() => ({
  travelers: [
    { name: 'Me Myself', status: 'going', userId: 'me' },
    { name: 'Ana', status: 'going', userId: 'ana' }
  ]
}));

vi.mock('@/features/trips/hooks/use-trip-packing', () => ({ useTripPacking: () => packing }));
vi.mock('@/features/trips/hooks/use-trip-travelers', () => ({
  useTripTravelers: () => travelers
}));
vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ({ proposal: { id: 'proposal-1' } })
}));
const navigate = vi.hoisted(() => vi.fn());
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const { mockRouter } = await import('@/lib/testing/router-mock');
  return mockRouter(importOriginal, navigate);
});
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'me' } } })
}));

const hairDryer = {
  bringers: [
    { count: 1, image: null, name: 'Me Myself', userId: 'me' },
    { count: 2, image: null, name: 'Ana', userId: 'ana' }
  ],
  brought: 3,
  id: 'item-1',
  label: 'Hair dryer',
  quantity: 3
};
const tent = { bringers: [], brought: 0, id: 'item-2', label: 'Tent', quantity: 2 };
const speaker = {
  bringers: [{ count: 3, image: null, name: 'Ana', userId: 'ana' }],
  brought: 3,
  id: 'item-3',
  label: 'Speaker',
  quantity: 2
};

function trip(overrides: Record<string, unknown> = {}) {
  return {
    archivedAt: null,
    id: 'trip-1',
    permissions: { canEdit: true },
    proposal: null,
    ...overrides
  } as unknown as TripDetail;
}

beforeEach(() => {
  vi.clearAllMocks();
  usePendingGearClaimStore.getState().clear();
  packing.items = [];
  packing.isLoading = false;
  packing.add.mockResolvedValue(true);
});

describe('GroupGearSection on the shared trip', () => {
  test('shows needs, bringers, and coverage states read-only', async () => {
    packing.items = [hairDryer, tent, speaker];
    await render(<GroupGearSection onStartPackingIdea={vi.fn()} trip={trip()} />);

    await expect.element(page.getByText('You 1 · Ana 2')).toBeVisible();
    await expect.element(page.getByText('3 of 3 claimed')).toBeVisible();
    await expect.element(page.getByText('Covered')).toBeVisible();
    await expect
      .element(page.getByText("Nobody's bringing this yet", { exact: false }))
      .toBeVisible();
    await expect.element(page.getByText('0 of 2 claimed')).toBeVisible();
    await expect.element(page.getByText('Need 2 more')).toBeVisible();
    await expect.element(page.getByText('1 spare')).toBeVisible();
    await expect.element(page.getByText('2 of 3 items covered')).toBeVisible();
    await expect
      .element(page.getByText('Gear changes go through an idea', { exact: false }))
      .toBeVisible();
    await expect.element(page.getByRole('textbox')).not.toBeInTheDocument();
    await expect.element(page.getByTestId(testIds.tripPackingGearAdd)).not.toBeInTheDocument();
  });

  test('offers to change gear in an idea', async () => {
    const start = vi.fn();
    packing.items = [hairDryer];
    await render(<GroupGearSection onStartPackingIdea={start} trip={trip()} />);
    await page.getByRole('button', { name: 'Suggest gear changes' }).click();
    expect(start).toHaveBeenCalledTimes(1);
  });

  test('claims one item through an idea in a single tap', async () => {
    const start = vi.fn();
    packing.items = [hairDryer];
    await render(<GroupGearSection onStartPackingIdea={start} trip={trip()} />);
    await page.getByRole('button', { name: 'Bring one more Hair dryer' }).click();
    expect(start).toHaveBeenCalledWith('Hair dryer');
  });

  test('disables the action while an idea is starting and hides it when archived', async () => {
    await render(<GroupGearSection onStartPackingIdea={vi.fn()} startingIdea trip={trip()} />);
    await expect.element(page.getByTestId(testIds.tripPackingChange)).toBeDisabled();
  });

  test('has no change action on an archived trip', async () => {
    await render(<GroupGearSection onStartPackingIdea={vi.fn()} trip={trip({ archivedAt: 5 })} />);
    await expect.element(page.getByTestId(testIds.tripPackingChange)).not.toBeInTheDocument();
  });

  test('shows the empty state with one action that starts an idea', async () => {
    await render(<GroupGearSection onStartPackingIdea={vi.fn()} trip={trip()} />);
    await expect.element(page.getByText('Nothing on the group list yet')).toBeVisible();
    await expect
      .element(page.getByText('through an idea so everyone can weigh in', { exact: false }))
      .toBeVisible();
  });

  test('lists every bringer for screen readers and folds extra chips into +N', async () => {
    const many = ['Ana Rodriguez', 'Bo Chen', 'Carmen Diaz', 'Dev Patel', 'Elif Yilmaz'].map(
      (name, index) => ({ count: 1, image: null, name, userId: `u${index}` })
    );
    packing.items = [{ bringers: many, brought: 5, id: 'item-9', label: 'Stove', quantity: 6 }];
    await render(<GroupGearSection trip={trip()} />);
    await expect.element(page.getByText('+2')).toBeVisible();
    await expect
      .element(
        page.getByText('Ana Rodriguez 1 · Bo Chen 1 · Carmen Diaz 1 · Dev Patel 1 · Elif Yilmaz 1')
      )
      .toBeInTheDocument();
  });

  test('shows loading', async () => {
    packing.isLoading = true;
    await render(<GroupGearSection trip={trip()} />);
    await expect.element(page.getByLabelText('Loading group gear…')).toBeVisible();
  });
});

describe('GroupGearSection in an idea working copy', () => {
  const idea = () => trip({ proposal: { sourceTripId: 'source' } });

  test('adds an item with a needed quantity', async () => {
    await render(<GroupGearSection trip={idea()} />);
    await page.getByLabelText('Group item').fill('Hair dryer');
    await page.getByLabelText('How many the group needs').fill('3');
    await page.getByRole('button', { name: 'Add this item to group gear' }).click();
    expect(packing.add).toHaveBeenCalledWith('Hair dryer', 3);
    await expect.element(page.getByLabelText('Group item')).toHaveValue('');
  });

  test('offers starter items on an empty list that prefill the name', async () => {
    await render(<GroupGearSection trip={idea()} />);
    await page.getByRole('button', { name: 'First-aid kit' }).click();
    await expect.element(page.getByLabelText('Group item')).toHaveValue('First-aid kit');
    await expect.element(page.getByRole('button', { name: 'Power bank' })).not.toBeInTheDocument();
  });

  test('keeps Add pressable and focuses the name when it is empty', async () => {
    await render(<GroupGearSection trip={idea()} />);
    await page.getByRole('button', { name: 'Add this item to group gear' }).click();
    expect(packing.add).not.toHaveBeenCalled();
    await expect.element(page.getByLabelText('Group item')).toHaveFocus();
  });

  test('edits label and quantity, and removes an item', async () => {
    packing.items = [tent];
    await render(<GroupGearSection trip={idea()} />);

    const name = page.getByLabelText('Name of Tent');
    await name.fill('Big tent');
    await name.element().blur();
    expect(packing.update).toHaveBeenCalledWith('item-2', { label: 'Big tent' });

    const needed = page.getByLabelText('Needed for Tent');
    await needed.fill('4');
    await needed.element().blur();
    expect(packing.update).toHaveBeenCalledWith('item-2', { quantity: 4 });

    await page.getByRole('button', { name: 'Remove Tent' }).click();
    expect(packing.remove).toHaveBeenCalledWith(tent);
  });

  test('defaults the first assignment to the viewer', async () => {
    packing.items = [tent];
    await render(<GroupGearSection trip={idea()} />);
    await page.getByRole('button', { name: "I'll bring one Tent" }).click();
    expect(packing.bring).toHaveBeenCalledWith('item-2', 'me', 1);
  });

  test('steps a bringer up and down, where zero removes them', async () => {
    packing.items = [
      { ...tent, bringers: [{ count: 1, image: null, name: 'Ana', userId: 'ana' }], brought: 1 }
    ];
    await render(<GroupGearSection trip={idea()} />);
    await page.getByRole('button', { name: 'One more for Ana' }).click();
    expect(packing.bring).toHaveBeenLastCalledWith('item-2', 'ana', 2, 1);
    await page.getByRole('button', { name: 'Remove Ana' }).click();
    expect(packing.bring).toHaveBeenLastCalledWith('item-2', 'ana', 0, 1);
  });

  test('assigns another traveler from the picker', async () => {
    packing.items = [tent];
    await render(<GroupGearSection trip={idea()} />);
    await page.getByRole('button', { name: 'Add a person to bring Tent' }).click();
    await page.getByRole('button', { name: 'Ana', exact: true }).click();
    expect(packing.bring).toHaveBeenCalledWith('item-2', 'ana', 1, 0);
  });

  test('person picker is keyboard operable: Escape closes it and returns focus to the trigger', async () => {
    packing.items = [tent];
    await render(<GroupGearSection trip={idea()} />);
    const trigger = page.getByRole('button', { name: 'Add a person to bring Tent' });
    await trigger.click();
    await expect.element(page.getByRole('dialog', { name: 'Who brings Tent' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect
      .element(page.getByRole('dialog', { name: 'Who brings Tent' }))
      .not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  test('groups each bringer with a spoken name and count, with one live region for the section', async () => {
    packing.items = [hairDryer];
    await render(<GroupGearSection trip={idea()} />);
    await expect.element(page.getByRole('group', { name: 'Ana, 2 of this item' })).toBeVisible();
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
  });

  test('shows the draft notice linking to the changes', async () => {
    await render(<GroupGearSection trip={idea()} />);
    await expect
      .element(page.getByText('Draft: the group sees these changes once this idea is applied'))
      .toBeVisible();
    await page.getByRole('button', { name: 'See changes' }).click();
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ view: 'compare' }) })
    );
  });

  test.each([
    ['in_review', true, 'In review: you can keep editing'],
    ['conflicted', true, 'This idea conflicts with the shared plan'],
    ['closed', false, 'Closed without applying. This gear list is read-only.'],
    ['merged', false, 'Applied to the shared trip. This copy is read-only.'],
    ['draft', false, 'only its author can edit it']
  ])('says what a %s idea means for the gear list', async (status, canEdit, copy) => {
    await render(
      <GroupGearSection
        trip={trip({ permissions: { canEdit }, proposal: { sourceTripId: 'source', status } })}
      />
    );
    await expect.element(page.getByText(copy, { exact: false })).toBeVisible();
  });

  const claimFor = (proposalId: string, label = 'tent') =>
    usePendingGearClaimStore
      .getState()
      .setClaim({ label, proposalId: proposalId as never, sourceTripId: 'source' as never });

  test('applies a pending claim once the idea copy loads', async () => {
    claimFor('proposal-1');
    packing.items = [tent];
    await render(<GroupGearSection trip={idea()} />);
    await vi.waitFor(() => expect(packing.bring).toHaveBeenCalledWith('item-2', 'me', 1));
    expect(usePendingGearClaimStore.getState().claim).toBeNull();
  });

  test('a claim made for another idea is not applied here', async () => {
    claimFor('proposal-other');
    packing.items = [tent];
    await render(<GroupGearSection trip={idea()} />);
    await expect.element(page.getByLabelText('Name of Tent')).toBeVisible();
    expect(packing.bring).not.toHaveBeenCalled();
    expect(usePendingGearClaimStore.getState().claim).not.toBeNull();
  });

  test('an old claim is dropped instead of applied', async () => {
    claimFor('proposal-1');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 120_000);
    try {
      packing.items = [tent];
      await render(<GroupGearSection trip={idea()} />);
      await vi.waitFor(() => expect(usePendingGearClaimStore.getState().claim).toBeNull());
      expect(packing.bring).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test('tells the viewer when the claimed item is not in the idea', async () => {
    claimFor('proposal-1', 'Canoe');
    packing.items = [tent];
    await render(<GroupGearSection trip={idea()} />);
    await vi.waitFor(() => expect(notifications).toHaveBeenCalledWith('Canoe isn’t in this idea'));
    expect(packing.bring).not.toHaveBeenCalled();
  });

  test('a claim on an item the viewer already brings goes from n to n+1', async () => {
    claimFor('proposal-1', 'hair dryer');
    packing.items = [hairDryer];
    await render(<GroupGearSection trip={idea()} />);
    await vi.waitFor(() => expect(packing.bring).toHaveBeenCalledWith('item-1', 'me', 2));
  });

  test('applies nothing while the viewer cannot edit', async () => {
    claimFor('proposal-1');
    packing.items = [tent];
    await render(
      <GroupGearSection
        trip={trip({ permissions: { canEdit: false }, proposal: { sourceTripId: 'source' } })}
      />
    );
    await expect.element(page.getByText('Tent')).toBeVisible();
    expect(packing.bring).not.toHaveBeenCalled();
  });

  test('a view-only idea reads like the shared trip without a start action', async () => {
    packing.items = [hairDryer];
    await render(
      <GroupGearSection
        trip={trip({ permissions: { canEdit: false }, proposal: { sourceTripId: 'source' } })}
      />
    );
    await expect.element(page.getByText('You 1 · Ana 2')).toBeVisible();
    await expect.element(page.getByRole('textbox')).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Suggest gear changes' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: /I'll bring one/u }))
      .not.toBeInTheDocument();
  });
});

describe('GroupGearSection claim action on covered rows', () => {
  test('keeps an accessible name when the label is visually hidden on narrow screens', async () => {
    packing.items = [hairDryer];
    await render(<GroupGearSection onStartPackingIdea={vi.fn()} trip={trip()} />);
    await expect
      .element(page.getByRole('button', { name: 'Bring one more Hair dryer' }))
      .toBeVisible();
  });
});
