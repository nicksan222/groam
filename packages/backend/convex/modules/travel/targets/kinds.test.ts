import { expect, test } from 'vitest';
import { TripTargetKind } from '#convex/modules/travel/targets/kind';
import {
  activity,
  attachment,
  destination,
  trip
} from '#convex/modules/travel/targets/kinds/index';

test('every trip target kind is subscribed exactly once', () => {
  expect(
    TripTargetKind.all()
      .map((kind) => kind.type)
      .sort()
  ).toEqual(
    [
      'activity',
      'activity_transfer',
      'attachment',
      'boundary_transfer',
      'destination',
      'destination_transfer',
      'stay',
      'trip'
    ].sort()
  );
});

test('attachable kinds carry trip-wide attachment scan limits', () => {
  const limits = Object.fromEntries(
    TripTargetKind.attachable().map((kind) => [kind.type, kind.attachments.maxPerTrip])
  );
  expect(limits).toEqual({
    activity: 2_000,
    activity_transfer: 1_990,
    boundary_transfer: 20,
    destination: 200,
    destination_transfer: 190,
    stay: 500,
    trip: 10
  });
  expect(TripTargetKind.isAttachable(attachment)).toBe(false);
  expect(attachment.collaborative).toBe(true);
});

test('cost-bearing kinds expose an audit event and a not-found message', () => {
  const events = Object.fromEntries(
    TripTargetKind.all()
      .filter(TripTargetKind.isCostBearing)
      .map((kind) => [kind.type, kind.costUpdatedEvent])
  );
  expect(events).toEqual({
    activity: 'itinerary_activity_updated',
    activity_transfer: 'activity_transfer_updated',
    boundary_transfer: 'boundary_transfer_updated',
    destination_transfer: 'destination_transfer_updated',
    stay: 'stay_updated'
  });
});

test('context tags use name or title from the underlying document', () => {
  expect(trip.contextLabel({ name: 'Lisbon' })).toBe('Lisbon');
  expect(destination.contextLabel({ name: 'Porto' })).toBe('Porto');
  expect(activity.contextLabel({ title: 'Walk' })).toBe('Walk');
});

test('context-tagged kinds expose catalog copy without a switch in the assistant', () => {
  expect(
    TripTargetKind.contextTagged()
      .map((kind) => kind.type)
      .sort()
  ).toEqual(['activity', 'destination', 'trip']);
  expect(trip.catalogDescription('Lisbon')).toBe('Trip');
  expect(destination.catalogDescription('Lisbon')).toBe('Lisbon · Destination');
  expect(activity.catalogDescription('Lisbon', { destinationName: 'Porto' })).toBe(
    'Lisbon · Porto'
  );
});
