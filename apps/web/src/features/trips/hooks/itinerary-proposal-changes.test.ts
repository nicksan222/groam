import { describe, expect, test } from 'vitest';
import {
  activityChangeKey,
  boundaryTransferChangeKey,
  changeByKey,
  compactChangeSummary,
  destinationChangeKey,
  destinationTransferChangeKey,
  detailsItineraryChange,
  highlightBadgeLabel,
  type ItineraryChange,
  itineraryChangeFieldRows,
  removedDestinationChanges,
  stayChangeKey,
  unplacedRemovedChanges
} from './itinerary-proposal-changes';

const change = (overrides: Partial<ItineraryChange> = {}): ItineraryChange => ({
  change: 'modified',
  entity: 'destination',
  fields: [],
  key: 'destinations/source-lisbon.json',
  label: 'Lisbon',
  ...overrides
});

describe('itinerary proposal change keys', () => {
  test('maps cloned working-copy items to the shared snapshot path', () => {
    expect(destinationChangeKey({ id: 'working-lisbon', sourceId: 'source-lisbon' })).toBe(
      'destinations/source-lisbon.json'
    );
    expect(activityChangeKey({ id: 'working-tour', sourceId: 'source-tour' })).toBe(
      'activities/source-tour.json'
    );
    expect(stayChangeKey({ id: 'working-stay', sourceId: 'source-stay' })).toBe(
      'stays/source-stay.json'
    );
    expect(destinationTransferChangeKey({ id: 'working-leg', sourceId: 'source-leg' })).toBe(
      'transfers/destination-source-leg.json'
    );
  });

  test('maps newly added items to their own working-copy id', () => {
    expect(destinationChangeKey({ id: 'new-porto', sourceId: null })).toBe(
      'destinations/new-porto.json'
    );
    expect(boundaryTransferChangeKey('arrival')).toBe('transfers/boundary-arrival.json');
  });
});

describe('itinerary proposal change lookup', () => {
  test('does not highlight anything on a shared trip with no change list', () => {
    expect(changeByKey(null, 'destinations/source-lisbon.json')).toBeNull();
    expect(detailsItineraryChange(null)).toBeNull();
    expect(removedDestinationChanges(null)).toEqual([]);
    expect(unplacedRemovedChanges(null, [])).toEqual([]);
  });

  test('resolves added, changed, and removed itinerary items', () => {
    const changes = [
      change({
        change: 'added',
        key: 'destinations/new-porto.json',
        label: 'Porto'
      }),
      change({
        change: 'modified',
        fields: [
          {
            after: { endDay: 4, startDay: 1 },
            before: { endDay: 3, startDay: 1 },
            display: 'value',
            format: 'schedule',
            key: 'schedule',
            label: 'Days'
          }
        ],
        key: 'destinations/source-lisbon.json'
      }),
      change({
        change: 'removed',
        entity: 'activity',
        key: 'activities/source-tour.json',
        label: 'Walking tour'
      }),
      change({
        change: 'removed',
        key: 'destinations/source-faro.json',
        label: 'Faro'
      }),
      change({ change: 'removed', entity: 'packing', key: 'packing/hat.json', label: 'Hat' }),
      change({
        change: 'modified',
        entity: 'details',
        key: 'trip.json',
        label: 'Trip details'
      })
    ];

    expect(
      changeByKey(
        changes,
        destinationChangeKey({ id: 'working-lisbon', sourceId: 'source-lisbon' })
      )?.change
    ).toBe('modified');
    expect(
      changeByKey(changes, destinationChangeKey({ id: 'new-porto', sourceId: null }))?.change
    ).toBe('added');
    expect(detailsItineraryChange(changes)?.entity).toBe('details');
    expect(removedDestinationChanges(changes).map((item) => item.label)).toEqual(['Faro']);
    expect(
      unplacedRemovedChanges(
        changes,
        removedDestinationChanges(changes).map((item) => item.key)
      ).map((item) => item.label)
    ).toEqual(['Walking tour']);
  });
});

describe('itinerary proposal change copy', () => {
  test('summarizes before and after values for changed fields', () => {
    expect(
      compactChangeSummary(
        change({
          fields: [
            {
              after: { endDay: 4, startDay: 1 },
              before: { endDay: 3, startDay: 1 },
              display: 'value',
              format: 'schedule',
              key: 'schedule',
              label: 'Days'
            }
          ]
        })
      )
    ).toBe('Days: Days 1–3 → Days 1–4');
    expect(highlightBadgeLabel('added')).toBe('New');
    expect(highlightBadgeLabel('modified')).toBe('Changed');
    expect(highlightBadgeLabel('removed')).toBe('Removed from shared trip');
    expect(
      itineraryChangeFieldRows(
        change({
          fields: [
            {
              after: { totalDays: 42 },
              before: { totalDays: 11 },
              display: 'value',
              format: 'duration',
              key: 'duration',
              label: 'Duration'
            }
          ]
        })
      )
    ).toEqual([
      {
        after: '42 days',
        before: '11 days',
        key: 'duration',
        label: 'Duration'
      }
    ]);
  });
});
