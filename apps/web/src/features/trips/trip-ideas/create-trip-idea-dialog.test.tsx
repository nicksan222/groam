import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CreateTripIdeaDialog } from '@/features/trips/trip-ideas/create-trip-idea-dialog';

afterEach(cleanup);

test('explains that starting an idea creates private work from the shared trip', () => {
  render(
    <CreateTripIdeaDialog
      isCreating={false}
      onCreate={vi.fn()}
      onOpenChange={vi.fn()}
      open
      sharedTripName="Atlantic week"
    />
  );

  expect(screen.getByRole('heading', { name: 'New idea' })).toBeTruthy();
  expect(screen.getByText(/idea from the shared trip/u)).toBeTruthy();
  expect(screen.getByText(/reviewed and applied/u)).toBeTruthy();
  expect(screen.getByText('Atlantic week')).toBeTruthy();
  expect(screen.getByText('Everyone sees this')).toBeTruthy();
  expect(screen.getByText('Edit here')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Create idea' })).toBeTruthy();
});

test('submits an optional custom idea name', async () => {
  const onCreate = vi.fn().mockResolvedValue(undefined);
  render(
    <CreateTripIdeaDialog isCreating={false} onCreate={onCreate} onOpenChange={vi.fn()} open />
  );

  fireEvent.change(screen.getByLabelText('What do you want to change?'), {
    target: { value: '  Coastal route  ' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create idea' }));

  await waitFor(() => expect(onCreate).toHaveBeenCalledWith('Coastal route'));
});

test('requests an automatically generated name when left blank', async () => {
  const onCreate = vi.fn().mockResolvedValue(undefined);
  render(
    <CreateTripIdeaDialog isCreating={false} onCreate={onCreate} onOpenChange={vi.fn()} open />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Create idea' }));

  await waitFor(() => expect(onCreate).toHaveBeenCalledWith(undefined));
});

test('keeps the dialog open while an idea is being created', () => {
  const onOpenChange = vi.fn();
  render(<CreateTripIdeaDialog isCreating onCreate={vi.fn()} onOpenChange={onOpenChange} open />);

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(onOpenChange).not.toHaveBeenCalled();
});

test('does not mistake trips still loading for an empty group', () => {
  render(
    <CreateTripIdeaDialog
      isCreating={false}
      onCreate={vi.fn()}
      onOpenChange={vi.fn()}
      onSelectedTripIdChange={vi.fn()}
      open
      trips={[]}
      tripsLoading
    />
  );
  expect(screen.getByText('Loading trips…')).toBeTruthy();
  expect(screen.queryByText('Start with a trip')).toBeNull();
  expect(screen.getByRole('button', { name: 'Create idea' }).hasAttribute('disabled')).toBe(true);
});
