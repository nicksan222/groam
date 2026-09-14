import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
import {
  canSaveDestinationSchedule,
  canSubmitStay,
  destinationMoveClearsTravel,
  destinationScheduleDraft,
  destinationScheduleFromDraft,
  destinationScheduleHasChanged,
  type StaySource,
  stayCostError,
  stayDraftFor,
  stayInputFromDraft
} from './trip-destination-form-state';

const stay = (): StaySource => ({
  address: '  Rua Augusta 12  ',
  attachments: [{ id: 'media-1' as Id<'media'>, name: 'booking.pdf' }],
  checkInDay: 2,
  checkInTime: '15:00',
  checkOutDay: 4,
  checkOutTime: '11:00',
  costAmount: 240,
  id: 'stay-1' as Id<'tripDestinationStays'>,
  notes: '  Late check-in  ',
  title: 'Baixa apartment'
});

describe('trip destination form state', () => {
  test('hydrates and normalizes a destination day range', () => {
    expect(destinationScheduleDraft({ dayNotes: '  Old town  ', endDay: 4, startDay: 2 })).toEqual({
      endDay: '4',
      notes: '  Old town  ',
      startDay: '2'
    });
    expect(destinationScheduleDraft({ dayNotes: null, endDay: null, startDay: null })).toEqual({
      endDay: '',
      notes: '',
      startDay: ''
    });
    expect(canSaveDestinationSchedule({ endDay: '', notes: '', startDay: '' })).toBe(true);
    expect(canSaveDestinationSchedule({ endDay: '3', notes: '', startDay: '2' })).toBe(true);
    expect(canSaveDestinationSchedule({ endDay: '', notes: '', startDay: '2' })).toBe(false);
    expect(
      destinationScheduleFromDraft({ endDay: '4', notes: '  Old town  ', startDay: '2' })
    ).toEqual({
      dayNotes: 'Old town',
      endDay: 4,
      startDay: 2
    });
    expect(destinationScheduleFromDraft({ endDay: '', notes: '  ', startDay: '' })).toEqual({
      dayNotes: undefined
    });
    expect(
      destinationScheduleHasChanged(
        { endDay: '4', notes: 'Old town', startDay: '2' },
        { dayNotes: 'Old town', endDay: 4, startDay: 2 }
      )
    ).toBe(false);
    expect(
      destinationScheduleHasChanged(
        { endDay: '5', notes: 'Old town', startDay: '2' },
        { dayNotes: 'Old town', endDay: 4, startDay: 2 }
      )
    ).toBe(true);
  });

  test('hydrates a stay without retaining projection-only attachment fields', () => {
    expect(stayDraftFor({ endDay: 5, startDay: 2 }, stay())).toEqual({
      address: '  Rua Augusta 12  ',
      attachments: [{ id: 'media-1', name: 'booking.pdf' }],
      checkInDay: '2',
      checkInTime: '15:00',
      checkOutDay: '4',
      checkOutTime: '11:00',
      cost: '240',
      costSplit: 'total',
      notes: '  Late check-in  ',
      title: 'Baixa apartment'
    });
    expect(stayDraftFor({ endDay: null, startDay: null })).toEqual({
      address: '',
      attachments: [],
      checkInDay: '1',
      checkInTime: '',
      checkOutDay: '1',
      checkOutTime: '',
      cost: '',
      costSplit: 'total',
      notes: '',
      title: ''
    });
  });

  test('validates stay cost, title, and check-out after check-in', () => {
    const ready = stayDraftFor({ endDay: 4, startDay: 2 }, stay());
    expect(canSubmitStay(ready)).toBe(true);
    expect(canSubmitStay({ ...ready, title: '  ' })).toBe(false);
    expect(canSubmitStay({ ...ready, cost: '-1' })).toBe(false);
    expect(canSubmitStay({ ...ready, cost: 'abc' })).toBe(false);
    expect(stayCostError('1000000001')).toBe('Cost is too large.');
    expect(canSubmitStay({ ...ready, checkOutDay: '1' })).toBe(false);
    expect(
      canSubmitStay({
        ...ready,
        checkInDay: '3',
        checkInTime: '16:00',
        checkOutDay: '3',
        checkOutTime: '18:00'
      })
    ).toBe(true);
    expect(
      canSubmitStay({
        ...ready,
        checkInDay: '3',
        checkInTime: '16:00',
        checkOutDay: '3',
        checkOutTime: '15:00'
      })
    ).toBe(false);
  });

  test('normalizes stay whitespace, optional cost, and optional times', () => {
    expect(stayInputFromDraft(stayDraftFor({ endDay: 4, startDay: 2 }, stay()))).toEqual({
      address: 'Rua Augusta 12',
      attachmentIds: ['media-1'],
      cost: { amount: 240, split: 'total' },
      notes: 'Late check-in',
      schedule: {
        checkInDay: 2,
        checkInTime: '15:00',
        checkOutDay: 4,
        checkOutTime: '11:00'
      },
      title: 'Baixa apartment'
    });
    expect(
      stayInputFromDraft({
        ...stayDraftFor({ endDay: 4, startDay: 2 }, stay()),
        address: '',
        cost: '',
        checkInTime: '',
        checkOutTime: '',
        notes: '  '
      })
    ).toEqual({
      address: undefined,
      attachmentIds: ['media-1'],
      cost: undefined,
      notes: undefined,
      schedule: { checkInDay: 2, checkOutDay: 4 },
      title: 'Baixa apartment'
    });
  });

  test('detects destination moves that would clear connected travel', () => {
    const destinations = [
      { transferToNext: { id: 'a' } },
      { transferToNext: null },
      { transferToNext: null }
    ];
    expect(destinationMoveClearsTravel(destinations, 0, true, false)).toEqual({
      earlier: true,
      later: true
    });
    expect(destinationMoveClearsTravel(destinations, 1, true, false)).toEqual({
      earlier: true,
      later: true
    });
    expect(destinationMoveClearsTravel(destinations, 2, false, true)).toEqual({
      earlier: true,
      later: false
    });
    expect(destinationMoveClearsTravel([{ transferToNext: null }], 0, false, false)).toEqual({
      earlier: false,
      later: false
    });
  });
});
