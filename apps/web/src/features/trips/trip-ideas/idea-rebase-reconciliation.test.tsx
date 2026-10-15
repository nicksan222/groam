import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type {
  IdeaRebaseConflict,
  IdeaRebaseResult
} from '@/features/trips/hooks/use-idea-rebase-reconciliation';
import { IdeaRebaseReconciliation } from '@/features/trips/trip-ideas/idea-rebase-reconciliation';

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

async function renderRebase({
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

test('shows a compact entry without a tinted wash when the shared trip moved', async () => {
  await renderRebase({
    onRebase: vi.fn().mockResolvedValue({ kind: 'applied' })
  });

  await expect
    .element(page.getByText('The shared trip has changed since you started'))
    .toBeInTheDocument();
  const button = page.getByRole('button', { name: 'Update from shared trip' });
  await expect.element(button).toBeEnabled();
  await expect
    .element(page.getByText('Only the idea author or a group organizer can update this idea.'))
    .not.toBeInTheDocument();
  expect(button.element().className).not.toMatch(/bg-amber|bg-chart-4|bg-destructive/);
  expect(button.element().closest('section')?.className).not.toMatch(
    /bg-amber|bg-destructive\/5|bg-primary\/5/
  );
});

test('disables update for viewers who cannot change the idea', async () => {
  await renderRebase({
    canRebase: false,
    onRebase: vi.fn()
  });

  await expect
    .element(page.getByRole('button', { name: 'Update from shared trip' }))
    .toBeDisabled();
  await expect
    .element(page.getByText('Only the idea author or a group organizer can update this idea.'))
    .toBeInTheDocument();
});

test('uses a primary action when the idea already conflicts', async () => {
  await renderRebase({
    onRebase: vi.fn(),
    sourceChanged: false,
    status: 'conflicted'
  });

  await expect
    .element(page.getByText('The shared trip has changed since you started'))
    .toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Update from shared trip' }))
    .toBeInTheDocument();
});

test('fast-forwards without opening the screen when nothing remains to choose', async () => {
  const onRebase = vi.fn().mockResolvedValue({ kind: 'applied' });
  await renderRebase({ onRebase });

  await page.getByRole('button', { name: 'Update from shared trip' }).click();
  await vi.waitFor(() => {
    expect(onRebase).toHaveBeenCalledWith();
  });
  await expect.element(page.getByText('Update your idea')).not.toBeInTheDocument();
});

test('shows every overlap at once and applies keep-theirs then keep-yours', async () => {
  const onRebase = vi
    .fn()
    .mockResolvedValueOnce({ conflicts, kind: 'needs_choices' })
    .mockResolvedValueOnce({ kind: 'applied' });
  await renderRebase({ onRebase });

  await page.getByRole('button', { name: 'Update from shared trip' }).click();
  await expect.element(page.getByText('Choose what to keep')).toBeInTheDocument();
  await expect.element(page.getByText('Trip details')).toBeInTheDocument();
  await expect.element(page.getByText('Lisbon')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Keep shared trip' }).first().click();
  await page.getByRole('button', { name: 'Keep my idea' }).nth(1).click();
  await page.getByRole('button', { name: 'Update idea' }).click();

  await vi.waitFor(() => {
    expect(onRebase).toHaveBeenLastCalledWith([
      { choice: 'current', path: 'trip.json' },
      { choice: 'proposed', path: 'destinations/lisbon.json' }
    ]);
  });
  await expect
    .element(page.getByRole('button', { name: 'Update from shared trip' }))
    .toBeInTheDocument();
});

test('hides rebase when the shared trip has not moved and the idea is not conflicted', async () => {
  await renderRebase({
    onRebase: vi.fn(),
    sourceChanged: false,
    status: 'in_review'
  });

  await expect
    .element(page.getByText('The shared trip has changed since you started'))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Update from shared trip' }))
    .not.toBeInTheDocument();
});
