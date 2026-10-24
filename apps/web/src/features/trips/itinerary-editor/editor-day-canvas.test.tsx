import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { PlannerDay, PlannerEntry } from '@/types/trip-planner';
import { EditorDayCanvas } from './editor-day-canvas';

function makeEntry(key: string, title: string, period: PlannerEntry['period']): PlannerEntry {
  return {
    activity: {
      address: null,
      attachments: [],
      costAmount: null,
      costSplit: 'per_person',
      id: key,
      notes: null,
      sourceId: null,
      title
    },
    endDay: 1,
    endTime: null,
    key,
    kind: 'activity',
    location: 'Lisbon',
    period,
    startDay: 1,
    startTime: null,
    title
  } as unknown as PlannerEntry;
}

function makeDay(overrides: Partial<PlannerDay> = {}): PlannerDay {
  return { day: 2, destinations: [], entries: [], stays: [], ...overrides };
}

function renderCanvas(props: Partial<Parameters<typeof EditorDayCanvas>[0]> = {}) {
  return render(
    <EditorDayCanvas
      canAdd
      currency="EUR"
      day={makeDay()}
      onAdd={vi.fn()}
      onEdit={vi.fn()}
      {...props}
    />
  );
}

describe('timeline', () => {
  test('shows an empty state and a zero count', async () => {
    await renderCanvas();
    await expect
      .element(page.getByText('Nothing planned yet. Add the first part of this day.'))
      .toBeVisible();
    await expect.element(page.getByText('0 plans for this day')).toBeVisible();
  });

  test('groups entries into their period sections', async () => {
    const entries = [
      makeEntry('a', 'Tile museum', 'morning'),
      makeEntry('b', 'Fado night', 'evening')
    ];
    await renderCanvas({ day: makeDay({ day: 1, entries }) });
    await expect
      .element(page.getByRole('region', { name: 'Morning, Day 1' }).getByText('Tile museum'))
      .toBeVisible();
    await expect
      .element(page.getByRole('region', { name: 'Evening, Day 1' }).getByText('Fado night'))
      .toBeVisible();
    await expect
      .element(page.getByRole('region', { name: 'Afternoon, Day 1' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByText('2 plans for this day')).toBeVisible();
  });

  test('uses the singular for one plan', async () => {
    await renderCanvas({
      day: makeDay({ day: 1, entries: [makeEntry('a', 'Tile museum', 'morning')] })
    });
    await expect.element(page.getByText('1 plan for this day')).toBeVisible();
  });

  test('adds a continuing overnight stay from an earlier check-in', async () => {
    const stay = {
      checkInDay: 1,
      checkOutDay: 3,
      id: 'hotel',
      title: 'Hotel Baixa',
      attachments: [],
      costAmount: null,
      notes: null,
      address: null
    };
    const destination = { id: 'lisbon', name: 'Lisbon' };
    await renderCanvas({ day: makeDay({ day: 2, stays: [{ destination, stay }] as never }) });
    await expect
      .element(page.getByRole('button', { name: 'Edit overnight stay at Hotel Baixa' }))
      .toBeVisible();
  });

  test('passes the clicked entry to onEdit', async () => {
    const onEdit = vi.fn();
    const entry = makeEntry('a', 'Tile museum', 'morning');
    await renderCanvas({ day: makeDay({ day: 1, entries: [entry] }), onEdit });
    await page.getByRole('button', { name: 'Edit Tile museum' }).click();
    expect(onEdit).toHaveBeenCalledWith(entry);
  });
});

describe('active editor', () => {
  const entries = [makeEntry('a', 'Tile museum', 'morning')];

  test('renders under the matching entry', async () => {
    await renderCanvas({
      activeEditor: { content: <p>Inline editor</p>, entryKey: 'a' },
      day: makeDay({ day: 1, entries })
    });
    await expect.element(page.getByRole('listitem').getByText('Inline editor')).toBeVisible();
  });

  test('renders after the timeline when it has no entry', async () => {
    await renderCanvas({ activeEditor: { content: <p>New activity editor</p> } });
    await expect.element(page.getByText('New activity editor')).toBeVisible();
  });
});

describe('add menu', () => {
  test.each([
    ['Activity', 'activity'],
    ['Stay', 'stay'],
    ['Travel', 'travel'],
    ['Destination', 'destination']
  ])('"%s" reports %s', async (item, kind) => {
    const onAdd = vi.fn();
    await renderCanvas({ onAdd });
    await page.getByRole('button', { name: 'Add to day' }).click();
    await page.getByRole('menuitem', { name: item }).click();
    expect(onAdd).toHaveBeenCalledWith(kind);
  });

  test('disables day-bound items when no destination covers the day', async () => {
    await renderCanvas({ canAdd: false });
    await page.getByRole('button', { name: 'Add to day' }).click();
    for (const name of ['Activity', 'Stay', 'Travel'])
      await expect
        .element(page.getByRole('menuitem', { name }))
        .toHaveAttribute('aria-disabled', 'true');
    await expect
      .element(page.getByRole('menuitem', { name: 'Destination' }))
      .not.toHaveAttribute('aria-disabled', 'true');
  });

  test('locks the menu while an editor is uploading', async () => {
    await renderCanvas({ editorLocked: true });
    await expect.element(page.getByRole('button', { name: 'Add to day' })).toBeDisabled();
  });
});
