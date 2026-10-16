import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import { ItineraryDetailsChangeCard } from './itinerary-details-change-card';
import { ItineraryProposalHighlight } from './itinerary-proposal-highlight';

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
  test('leaves unchanged itinerary items without idea chrome', async () => {
    await render(
      <ItineraryProposalHighlight change={null}>
        <h3>Lisbon</h3>
      </ItineraryProposalHighlight>
    );

    await expect.element(page.getByRole('heading', { name: 'Lisbon' })).toBeInTheDocument();
    await expect.element(page.getByText('New')).not.toBeInTheDocument();
    await expect.element(page.getByText('Changed')).not.toBeInTheDocument();
    await expect.element(page.getByText('Removed from shared trip')).not.toBeInTheDocument();
    expect(document.querySelector('[data-proposal-change]')).toBeNull();
  });

  test('marks added, changed, and removed items with a quiet left rail instead of a full outline', async () => {
    const { rerender } = await render(
      <ItineraryProposalHighlight change={change({ change: 'added', fields: [] })}>
        <h3>Porto</h3>
      </ItineraryProposalHighlight>
    );
    await expect.element(page.getByText('New')).toHaveClass('sr-only');
    expect(highlight('added')?.className).toContain('p-0');
    expect(highlight('added')?.className).not.toContain('p-2');
    expect(highlight('added')?.className).not.toContain('border-emerald-500');
    expect(highlight('added')?.className).not.toContain('border-primary');
    expect(document.querySelector('[data-proposal-rail="added"]')?.className).toContain(
      'bg-primary'
    );
    expect(document.querySelector('[data-slot="badge"]')).toBeNull();

    await rerender(
      <ItineraryProposalHighlight change={change()}>
        <h3>Lisbon</h3>
      </ItineraryProposalHighlight>
    );
    await expect.element(page.getByText('Changed')).toHaveClass('sr-only');
    await expect
      .element(page.getByText('Day notes: Lisbon notes → Porto notes'))
      .toBeInTheDocument();
    expect(highlight('modified')?.className).toContain('p-0');
    expect(highlight('modified')?.className).not.toContain('p-2');
    expect(highlight('modified')?.className).not.toContain('border-amber-500');
    expect(document.querySelector('[data-proposal-rail="modified"]')?.className).toContain(
      'bg-chart-4'
    );
    expect(document.querySelector('[data-slot="badge"]')).toBeNull();

    await rerender(
      <ItineraryProposalHighlight change={change({ change: 'removed', fields: [] })}>
        <h3>Faro</h3>
      </ItineraryProposalHighlight>
    );
    await expect.element(page.getByText('Removed from shared trip')).toHaveClass('sr-only');
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
  test('renders trip-detail diffs in a border well with warmer copy and diff pills', async () => {
    await render(
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

    const title = page
      .getByRole('heading', {
        name: 'Trip details differ from the shared trip'
      })
      .element();
    const card = title.closest('section');
    expect(card?.className).toContain('border');
    expect(card?.className).toContain('rounded-lg');
    expect(card?.className).toContain('bg-card');
    expect(card?.className).not.toContain('dashboard-panel');
    expect(card?.className).not.toContain('border-amber-500');
    expect(card?.getAttribute('data-proposal-change')).toBe('modified');
    await expect.element(page.getByText('Conflict')).toBeInTheDocument();
    await expect
      .element(
        page.getByText(
          'The shared trip and your idea have different trip details. Choose what to keep.'
        )
      )
      .toBeInTheDocument();
    await expect
      .element(page.getByText(/Duration: 11 days → 42 days · Start date/))
      .not.toBeInTheDocument();

    const text = card?.textContent ?? '';
    expect(text.indexOf('Trip details differ from the shared trip')).toBeLessThan(
      text.indexOf('Duration')
    );
    await expect.element(page.getByText('Duration')).toBeInTheDocument();
    await expect.element(page.getByText('11 days')).toBeInTheDocument();
    await expect.element(page.getByText('42 days')).toBeInTheDocument();
    await expect.element(page.getByText('Start date')).toBeInTheDocument();
    await expect.element(page.getByText('Not set')).toBeInTheDocument();
    await expect.element(page.getByText('2026-08-12')).toBeInTheDocument();
    await expect.element(page.getByLabelText('What changed')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="badge"]')).toBeNull();
  });
});
