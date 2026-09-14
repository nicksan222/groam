import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
import {
  activityFormForEdit,
  activityInputFromForm,
  canSubmitTripActivity,
  emptyActivityForm,
  type TripActivity,
  type TripDestinationWithActivities,
  tripActivityEditorCopy
} from './trip-activity-form-state';

const destination = (startDay: null | number): TripDestinationWithActivities =>
  ({ activities: [], startDay }) as unknown as TripDestinationWithActivities;

const activity = (): TripActivity =>
  ({
    address: '  Rua das Flores  ',
    attachments: [
      {
        id: 'media-1' as Id<'media'>,
        name: 'booking.pdf'
      }
    ],
    costAmount: 125.5,
    dayNumber: 2,
    endDayNumber: 3,
    endTime: '10:30',
    id: 'activity-1' as Id<'tripDestinationActivities'>,
    notes: '  Arrive early  ',
    startTime: '09:00',
    timeBlock: 'morning',
    title: 'Walking tour',
    transferToNext: null
  }) as TripActivity;

describe('trip activity form state', () => {
  test('creates a stable empty form at the destination start', () => {
    expect(emptyActivityForm(destination(4))).toEqual({
      address: '',
      attachments: [],
      cost: '',
      costSplit: 'total',
      dayNumber: '4',
      editingId: null,
      endDayNumber: '4',
      endTime: '',
      isOpen: false,
      notes: '',
      startTime: '',
      timeBlock: 'morning',
      title: ''
    });
    expect(emptyActivityForm(destination(null)).dayNumber).toBe('1');
  });

  test('hydrates an editable form without retaining projection-only attachment fields', () => {
    expect(activityFormForEdit(activity())).toEqual({
      address: '  Rua das Flores  ',
      attachments: [{ id: 'media-1', name: 'booking.pdf' }],
      cost: '125.5',
      costSplit: 'total',
      dayNumber: '2',
      editingId: 'activity-1',
      endDayNumber: '3',
      endTime: '10:30',
      isOpen: true,
      notes: '  Arrive early  ',
      startTime: '09:00',
      timeBlock: 'morning',
      title: 'Walking tour'
    });
  });

  test('validates required fields, pending operations, and exact timing', () => {
    const ready = {
      ...emptyActivityForm(destination(1)),
      isPending: false,
      isUploading: false,
      title: 'Museum'
    };
    expect(canSubmitTripActivity(ready)).toBe(true);
    expect(canSubmitTripActivity({ ...ready, cost: '-1' })).toBe(false);
    expect(canSubmitTripActivity({ ...ready, cost: '1000000001' })).toBe(false);
    expect(canSubmitTripActivity({ ...ready, title: '  ' })).toBe(false);
    expect(canSubmitTripActivity({ ...ready, dayNumber: '' })).toBe(false);
    expect(canSubmitTripActivity({ ...ready, endDayNumber: '' })).toBe(false);
    expect(canSubmitTripActivity({ ...ready, isPending: true })).toBe(false);
    expect(canSubmitTripActivity({ ...ready, isUploading: true })).toBe(false);
    expect(canSubmitTripActivity({ ...ready, endTime: '10:00' })).toBe(false);
    expect(canSubmitTripActivity({ ...ready, endTime: '09:00', startTime: '10:00' })).toBe(false);
    expect(
      canSubmitTripActivity({
        ...ready,
        endDayNumber: '2',
        endTime: '09:00',
        startTime: '10:00'
      })
    ).toBe(true);
  });

  test('normalizes whitespace, attachments, cross-day ranges, and optional times', () => {
    const form = activityFormForEdit(activity());
    expect(activityInputFromForm(form)).toEqual({
      address: 'Rua das Flores',
      attachmentIds: ['media-1'],
      cost: { amount: 125.5, split: 'total' },
      notes: 'Arrive early',
      schedule: {
        day: 2,
        endDay: 3,
        endTime: '10:30',
        startTime: '09:00',
        timeBlock: 'morning'
      },
      title: 'Walking tour'
    });
    expect(
      activityInputFromForm({
        ...form,
        costSplit: 'per_person'
      }).cost
    ).toEqual({ amount: 125.5, split: 'per_person' });
    expect(
      activityInputFromForm({
        ...form,
        address: '',
        cost: '',
        endDayNumber: '2',
        endTime: '',
        notes: '',
        startTime: ''
      })
    ).toEqual({
      address: undefined,
      attachmentIds: ['media-1'],
      cost: undefined,
      notes: undefined,
      schedule: { day: 2, timeBlock: 'morning' },
      title: 'Walking tour'
    });
  });
});

describe('trip activity editor copy', () => {
  test('keeps add and edit copy aligned across editors', () => {
    expect(tripActivityEditorCopy(false)).toEqual({
      description: 'Add the exact place, timing, and every useful document.',
      submitLabel: 'Add activity',
      title: 'Add activity'
    });
    expect(tripActivityEditorCopy(true).title).toBe('Edit activity');
    expect(tripActivityEditorCopy(true).submitLabel).toBe('Save activity');
  });
});
