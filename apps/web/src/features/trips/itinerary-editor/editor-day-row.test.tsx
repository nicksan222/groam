import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { PlannerEntry } from '@/types/trip-planner';
import { EditorDayRow } from './editor-day-row';

const changesState = vi.hoisted(() => ({ changes: null as unknown[] | null }));
vi.mock('@/features/trips/hooks/use-itinerary-proposal-changes', () => ({
  useItineraryProposalChangeList: () => changesState.changes
}));

function makeEntry(overrides: Record<string, unknown> = {}): PlannerEntry {
  return {
    activity: {
      address: null,
      attachments: [],
      costAmount: null,
      costSplit: 'per_person',
      id: 'museum',
      notes: null,
      sourceId: null,
      title: 'Tile museum'
    },
    endDay: 1,
    endTime: null,
    key: 'activity-museum',
    kind: 'activity',
    location: 'Lisbon',
    period: 'morning',
    startDay: 1,
    startTime: null,
    title: 'Tile museum',
    ...overrides
  } as unknown as PlannerEntry;
}

function renderRow(props: Partial<Parameters<typeof EditorDayRow>[0]> = {}) {
  return render(
    <EditorDayRow currency="EUR" day={1} entry={makeEntry()} onEdit={vi.fn()} {...props} />
  );
}

describe('edit control', () => {
  test.each([
    ['a regular entry', {}, 'Edit Tile museum'],
    ['a continuing stay', { continuing: true }, 'Edit overnight stay at Tile museum']
  ])('is labelled for %s', async (_, props, name) => {
    await renderRow(props);
    await expect.element(page.getByText('Lisbon')).toBeVisible();
    await expect.element(page.getByRole('button', { name })).toBeVisible();
  });

  test('passes the entry to onEdit', async () => {
    const onEdit = vi.fn();
    const entry = makeEntry();
    await renderRow({ entry, onEdit });
    await page.getByRole('button', { name: 'Edit Tile museum' }).click();
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  test('is disabled while the editor is locked', async () => {
    await renderRow({ disabled: true });
    await expect.element(page.getByRole('button', { name: 'Edit Tile museum' })).toBeDisabled();
  });
});

describe('proposal highlight', () => {
  test('marks an entry the proposal changed', async () => {
    changesState.changes = [
      {
        change: 'modified',
        entity: 'activity',
        fields: [],
        key: 'activities/museum.json',
        label: 'x'
      }
    ];
    await renderRow();
    await expect.element(page.getByText('Changed')).toBeInTheDocument();
    changesState.changes = null;
  });

  test('shows no marker without a proposal', async () => {
    changesState.changes = null;
    await renderRow();
    await expect.element(page.getByText('Changed')).not.toBeInTheDocument();
  });
});
