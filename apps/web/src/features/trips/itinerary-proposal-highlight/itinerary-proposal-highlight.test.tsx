import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import { ItineraryDetailsChangeCard } from './itinerary-details-change-card';
import { ItineraryProposalHighlight } from './itinerary-proposal-highlight';

afterEach(cleanup);

const change = (overrides: Partial<ItineraryChange> = {}): ItineraryChange => ({
  change: 'modified',
  entity: 'destination',
  fields: [
    {
      after: 'Porto notes',
      before: 'Lisbon notes',
      display: 'value',
      format: 'text',
      key: 'dayNotes',
      label: 'Day notes'
    }
  ],
  key: 'destinations/source-lisbon.json',
  label: 'Lisbon',
  ...overrides
});

function highlight(kind: ItineraryChange['change']) {
  return document.querySelector(`[data-proposal-change="${kind}"]`);
}

describe('ItineraryProposalHighlight', () => {
  test('leaves unchanged itinerary items without idea chrome', () => {
    render(
      <ItineraryProposalHighlight change={null}>
        <h3>Lisbon</h3>
      </ItineraryProposalHighlight>
    );

    expect(screen.getByRole('heading', { name: 'Lisbon' })).toBeTruthy();
    expect(screen.queryByText('New')).toBeNull();
    expect(screen.queryByText('Changed')).toBeNull();
    expect(screen.queryByText('Removed from shared trip')).toBeNull();
    expect(document.querySelector('[data-proposal-change]')).toBeNull();
  });

  test('marks added, changed, and removed items with a quiet left rail instead of a full outline', () => {
    const { rerender } = render(
      <ItineraryProposalHighlight change={change({ change: 'added', fields: [] })}>
        <h3>Porto</h3>
      </ItineraryProposalHighlight>
    );
    expect(screen.getByText('New').className).toContain('sr-only');
    expect(highlight('added')?.className).toContain('p-0');
    expect(highlight('added')?.className).not.toContain('p-2');
    expect(highlight('added')?.className).not.toContain('border-emerald-500');
    expect(highlight('added')?.className).not.toContain('border-primary');
    expect(document.querySelector('[data-proposal-rail="added"]')?.className).toContain(
      'bg-primary'
    );
    expect(document.querySelector('[data-slot="badge"]')).toBeNull();

    rerender(
      <ItineraryProposalHighlight change={change()}>
        <h3>Lisbon</h3>
      </ItineraryProposalHighlight>
    );
    expect(screen.getByText('Changed').className).toContain('sr-only');
    expect(screen.getByText('Day notes: Lisbon notes → Porto notes')).toBeTruthy();
    expect(highlight('modified')?.className).toContain('p-0');
    expect(highlight('modified')?.className).not.toContain('p-2');
    expect(highlight('modified')?.className).not.toContain('border-amber-500');
    expect(document.querySelector('[data-proposal-rail="modified"]')?.className).toContain(
      'bg-chart-4'
    );
    expect(document.querySelector('[data-slot="badge"]')).toBeNull();

    rerender(
      <ItineraryProposalHighlight change={change({ change: 'removed', fields: [] })}>
        <h3>Faro</h3>
      </ItineraryProposalHighlight>
    );
    expect(screen.getByText('Removed from shared trip').className).toContain('sr-only');
    expect(highlight('removed')?.className).toContain('p-0');
    expect(highlight('removed')?.className).not.toContain('p-2');
    expect(highlight('removed')?.className).toContain('opacity-70');
    expect(highlight('removed')?.className).not.toContain('border-destructive');
    expect(document.querySelector('[data-proposal-rail="removed"]')?.className).toContain(
      'bg-destructive'
    );
    expect(document.querySelector('[data-slot="badge"]')).toBeNull();
  });
});

describe('ItineraryDetailsChangeCard', () => {
  test('renders trip-detail diffs in a border well with warmer copy and diff pills', () => {
    render(
      <ItineraryDetailsChangeCard
        change={change({
          entity: 'details',
          fields: [
            {
              after: { totalDays: 42 },
              before: { totalDays: 11 },
              display: 'value',
              format: 'duration',
              key: 'duration',
              label: 'Duration'
            },
            {
              after: '2026-08-12',
              before: null,
              display: 'value',
              format: 'date',
              key: 'startDate',
              label: 'Start date'
            }
          ],
          key: 'trip.json',
          label: 'Trip details'
        })}
      />
    );

    const title = screen.getByRole('heading', {
      name: 'Trip details differ from the shared trip'
    });
    const card = title.closest('section');
    expect(card?.className).toContain('border');
    expect(card?.className).toContain('rounded-xl');
    expect(card?.className).not.toContain('bg-card');
    expect(card?.className).not.toContain('dashboard-panel');
    expect(card?.className).not.toContain('border-amber-500');
    expect(card?.getAttribute('data-proposal-change')).toBe('modified');
    expect(screen.getByText('Conflict')).toBeTruthy();
    expect(
      screen.getByText(
        'The shared trip and your idea have different trip details. Choose what to keep.'
      )
    ).toBeTruthy();
    expect(screen.queryByText(/Duration: 11 days → 42 days · Start date/)).toBeNull();

    const text = card?.textContent ?? '';
    expect(text.indexOf('Trip details differ from the shared trip')).toBeLessThan(
      text.indexOf('Duration')
    );
    expect(screen.getByText('Duration')).toBeTruthy();
    expect(screen.getByText('11 days')).toBeTruthy();
    expect(screen.getByText('42 days')).toBeTruthy();
    expect(screen.getByText('Start date')).toBeTruthy();
    expect(screen.getByText('Not set')).toBeTruthy();
    expect(screen.getByText('2026-08-12')).toBeTruthy();
    expect(screen.getByLabelText('What changed')).toBeTruthy();
    expect(document.querySelector('[data-slot="badge"]')).toBeNull();
  });
});
