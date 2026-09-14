import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type {
  IdeaRebaseConflict,
  IdeaRebaseResult
} from '@/features/trips/hooks/use-idea-rebase-reconciliation';
import { IdeaRebaseReconciliation } from '@/features/trips/trip-ideas/idea-rebase-reconciliation';

afterEach(cleanup);

const conflicts: IdeaRebaseConflict[] = [
  {
    currentFields: ['name'],
    currentSummary: 'Name: Shared Lisbon',
    entity: 'details',
    key: 'trip.json',
    label: 'Trip details',
    proposedFields: ['name'],
    proposedSummary: 'Name: Idea Lisbon'
  },
  {
    currentFields: ['notes'],
    currentSummary: 'Notes: Keep the ferry',
    entity: 'destination',
    key: 'destinations/lisbon.json',
    label: 'Lisbon',
    proposedFields: ['notes'],
    proposedSummary: 'Notes: Add a coast day'
  }
];

function renderRebase({
  canRebase = true,
  onRebase,
  sourceChanged = true,
  status = 'in_review'
}: {
  canRebase?: boolean;
  onRebase: () => Promise<IdeaRebaseResult | null>;
  sourceChanged?: boolean;
  status?: 'conflicted' | 'in_review';
}) {
  return render(
    <IdeaRebaseReconciliation
      canRebase={canRebase}
      disabled={false}
      onRebase={onRebase}
      pending={false}
      sourceChanged={sourceChanged}
      status={status}
    />
  );
}

test('shows a compact entry without a tinted wash when the shared trip moved', () => {
  renderRebase({
    onRebase: vi.fn().mockResolvedValue({ kind: 'applied' })
  });

  expect(screen.getByText('The shared trip has changed since you started')).toBeTruthy();
  const button = screen.getByRole('button', { name: 'Update from shared trip' });
  expect(button).toBeTruthy();
  expect(button).toHaveProperty('disabled', false);
  expect(
    screen.queryByText('Only the idea author or a group organizer can update this idea.')
  ).toBeNull();
  expect(button.className).not.toMatch(/bg-amber|bg-chart-4|bg-destructive/);
  expect(button.closest('section')?.className).not.toMatch(
    /bg-amber|bg-destructive\/5|bg-primary\/5/
  );
});

test('disables update for viewers who cannot change the idea', () => {
  renderRebase({
    canRebase: false,
    onRebase: vi.fn()
  });

  expect(screen.getByRole('button', { name: 'Update from shared trip' })).toHaveProperty(
    'disabled',
    true
  );
  expect(
    screen.getByText('Only the idea author or a group organizer can update this idea.')
  ).toBeTruthy();
});

test('uses a primary action when the idea already conflicts', () => {
  renderRebase({
    onRebase: vi.fn(),
    sourceChanged: false,
    status: 'conflicted'
  });

  expect(screen.getByText('The shared trip has changed since you started')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Update from shared trip' })).toBeTruthy();
});

test('fast-forwards without opening the screen when nothing remains to choose', async () => {
  const onRebase = vi.fn().mockResolvedValue({ kind: 'applied' });
  renderRebase({ onRebase });

  fireEvent.click(screen.getByRole('button', { name: 'Update from shared trip' }));
  await waitFor(() => {
    expect(onRebase).toHaveBeenCalledWith();
  });
  expect(screen.queryByText('Update your idea')).toBeNull();
});

test('shows every overlap at once and applies keep-theirs then keep-yours', async () => {
  const onRebase = vi
    .fn()
    .mockResolvedValueOnce({ conflicts, kind: 'needs_choices' })
    .mockResolvedValueOnce({ kind: 'applied' });
  renderRebase({ onRebase });

  fireEvent.click(screen.getByRole('button', { name: 'Update from shared trip' }));
  await waitFor(() => {
    expect(screen.getByText('Choose what to keep')).toBeTruthy();
  });
  expect(screen.getByText('Trip details')).toBeTruthy();
  expect(screen.getByText('Lisbon')).toBeTruthy();

  const takeTheirs = screen.getAllByRole('button', { name: 'Keep shared trip' });
  const keepYours = screen.getAllByRole('button', { name: 'Keep my idea' });
  fireEvent.click(takeTheirs[0]!);
  fireEvent.click(keepYours[1]!);
  fireEvent.click(screen.getByRole('button', { name: 'Update idea' }));

  await waitFor(() => {
    expect(onRebase).toHaveBeenLastCalledWith([
      { choice: 'current', path: 'trip.json' },
      { choice: 'proposed', path: 'destinations/lisbon.json' }
    ]);
  });
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Update from shared trip' })).toBeTruthy();
  });
});

test('hides rebase when the shared trip has not moved and the idea is not conflicted', () => {
  renderRebase({
    onRebase: vi.fn(),
    sourceChanged: false,
    status: 'in_review'
  });

  expect(screen.queryByText('The shared trip has changed since you started')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Update from shared trip' })).toBeNull();
});
