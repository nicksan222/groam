import type { Destination, TripActivity, TripDetail } from '@/types/trips';

export function plannerActivity(overrides: Partial<TripActivity> = {}): TripActivity {
  return {
    id: 'museum',
    sourceId: null,
    title: 'Explore the tile museum',
    dayNumber: 1,
    endDayNumber: 1,
    startTime: '10:00',
    endTime: '12:00',
    timeBlock: 'morning',
    address: 'Lisbon, Portugal',
    notes: 'Leave a little time for the courtyard café.',
    costAmount: 8,
    costSplit: 'per_person',
    attachments: [],
    transferToNext: null,
    ...overrides
  } as TripActivity;
}

export function plannerDestination(overrides: Partial<Destination> = {}): Destination {
  return {
    id: 'lisbon',
    sourceId: null,
    name: 'Lisbon',
    startDay: 1,
    endDay: 2,
    activities: [],
    stays: [],
    transferToNext: null,
    latitude: 38.72,
    longitude: -9.14,
    placeId: 'lisbon',
    position: 0,
    coverUrl: null,
    coverStatus: null,
    dayNotes: null,
    ...overrides
  } as Destination;
}

export function plannerFixture(): TripDetail {
  const lisbon = plannerDestination({
    activities: [
      plannerActivity(),
      plannerActivity({
        id: 'alfama' as TripActivity['id'],
        title: 'Wander through Alfama',
        startTime: '14:00',
        endTime: '16:00',
        timeBlock: 'afternoon',
        notes: null,
        costAmount: null
      }),
      plannerActivity({
        id: 'dinner' as TripActivity['id'],
        title: 'Dinner by the river',
        startTime: '19:00',
        endTime: '20:30',
        timeBlock: 'evening',
        notes: null,
        costAmount: null
      })
    ],
    stays: [
      {
        id: 'hotel' as Destination['stays'][number]['id'],
        position: 0,
        sourceId: null,
        title: 'Casa do Pátio',
        address: 'Alfama, Lisbon',
        checkInDay: 1,
        checkOutDay: 2,
        checkInTime: '15:00',
        checkOutTime: '08:00',
        notes: 'Bags can be left at reception.',
        attachments: [],
        costAmount: 120,
        costSplit: 'total'
      } as Destination['stays'][number]
    ],
    transferToNext: {
      id: 'train' as NonNullable<Destination['transferToNext']>['id'],
      toDestinationId: 'porto' as Destination['id'],
      sourceId: null,
      mode: 'train',
      timing: { startDay: 2, endDay: 2, startTime: '09:00', endTime: '12:00' },
      durationMinutes: 180,
      costAmount: 30,
      costSplit: 'per_person',
      attachments: [],
      notes: 'Depart from Santa Apolónia station.'
    } as Destination['transferToNext']
  });
  const porto = plannerDestination({
    id: 'porto' as Destination['id'],
    name: 'Porto',
    startDay: 2,
    endDay: 3,
    activities: [
      plannerActivity({
        id: 'ribeira' as TripActivity['id'],
        title: 'Sunset along the Ribeira',
        dayNumber: 2,
        endDayNumber: 2,
        startTime: null,
        endTime: null,
        timeBlock: 'evening',
        address: 'Ribeira, Porto',
        notes: null,
        costAmount: null
      })
    ]
  });
  return {
    id: 'sample-trip',
    name: 'A few days in Portugal',
    currency: 'EUR',
    startDate: '2026-09-14',
    totalDurationDays: 3,
    destinations: [lisbon, porto],
    arrivalTransfer: null,
    departureTransfer: null,
    permissions: { canEdit: false, canPropose: true },
    proposal: null
  } as TripDetail;
}
