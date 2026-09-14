import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CreateTripDialog } from '@/features/trips/trip-create/create-trip-dialog';

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({
    activeOrganization: {
      members: [
        { user: { name: 'Alex' }, userId: 'user-alex' },
        { user: { name: 'Maya' }, userId: 'user-maya' },
        ...Array.from({ length: 28 }, (_, index) => ({
          user: { name: `Traveler ${index + 1}` },
          userId: `traveler-${index + 1}`
        }))
      ]
    },
    session: { user: { id: 'user-alex' } }
  })
}));

vi.mock('@/features/workspace/workspace-shell/workspace-dialog-state', () => ({
  useWorkspaceDialogs: () => ({ openDialog: vi.fn() })
}));

vi.mock('@groam/ui/components/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

afterEach(cleanup);

test('omits the cover image field from create trip', () => {
  render(<CreateTripDialog createTrip={vi.fn()} onClose={vi.fn()} onCreated={vi.fn()} />);

  expect(screen.queryByLabelText(/cover image/iu)).toBeNull();
  expect(screen.queryByText(/find a location photo/iu)).toBeNull();
  expect(screen.queryByTestId('create-trip-cover')).toBeNull();
});

test('groups related fields under where, when, money, and people sections', () => {
  render(<CreateTripDialog createTrip={vi.fn()} onClose={vi.fn()} onCreated={vi.fn()} />);

  expect(screen.getByRole('heading', { name: 'Where' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'When' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Money' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Who’s coming' })).toBeTruthy();
  expect(screen.getByText('Alex (you)')).toBeTruthy();
  expect(screen.getByText('Maya')).toBeTruthy();
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.getByRole('button', { name: 'Invite to this group' })).toBeTruthy();
  expect(screen.getByLabelText(/trip name/iu)).toBeTruthy();
  expect(screen.getByLabelText(/start date/iu)).toBeTruthy();
  expect(screen.getByLabelText(/length \(days\)/iu)).toBeTruthy();
  expect(screen.getByLabelText(/if dates are still open/iu)).toBeTruthy();
  expect(screen.getByLabelText(/default currency/iu)).toBeTruthy();
  expect(screen.getByLabelText(/total group budget/iu)).toBeTruthy();
});

test('keeps create disabled until a trip name is entered', () => {
  render(<CreateTripDialog createTrip={vi.fn()} onClose={vi.fn()} onCreated={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'Create trip' })).toHaveProperty('disabled', true);

  fireEvent.change(screen.getByLabelText(/trip name/iu), {
    target: { value: 'Summer beach trip' }
  });

  expect(screen.getByRole('button', { name: 'Create trip' })).toHaveProperty('disabled', false);
});

test('creates a trip without a cover file', async () => {
  const createTrip = vi.fn().mockResolvedValue('trip_123');
  const onCreated = vi.fn();
  render(<CreateTripDialog createTrip={createTrip} onClose={vi.fn()} onCreated={onCreated} />);

  fireEvent.change(screen.getByLabelText(/trip name/iu), {
    target: { value: 'Coast weekend' }
  });
  fireEvent.change(screen.getByLabelText(/if dates are still open/iu), {
    target: { value: 'Late July' }
  });
  fireEvent.change(screen.getByLabelText(/length \(days\)/iu), {
    target: { value: '8' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create trip' }));

  await waitFor(() => expect(createTrip).toHaveBeenCalledTimes(1));
  const [input, cover] = createTrip.mock.calls[0] as [
    {
      dateNotes?: string;
      duration?: { totalDays: number };
      name: string;
    },
    File | null
  ];
  expect(cover).toBeNull();
  expect(input.name).toBe('Coast weekend');
  expect(input.dateNotes).toBe('Late July');
  expect(input.duration).toEqual({ totalDays: 8 });
  expect(onCreated).toHaveBeenCalledWith('trip_123');
});

test('shows every group member in a compact traveler list', () => {
  render(<CreateTripDialog createTrip={vi.fn()} onClose={vi.fn()} onCreated={vi.fn()} />);

  expect(screen.getByText('Traveler 1')).toBeTruthy();
  expect(screen.getByText('Traveler 28')).toBeTruthy();
  expect(screen.getAllByTestId('create-trip-traveler')).toHaveLength(30);
  expect(screen.queryByText(/more$/u)).toBeNull();
  expect(screen.getByText('Shared with your group. Confirm travelers later.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'No length preset' })).toBeNull();
});
