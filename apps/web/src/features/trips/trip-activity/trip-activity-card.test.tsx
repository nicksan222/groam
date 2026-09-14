import type { Id } from '@groam/backend/data-model';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import type { TripActivity } from '@/features/trips/hooks/use-trip-activity-editor';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import { TripActivityCard } from '@/features/trips/trip-activity/trip-activity-card';

afterEach(cleanup);

function activity(overrides: Partial<TripActivity> = {}): TripActivity {
  return {
    address: null,
    attachments: [],
    costAmount: null,
    costSplit: 'total',
    dayNumber: 1,
    endDayNumber: 1,
    endTime: null,
    id: 'activity-1' as Id<'tripDestinationActivities'>,
    notes: null,
    position: 0,
    sourceId: null,
    startTime: null,
    timeBlock: 'morning',
    title: 'Explore the neighborhood',
    transferToNext: null,
    ...overrides
  };
}

function card() {
  return document.querySelector('[data-slot="timeline-card"]');
}

describe('TripActivityCard', () => {
  test('sits on the page background without a filled card surface', () => {
    render(
      <TripActivityCard
        activity={activity()}
        canManage={false}
        currency="EUR"
        onEdit={vi.fn()}
        onRemove={vi.fn()}
        tripStartDate={null}
      />
    );

    expect(card()?.className).toContain('rounded-xl');
    expect(card()?.className).toContain('border-border');
    expect(card()?.className).toContain('bg-transparent');
    expect(card()?.className).not.toContain('bg-card');
    expect(screen.getByRole('heading', { name: 'Explore the neighborhood' })).toBeTruthy();
    expect(screen.getByText('Day 1 · Morning')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Actions for Explore the neighborhood' })
    ).toBeNull();
  });

  test('keeps the overflow menu when the traveler can manage', () => {
    render(
      <TripActivityCard
        activity={activity()}
        canManage
        currency="EUR"
        onEdit={vi.fn()}
        onRemove={vi.fn()}
        tripStartDate={null}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Actions for Explore the neighborhood' })
    ).toBeTruthy();
  });

  test('proposal highlight uses a left rail around an unfilled activity, not a full outline', () => {
    const change: ItineraryChange = {
      change: 'added',
      entity: 'activity',
      fields: [],
      key: 'activities/activity-1.json',
      label: 'Explore the neighborhood'
    };

    render(
      <ItineraryProposalHighlight change={change}>
        <TripActivityCard
          activity={activity()}
          canManage={false}
          currency="EUR"
          onEdit={vi.fn()}
          onRemove={vi.fn()}
          tripStartDate={null}
        />
      </ItineraryProposalHighlight>
    );

    const highlight = document.querySelector('[data-proposal-change="added"]');
    expect(highlight?.className).toContain('p-0');
    expect(highlight?.className).not.toContain('border-emerald-500');
    expect(highlight?.className).not.toContain('border-primary');
    expect(highlight?.querySelector('[data-proposal-rail="added"]')?.className).toContain(
      'bg-primary'
    );
    expect(highlight?.className).not.toContain('bg-card');
    expect(highlight?.querySelector('[data-slot="timeline-card"]')?.className).not.toContain(
      'bg-card'
    );
  });
});
