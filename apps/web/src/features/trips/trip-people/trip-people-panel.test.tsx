import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { testIds } from '@/lib/test-ids';
import { TripPeoplePanel } from './trip-people-panel';

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ session: { user: { id: 'user-alex' } } })
}));

const roster = vi.hoisted(() => ({
  /** Re-renders the panel after a test changes `travelers`, as a live query would. */
  refresh: (() => undefined) as () => void,
  isLoading: false,
  setStatus: vi.fn(),
  travelers: [] as Array<Record<string, unknown>>
}));

vi.mock('@/features/trips/hooks/use-trip-travelers', async () => {
  const { useState } = await import('react');
  return {
    useTripTravelers: () => {
      const [, setTick] = useState(0);
      roster.refresh = () => setTick((tick) => tick + 1);
      return {
        goingCount: roster.travelers.filter((entry) => entry.status === 'going').length,
        isLoading: roster.isLoading,
        setStatus: roster.setStatus,
        travelers: roster.travelers
      };
    }
  };
});

const payments = vi.hoisted(() => ({
  archived: false,
  checkout: vi.fn(),
  enabled: true,
  isLoading: false,
  travelers: [] as Array<{ free: boolean; paid: boolean; userId: string }>
}));

vi.mock('@/features/trips/hooks/use-trip-payments', () => ({
  useTripPayments: () => payments
}));

function traveler(name: string, status: string) {
  const id = `user-${name.toLowerCase()}`;
  return { handle: `@${name.toLowerCase()}`, id, image: null, name, status, userId: id };
}

function mount(overrides: Partial<TripDetail> = {}) {
  const trip = {
    archivedAt: null,
    currency: 'USD',
    id: 'trip-1',
    name: 'Lisbon escape',
    role: 'member',
    totalPlannedCost: 0,
    travelerCount: 2,
    ...overrides
  } as unknown as TripDetail;
  return render(<TripPeoplePanel trip={trip} />);
}

/** A roster mock whose `setStatus` really moves the person, like the live query would. */
function movingSetStatus() {
  roster.setStatus = vi.fn().mockImplementation((status: string, userId: string) => {
    roster.travelers = roster.travelers.map((entry) =>
      entry.userId === userId ? { ...entry, status } : entry
    );
    roster.refresh();
    return Promise.resolve(true);
  });
}

const group = (name: string) => page.getByRole('region', { name, exact: true });
const rsvp = (name: string) =>
  page.getByRole('radiogroup', { name: 'Your RSVP' }).getByRole('radio', { name, exact: true });

const opener = (name: string) => page.getByRole('button', { name: new RegExp(`^${name}\\b`, 'u') });
const card = () => page.getByRole('dialog');
const choices = (name: string) => page.getByRole('radiogroup', { name: `RSVP for ${name}` });
const choice = (name: string, label: string) =>
  choices(name).getByRole('radio', { name: label, exact: true });

beforeEach(async () => {
  await useViewport(1440, 900);
  roster.isLoading = false;
  roster.setStatus = vi.fn().mockResolvedValue(true);
  roster.travelers = [
    traveler('Maya', 'going'),
    traveler('Alex', 'going'),
    traveler('Sam', 'invited'),
    traveler('Lee', 'maybe'),
    traveler('Pat', 'not_going')
  ];
  payments.archived = false;
  payments.enabled = true;
  payments.checkout = vi.fn().mockResolvedValue({ url: null });
  payments.travelers = [
    { free: true, paid: false, userId: 'user-maya' },
    { free: false, paid: true, userId: 'user-alex' },
    { free: false, paid: false, userId: 'user-sam' },
    { free: false, paid: true, userId: 'user-lee' }
  ];
});

test('lays the roster out as the manifest, each person once', async () => {
  await mount();
  await expect.element(page.getByTestId(testIds.tripPeoplePanel)).toBeVisible();
  await expect.element(group('Cleared').getByText('Alex')).toBeVisible();
  await expect.element(group('Cleared').getByText('Maya')).toBeVisible();
  await expect.element(group('Blocked').getByText('Sam')).toBeVisible();
  await expect.element(group('Deciding').getByText('Lee')).toBeVisible();
  await expect.element(group('Not going').getByText(/Pat/u)).toBeVisible();
  expect(page.getByText('Sam', { exact: true }).elements()).toHaveLength(1);
});

test('puts you first in your group and marks you', async () => {
  await mount();
  const cells = group('Cleared').getByRole('listitem');
  await expect.poll(() => cells.nth(0).element().textContent).toContain('Alex');
  await expect.poll(() => cells.nth(0).element().textContent).toContain('You');
  await expect.poll(() => cells.nth(1).element().textContent).toContain('Maya');
});

test('omits groups nobody is in', async () => {
  roster.travelers = [traveler('Alex', 'going')];
  await mount();
  await expect.element(group('Cleared')).toBeVisible();
  await expect.element(group('Blocked')).not.toBeInTheDocument();
  await expect.element(group('Deciding')).not.toBeInTheDocument();
  await expect.element(group('Not going')).not.toBeInTheDocument();
});

test.each([
  ['going', 'You’re going'],
  ['invited', 'You said yes — your seat is next'],
  ['maybe', 'You’re a maybe'],
  ['not_going', 'You’re not going']
])('your pass says where you stand when %s', async (status, title) => {
  roster.travelers = [traveler('Alex', status), traveler('Maya', 'going')];
  await mount();
  await expect.element(page.getByRole('heading', { name: title })).toBeVisible();
});

test('has no pass when the viewer is not on the roster', async () => {
  roster.travelers = [traveler('Maya', 'going')];
  await mount();
  await expect.element(page.getByRole('radiogroup', { name: 'Your RSVP' })).not.toBeInTheDocument();
});

test('your RSVP is a radio group with yours checked, changed by picking another', async () => {
  await mount();
  await expect.element(rsvp('Going')).toBeChecked();
  await rsvp('Not going').click();
  expect(roster.setStatus).toHaveBeenCalledWith('not_going', 'user-alex');
});

test('Going waits for your seat', async () => {
  roster.travelers = [traveler('Alex', 'invited')];
  payments.travelers = [{ free: false, paid: false, userId: 'user-alex' }];
  await mount();
  await expect.element(rsvp('Going')).toBeDisabled();
  await expect.element(rsvp('Maybe')).toBeEnabled();
  await expect.element(page.getByText('€1 due')).toBeVisible();
  await expect
    .element(
      page
        .getByRole('region', { name: 'Your pass' })
        .getByRole('button', { name: 'Pay €1 for your trip access' })
    )
    .toBeVisible();
});

test('the seat stub says Free for the creator’s seat', async () => {
  payments.travelers = [{ free: true, paid: false, userId: 'user-alex' }];
  await mount();
  await expect.element(page.getByText('Free', { exact: true })).toBeVisible();
  await expect.element(page.getByText('You created the trip')).toBeVisible();
});

test('the seat stub says Paid once your seat is paid', async () => {
  await mount();
  await expect.element(page.getByText('Paid', { exact: true })).toBeVisible();
});

test('the seat stub is left out when the trip takes no payments', async () => {
  payments.enabled = false;
  await mount();
  await expect.element(page.getByText('Your seat', { exact: true })).not.toBeInTheDocument();
});

test('every person opens a card with their name, handle and status; members see no choices', async () => {
  await mount();
  await opener('Maya').click();
  await expect.element(card()).toBeVisible();
  await expect.element(card().getByText('Maya', { exact: true })).toBeVisible();
  await expect.element(card().getByText(/Cleared to go · @maya/u)).toBeVisible();
  await expect.element(card().getByText('Going', { exact: true })).toBeVisible();
  await expect.element(card().getByText('Free', { exact: true })).toBeVisible();
  await expect.element(card().getByRole('radiogroup')).not.toBeInTheDocument();
});

test('the card names who needs a seat, maybe and not going', async () => {
  await mount();
  await opener('Sam').click();
  await expect.element(card().getByText('Needs a seat', { exact: true })).toBeVisible();
  await expect.element(card().getByText('€1 due')).toBeVisible();
});

test('your own entry opens a card too, tagged You, with your choices when you can change them', async () => {
  await mount();
  await opener('Alex').click();
  await expect.element(card().getByText('You', { exact: true })).toBeVisible();
  await expect.element(card().getByText('Paid', { exact: true })).toBeVisible();
  await expect.element(choices('Alex')).toBeVisible();
  await expect.element(choice('Alex', 'Going')).toHaveAttribute('aria-checked', 'true');
  await expect.element(card().getByText('Cleared · seat paid')).toBeVisible();
});

test('an organizer gets choices for anyone, with the current one checked', async () => {
  await mount({ role: 'organizer' });
  await opener('Maya').click();
  await expect.element(choice('Maya', 'Going')).toHaveAttribute('aria-checked', 'true');
  await expect.element(choice('Maya', 'Maybe')).toHaveAttribute('aria-checked', 'false');
  await expect.element(card().getByText('Cleared · free seat')).toBeVisible();
  await expect.element(card().getByText('Off this trip, still in the group')).toBeVisible();
  await expect.element(card().getByText('Moves to Deciding (2)')).toBeVisible();
});

test('choosing Not going saves and closes the card', async () => {
  await mount({ role: 'organizer' });
  await opener('Maya').click();
  await choice('Maya', 'Not going').click();
  expect(roster.setStatus).toHaveBeenCalledWith('not_going', 'user-maya');
  await expect.element(card()).not.toBeInTheDocument();
  await expect.element(opener('Maya')).toHaveFocus();
});

test('a failed change keeps the card open', async () => {
  roster.setStatus = vi.fn().mockResolvedValue(false);
  await mount({ role: 'organizer' });
  await opener('Maya').click();
  await choice('Maya', 'Maybe').click();
  expect(roster.setStatus).toHaveBeenCalledWith('maybe', 'user-maya');
  await expect.element(card()).toBeVisible();
  await expect
    .element(card().getByRole('alert'))
    .toHaveTextContent('Couldn’t change Maya’s answer. Try again.');
  await expect.element(choice('Maya', 'Going')).toHaveAttribute('aria-checked', 'true');
});

test('while a change saves the other choices wait', async () => {
  roster.setStatus = vi.fn().mockReturnValue(new Promise(() => undefined));
  await mount({ role: 'organizer' });
  await opener('Maya').click();
  await choice('Maya', 'Maybe').click();
  await expect.element(choice('Maya', 'Maybe')).toHaveAttribute('aria-checked', 'true');
  await expect.element(choice('Maya', 'Going')).toHaveAttribute('aria-checked', 'false');
  await expect.element(page.getByRole('status', { name: 'Saving' })).toBeVisible();
  await expect.element(choice('Maya', 'Not going')).toHaveAttribute('aria-disabled', 'true');
  (choice('Maya', 'Not going').element() as HTMLElement).click();
  expect(roster.setStatus).toHaveBeenCalledTimes(1);
});

test('arrow keys move through the choices without saving', async () => {
  await mount({ role: 'organizer' });
  await opener('Maya').click();
  (choice('Maya', 'Going').element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(choice('Maya', 'Maybe')).toHaveFocus();
  expect(roster.setStatus).not.toHaveBeenCalled();
});

test('someone without a seat cannot be set to going', async () => {
  await mount({ role: 'organizer' });
  await opener('Sam').click();
  await expect.element(choice('Sam', 'Going')).toBeDisabled();
  await expect.element(choice('Sam', 'Going')).toHaveAttribute('aria-checked', 'true');
  await expect.element(card().getByText('Said yes · waiting on a €1 seat')).toBeVisible();
  await expect.element(choice('Sam', 'Maybe')).toBeEnabled();
});

test('Going says which place it would take among those cleared', async () => {
  await mount({ role: 'organizer' });
  await opener('Lee').click();
  await expect.element(card().getByText('Becomes the 3rd cleared')).toBeVisible();
});

test('an organizer covers a seat right on the row', async () => {
  await mount({ role: 'organizer' });
  await expect.element(group('Blocked').getByText(/€1 seat isn’t paid/u)).toBeVisible();
  await group('Blocked').getByRole('button', { name: 'Cover €1 for Sam' }).click();
  expect(payments.checkout).toHaveBeenCalledWith('user-sam');
  await expect
    .element(page.getByText('No payment is needed. Your trip status will update automatically.'))
    .toBeVisible();
});

test('Cover €1 inside the card opens checkout, for a yes or a maybe without a seat', async () => {
  payments.travelers = payments.travelers.filter((payment) => payment.userId !== 'user-lee');
  await mount({ role: 'organizer' });
  await expect
    .element(group('Deciding').getByRole('button', { name: /Cover €1/u }))
    .not.toBeInTheDocument();
  await opener('Lee').click();
  await card().getByRole('button', { name: 'Cover €1 for Lee' }).click();
  expect(payments.checkout).toHaveBeenCalledWith('user-lee');
});

test('a member cannot cover a seat in the card', async () => {
  await mount();
  await opener('Sam').click();
  await expect.element(card().getByRole('button', { name: /Cover €1/u })).not.toBeInTheDocument();
});

test('your own Blocked row never offers Pay on the row; your card does', async () => {
  roster.travelers = [traveler('Alex', 'invited'), traveler('Sam', 'invited')];
  payments.travelers = [];
  await mount();
  await expect
    .element(group('Blocked').getByRole('button', { name: /Pay €1/u }))
    .not.toBeInTheDocument();
  await expect
    .element(group('Your pass').getByRole('button', { name: 'Pay €1 for your trip access' }))
    .toBeVisible();
  await opener('Alex').click();
  await card().getByRole('button', { name: 'Pay €1 for your trip access' }).click();
  expect(payments.checkout).toHaveBeenCalledWith('user-alex');
});

test('while one checkout opens, the other seat buttons wait', async () => {
  roster.travelers = [
    traveler('Alex', 'going'),
    traveler('Sam', 'invited'),
    traveler('Kim', 'invited')
  ];
  payments.travelers = [{ free: false, paid: true, userId: 'user-alex' }];
  payments.checkout = vi.fn().mockReturnValue(new Promise(() => undefined));
  await mount({ role: 'organizer' });
  await page.getByRole('button', { name: 'Cover €1 for Sam' }).click();
  await expect
    .element(page.getByRole('button', { name: 'Cover €1 for Sam' }))
    .toHaveAttribute('aria-busy', 'true');
  await expect.element(page.getByRole('button', { name: 'Cover €1 for Kim' })).toBeDisabled();
});

test('the card leaves the seat line out when the trip takes no payments', async () => {
  payments.enabled = false;
  await mount({ role: 'organizer' });
  await opener('Maya').click();
  await expect.element(card().getByText('Seat', { exact: true })).not.toBeInTheDocument();
  await expect.element(choice('Maya', 'Going')).toBeEnabled();
});

test('on a phone a person opens as a bottom sheet titled with their name', async () => {
  await useViewport(390, 844);
  await mount({ role: 'organizer' });
  await opener('Maya').click();
  await expect.element(card()).toHaveAttribute('data-slot', 'sheet-content');
  await expect.element(card().getByRole('heading', { name: 'Maya' })).toBeVisible();
  await expect.element(choices('Maya')).toBeVisible();
});

test('on your pass arrows move focus and Space saves, like the person card', async () => {
  await mount();
  (rsvp('Going').element() as HTMLElement).focus();
  await userEvent.keyboard('{ArrowRight}');
  await expect.element(rsvp('Maybe')).toHaveFocus();
  expect(roster.setStatus).not.toHaveBeenCalled();
  await userEvent.keyboard(' ');
  expect(roster.setStatus).toHaveBeenCalledWith('maybe', 'user-alex');
});

test('the pass names the place, and what to do next', async () => {
  await mount({ destination: { name: 'Lisbon', status: 'known' } } as Partial<TripDetail>);
  await expect.element(page.getByRole('heading', { name: 'You’re going to Lisbon' })).toBeVisible();
  await expect.element(page.getByText('Change your answer any time.')).toBeVisible();
});

test('the pass copy follows the trip: seat first, organizer, no payments, archived', async () => {
  roster.travelers = [traveler('Alex', 'invited')];
  payments.travelers = [];
  await mount();
  await expect.element(page.getByText('Pay your €1 seat and you’re going.')).toBeVisible();
  roster.travelers = [traveler('Alex', 'maybe')];
  await mount();
  await expect.element(page.getByText('Going needs your €1 seat first.')).toBeVisible();
  payments.enabled = false;
  roster.travelers = [traveler('Alex', 'going')];
  await mount({ role: 'organizer' });
  await expect.element(page.getByText('Organizer · you can move anyone.')).toBeVisible();
  await mount({ archivedAt: 1 });
  await expect.element(page.getByText('This trip is archived.')).toBeVisible();
  await expect.element(page.getByText('Change your answer any time.')).not.toBeInTheDocument();
});

test('a member waits on someone else’s seat without a cover button', async () => {
  await mount();
  await expect.element(group('Blocked').getByText('Waiting on their seat')).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Cover €1/u })).not.toBeInTheDocument();
});

test('says when checkout cannot open', async () => {
  payments.checkout = vi.fn().mockRejectedValue(new Error('Stripe is down'));
  await mount({ role: 'organizer' });
  await page.getByRole('button', { name: 'Cover €1 for Sam' }).click();
  await expect.element(page.getByRole('alert')).toHaveTextContent('Stripe is down');
});

test('a maybe who already paid says so', async () => {
  await mount();
  await expect.element(group('Deciding').getByText('Seat already paid')).toBeVisible();
});

test('Not going is one line that Show expands into rows', async () => {
  await mount({ role: 'organizer' });
  await expect.poll(() => group('Not going').element().textContent).toContain('Not going · Pat');
  await expect.element(opener('Pat')).not.toBeInTheDocument();
  await group('Not going').getByRole('button', { name: 'Show' }).click();
  await opener('Pat').click();
  await expect.element(choice('Pat', 'Not going')).toHaveAttribute('aria-checked', 'true');
  await userEvent.keyboard('{Escape}');
  await group('Not going').getByRole('button', { name: 'Hide' }).click();
  await expect.element(opener('Pat')).not.toBeInTheDocument();
});

test('an archived trip is read-only, says so once, and locks every control', async () => {
  await mount({ archivedAt: 1, role: 'organizer' });
  await expect
    .element(page.getByText(/RSVPs and payments are read-only until it is restored/u))
    .toBeVisible();
  await opener('Maya').click();
  await expect.element(card().getByText('This trip is archived.')).toBeVisible();
  await expect.element(card().getByRole('radiogroup')).not.toBeInTheDocument();
  await expect.element(rsvp('Maybe')).toBeDisabled();
  await expect.element(page.getByRole('button', { name: /Cover €1/u })).not.toBeInTheDocument();
});

test('an active trip does not claim to be read-only', async () => {
  await mount();
  await expect.element(page.getByText(/read-only/u)).not.toBeInTheDocument();
});

test('has no Invite to group of its own; the section header owns it', async () => {
  await mount({ role: 'organizer' });
  await expect.element(page.getByTestId(testIds.tripPeopleInvite)).not.toBeInTheDocument();
});

test('headlines readiness and the plan’s cost per traveler', async () => {
  await mount({ totalPlannedCost: 3000, travelerCount: 2 });
  await expect
    .poll(() => page.getByTestId(testIds.tripPeopleSummary).element().textContent)
    .toMatch(/2 of 5 cleared to go\s*· 1 blocked · 1 deciding · 1 out/u);
  await expect.element(page.getByText('≈ $1,500 planned per traveler')).toBeVisible();
  await expect
    .element(page.getByText('Everyone going needs a €1 seat. Checkout opens on Stripe.'))
    .toBeVisible();
});

test('without payments nobody is blocked and “cleared” reads “going”', async () => {
  payments.enabled = false;
  roster.travelers = [traveler('Alex', 'going'), traveler('Lee', 'maybe')];
  await mount();
  await expect
    .poll(() => page.getByTestId(testIds.tripPeopleSummary).element().textContent)
    .toMatch(/1 of 2 going\s*· 1 deciding/u);
  await expect.element(group('Going')).toBeVisible();
  await expect.element(group('Blocked')).not.toBeInTheDocument();
  await expect.element(page.getByText(/Checkout opens on Stripe/u)).not.toBeInTheDocument();
});

test('says nothing about cost when none is planned or nobody is going', async () => {
  await mount({ totalPlannedCost: 0 });
  await expect.element(page.getByText(/planned per traveler/u)).not.toBeInTheDocument();
  await mount({ totalPlannedCost: 3000, travelerCount: 0 });
  await expect.element(page.getByText(/planned per traveler/u)).not.toBeInTheDocument();
});

test('shows a loading state while the roster loads', async () => {
  roster.isLoading = true;
  roster.travelers = [];
  await mount();
  await expect.element(page.getByRole('status', { name: 'Loading travelers…' })).toBeVisible();
  await expect.element(page.getByRole('radiogroup')).not.toBeInTheDocument();
});

test('shows an empty state when nobody is on the roster', async () => {
  roster.travelers = [];
  await mount();
  await expect.element(page.getByText('No travelers yet')).toBeVisible();
  await expect.element(group('Cleared')).not.toBeInTheDocument();
});

test('on a phone the pass and every group still render', async () => {
  await useViewport(390, 844);
  await mount();
  await expect.element(rsvp('Going')).toBeVisible();
  await expect.element(group('Blocked')).toBeVisible();
  await expect.element(group('Deciding')).toBeVisible();
  await expect.element(group('Cleared').getByText('Maya')).toBeVisible();
  await expect.element(group('Not going')).toBeVisible();
});

test('a person moved to an open group takes focus there and is announced', async () => {
  movingSetStatus();
  await mount({ role: 'organizer' });
  await opener('Maya').click();
  await choice('Maya', 'Maybe').click();
  await expect.element(card()).not.toBeInTheDocument();
  await expect.element(group('Deciding').getByText('Maya')).toBeVisible();
  await expect.element(opener('Maya')).toHaveFocus();
  await expect
    .element(page.getByRole('status').first())
    .toHaveTextContent('Maya moved to Deciding');
});

test('a person moved to the folded Not going group unfolds it and takes focus', async () => {
  movingSetStatus();
  await mount({ role: 'organizer' });
  await expect.element(opener('Maya')).toBeVisible();
  await opener('Maya').click();
  await choice('Maya', 'Not going').click();
  await expect.element(group('Not going').getByRole('button', { name: 'Hide' })).toBeVisible();
  await expect.element(opener('Maya')).toHaveFocus();
  await expect.element(group('Not going').getByText('Maya')).toBeVisible();
});

test('arrows skip a Going that is not available', async () => {
  await mount({ role: 'organizer' });
  await opener('Sam').click();
  await expect.element(choice('Sam', 'Maybe')).toHaveFocus();
  await userEvent.keyboard('{ArrowUp}');
  await expect.element(choice('Sam', 'Not going')).toHaveFocus();
  await userEvent.keyboard('{ArrowDown}');
  await expect.element(choice('Sam', 'Maybe')).toHaveFocus();
  expect(roster.setStatus).not.toHaveBeenCalled();
});

test('opening a card focuses the RSVP group, not the payment button', async () => {
  await mount({ role: 'organizer' });
  await opener('Sam').click();
  await expect.element(card().getByRole('button', { name: 'Cover €1 for Sam' })).toBeVisible();
  await expect.element(choice('Sam', 'Maybe')).toHaveFocus();
  await userEvent.keyboard('{Escape}');
  await opener('Maya').click();
  await expect.element(choice('Maya', 'Going')).toHaveFocus();
});

test('on a phone a failed change says so inside the sheet, which has a Done button', async () => {
  await useViewport(390, 844);
  roster.setStatus = vi.fn().mockResolvedValue(false);
  await mount({ role: 'organizer' });
  await opener('Maya').click();
  await choice('Maya', 'Maybe').click();
  await expect
    .element(card().getByRole('alert'))
    .toHaveTextContent('Couldn’t change Maya’s answer. Try again.');
  await card().getByRole('button', { name: 'Done' }).click();
  await expect.element(card()).not.toBeInTheDocument();
});

test('a yes without a seat is Going, checked but held, on the pass and in the card', async () => {
  roster.travelers = [traveler('Alex', 'invited'), traveler('Maya', 'going')];
  payments.travelers = [{ free: true, paid: false, userId: 'user-maya' }];
  await mount();
  await expect.element(rsvp('Going')).toHaveAttribute('aria-checked', 'true');
  await expect.element(rsvp('Going')).toBeDisabled();
  await opener('Alex').click();
  await expect.element(choice('Alex', 'Going')).toHaveAttribute('aria-checked', 'true');
  await expect.element(choice('Alex', 'Going')).toBeDisabled();
  await expect.element(card().getByText('Said yes · waiting on a €1 seat')).toBeVisible();
  await expect.element(choice('Alex', 'Maybe')).toBeEnabled();
  await card().getByRole('button', { name: 'Pay €1 for your trip access' }).click();
  expect(payments.checkout).toHaveBeenCalledWith('user-alex');
});

test('a maybe without a seat has Going faded with its reason readable and Cover in the row', async () => {
  payments.travelers = payments.travelers.filter((payment) => payment.userId !== 'user-lee');
  await mount({ role: 'organizer' });
  await opener('Lee').click();
  await expect.element(choice('Lee', 'Going')).toBeDisabled();
  await expect.element(choice('Lee', 'Going')).toHaveAttribute('aria-checked', 'false');
  await expect.element(card().getByText('Opens once their €1 seat is paid')).toBeVisible();
});

test('a member sees why they cannot change someone, in one muted line', async () => {
  await mount();
  await opener('Maya').click();
  await expect.element(card().getByText('Only organizers can change Maya’s answer.')).toBeVisible();
  await expect.element(card().getByRole('radiogroup')).not.toBeInTheDocument();
});

test('the readiness strip draws one face per person and says the counts once', async () => {
  await mount();
  const strip = page.getByRole('img', {
    name: 'The group: 2 cleared to go, 1 blocked, 1 deciding, 1 out'
  });
  await expect.element(strip).toBeVisible();
  expect(strip.element().querySelectorAll('[data-slot="avatar"]')).toHaveLength(5);
});

test('past sixty people the strip gives way to the bar', async () => {
  roster.travelers = Array.from({ length: 61 }, (_, index) => traveler(`Guest${index}`, 'going'));
  await mount();
  await expect.element(page.getByRole('img', { name: /^The group/u })).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('region', { name: 'Readiness' }))
    .toHaveTextContent('61 of 61 cleared to go61 cleared');
});

test('the pass shows the trip’s dates and length under the title', async () => {
  await mount({ dateNotes: 'Early June', totalDurationDays: 5 } as Partial<TripDetail>);
  await expect
    .element(page.getByRole('region', { name: 'Your pass' }).getByText('Early June · 5 days'))
    .toBeVisible();
});
