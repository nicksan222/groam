import type { Id } from '@groam/backend/data-model';
import { describe, expect, test } from 'vitest';
import {
  initialTransferDraft,
  type TransferFormState,
  transferCostError,
  transferDraftsMatch,
  transferDurationError,
  transferInputFromDraft,
  transferTimingError,
  tripTransferFormReducer
} from './trip-transfer-form-state';

const mediaId = (value: string) => value as Id<'media'>;

function state(): TransferFormState {
  return {
    draft: initialTransferDraft(null, 'activity', 2),
    operation: 'idle',
    status: { kind: 'warning', message: 'Old warning' }
  };
}

describe('trip transfer form state', () => {
  test('builds defaults and copies an existing transfer without sharing attachments', () => {
    const attachment = { id: mediaId('media-1'), name: 'ticket.pdf' };
    const initial = {
      attachments: [attachment],
      costAmount: 85,
      durationMinutes: 90,
      mode: 'train' as const,
      notes: 'Carriage 4',
      timing: {
        endDay: 3,
        endTime: '09:30',
        startDay: 2,
        startTime: '08:00'
      }
    };
    expect(initialTransferDraft(null, 'activity', 2)).toMatchObject({
      costSplit: 'total',
      endDay: '2',
      mode: 'walk',
      startDay: '2',
      timingEnabled: false
    });
    expect(initialTransferDraft(null, 'destination', 4).mode).toBe('train');
    const draft = initialTransferDraft(initial, 'destination', 1);
    expect(draft).toMatchObject({
      cost: '85',
      costSplit: 'total',
      duration: '90',
      endDay: '3',
      endTime: '09:30',
      notes: 'Carriage 4',
      startDay: '2',
      startTime: '08:00',
      timingEnabled: true
    });
    expect(draft.attachments).toEqual([attachment]);
    expect(draft.attachments).not.toBe(initial.attachments);
  });

  test('reduces every editable field and clears stale status after edits', () => {
    let current = state();
    current = tripTransferFormReducer(current, {
      endDay: 4,
      endTime: '10:00',
      startDay: 3,
      startTime: '09:00',
      type: 'changeTiming'
    });
    expect(current.draft).toMatchObject({
      endDay: '4',
      endTime: '10:00',
      startDay: '3',
      startTime: '09:00',
      timingEnabled: true
    });
    expect(current.status).toBeNull();

    current = tripTransferFormReducer(current, {
      attachments: [{ id: mediaId('media-1'), name: 'one.pdf' }],
      type: 'appendAttachments'
    });
    current = tripTransferFormReducer(current, {
      attachments: [{ id: mediaId('media-2'), name: 'two.pdf' }],
      type: 'appendAttachments'
    });
    current = tripTransferFormReducer(current, {
      mediaId: mediaId('media-1'),
      type: 'removeAttachment'
    });
    current = tripTransferFormReducer(current, { mode: 'bus', type: 'changeMode' });
    current = tripTransferFormReducer(current, { split: 'per_person', type: 'changeSplit' });
    current = tripTransferFormReducer(current, {
      field: 'notes',
      type: 'changeText',
      value: 'Platform 3'
    });
    current = tripTransferFormReducer(current, {
      enabled: false,
      type: 'changeTimingEnabled'
    });
    current = tripTransferFormReducer(current, { operation: 'saving', type: 'setOperation' });
    current = tripTransferFormReducer(current, {
      status: { kind: 'error', message: 'Failed' },
      type: 'setStatus'
    });
    expect(current).toMatchObject({
      draft: {
        attachments: [{ id: mediaId('media-2'), name: 'two.pdf' }],
        costSplit: 'per_person',
        mode: 'bus',
        notes: 'Platform 3',
        timingEnabled: false
      },
      operation: 'saving',
      status: { kind: 'error', message: 'Failed' }
    });
  });

  test('validates cost, duration, and optional chronological timing boundaries', () => {
    expect(transferCostError('')).toBeNull();
    expect(transferCostError('0')).toBeNull();
    expect(transferCostError('25.50')).toBeNull();
    expect(transferCostError('-1')).toBe('Cost must be zero or more.');
    expect(transferCostError('1000000001')).toBe('Cost is too large.');
    expect(transferDurationError('')).toBeNull();
    expect(transferDurationError('1')).toBeNull();
    expect(transferDurationError('10080')).toBeNull();
    expect(transferDurationError('1.5')).toBe('Use a whole number of minutes.');
    expect(transferDurationError('0')).toBe('Duration must be at least 1 minute.');
    expect(transferDurationError('10081')).toBe('Duration cannot exceed 7 days.');

    const draft = initialTransferDraft(null, 'destination', 1);
    expect(transferTimingError(draft)).toBeNull();
    expect(transferTimingError({ ...draft, timingEnabled: true })).toBe('Add a departure time.');
    expect(
      transferTimingError({
        ...draft,
        endTime: '08:00',
        startTime: '09:00',
        timingEnabled: true
      })
    ).toBe('Arrival must be after departure.');
    expect(
      transferTimingError({
        ...draft,
        endDay: '2',
        endTime: '08:00',
        startTime: '09:00',
        timingEnabled: true
      })
    ).toBeNull();
  });

  test('compares only persisted timing and attachment order', () => {
    const baseline = initialTransferDraft(null, 'destination', 1);
    expect(transferDraftsMatch({ ...baseline, endDay: '5' }, baseline)).toBe(true);
    expect(transferDraftsMatch({ ...baseline, mode: 'bus' }, baseline)).toBe(false);
    expect(transferDraftsMatch({ ...baseline, costSplit: 'per_person' }, baseline)).toBe(false);
    expect(
      transferDraftsMatch({ ...baseline, startTime: '09:00', timingEnabled: true }, baseline)
    ).toBe(false);
    const first = { id: mediaId('media-1'), name: 'one.pdf' };
    const second = { id: mediaId('media-2'), name: 'two.pdf' };
    expect(
      transferDraftsMatch(
        { ...baseline, attachments: [first, second] },
        { ...baseline, attachments: [second, first] }
      )
    ).toBe(false);
  });

  test('normalizes a draft into the backend input shape', () => {
    const draft = {
      ...initialTransferDraft(null, 'destination', 2),
      attachments: [{ id: mediaId('media-1'), name: 'ticket.pdf' }],
      cost: '85',
      duration: '45',
      endDay: '3',
      endTime: '10:15',
      mode: 'train' as const,
      notes: '  Platform 3  ',
      startTime: '09:00',
      timingEnabled: true
    };
    expect(transferInputFromDraft(draft)).toEqual({
      attachmentIds: [mediaId('media-1')],
      cost: { amount: 85, split: 'total' },
      duration: { minutes: 45 },
      mode: 'train',
      notes: 'Platform 3',
      timing: {
        endDay: 3,
        endTime: '10:15',
        startDay: 2,
        startTime: '09:00'
      }
    });
    expect(transferInputFromDraft({ ...draft, timingEnabled: false }).timing).toBeUndefined();
    expect(transferInputFromDraft({ ...draft, endDay: '2' }).timing).toEqual({
      endTime: '10:15',
      startDay: 2,
      startTime: '09:00'
    });
  });
});
