import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { TripDestinationWithActivities } from './use-trip-activity-editor';
import { useTripActivityEditor } from './use-trip-activity-editor';

const media = vi.hoisted(() => ({ upload: vi.fn() }));

vi.mock('@/features/media/hooks/use-media-upload', () => ({
  useMediaUpload: () => media.upload
}));

const id = <Table extends 'media' | 'tripDestinationActivities' | 'tripDestinations'>(
  value: string
) => value as Id<Table>;

function destination(
  overrides: Partial<TripDestinationWithActivities> = {}
): TripDestinationWithActivities {
  return {
    activities: [],
    countryCode: 'PT',
    coverStatus: null,
    coverUrl: null,
    dayNotes: null,
    endDay: 4,
    id: id<'tripDestinations'>('destination-1'),
    sourceId: null,
    latitude: 38.72,
    longitude: -9.14,
    name: 'Lisbon, Portugal',
    placeId: 'lisbon',
    position: 0,
    startDay: 2,
    stays: [],
    transferToNext: null,
    ...overrides
  };
}

function setup(overrides: Partial<Parameters<typeof useTripActivityEditor>[0]> = {}) {
  const addActivity = vi.fn().mockResolvedValue(true);
  const updateActivity = vi.fn().mockResolvedValue(true);
  const props = {
    addActivity,
    currency: 'EUR',
    destination: destination(),
    tripDayCount: 8,
    tripStartDate: null,
    updateActivity,
    ...overrides
  };
  return { addActivity, props, updateActivity };
}

beforeEach(() => {
  vi.clearAllMocks();
  media.upload.mockResolvedValue(id<'media'>('media-new'));
});

describe('useTripActivityEditor', () => {
  test('creates an activity with a trimmed exact address', async () => {
    const { addActivity, props } = setup();
    const { result } = renderHook(() => useTripActivityEditor(props));

    act(() => {
      result.current.openNew();
      result.current.patch({
        address: '  Rua da Bica 18, Lisbon, Portugal  ',
        dayNumber: '3',
        endTime: '11:00',
        endDayNumber: '4',
        notes: '  Meet outside  ',
        startTime: '18:30',
        timeBlock: 'evening',
        title: '  Dinner reservation  '
      });
    });
    await act(() => result.current.submit());

    expect(addActivity).toHaveBeenCalledWith(id<'tripDestinations'>('destination-1'), {
      address: 'Rua da Bica 18, Lisbon, Portugal',
      attachmentIds: [],
      notes: 'Meet outside',
      schedule: {
        day: 3,
        endTime: '11:00',
        endDay: 4,
        startTime: '18:30',
        timeBlock: 'evening'
      },
      title: 'Dinner reservation'
    });
    expect(result.current.isOpen).toBe(false);
  });

  test('opens an existing activity in place and preserves all editable details', async () => {
    const activity = {
      address: 'Praça do Comércio, Lisbon',
      attachments: [
        {
          contentType: 'application/pdf',
          id: id<'media'>('media-ticket'),
          name: 'ticket.pdf',
          size: 20,
          url: 'https://example.com/ticket.pdf'
        }
      ],
      costAmount: null,
      costSplit: 'total' as const,
      dayNumber: 2,
      endTime: null,
      endDayNumber: 2,
      id: id<'tripDestinationActivities'>('activity-1'),
      sourceId: null,
      notes: 'North entrance',
      position: 0,
      startTime: null,
      timeBlock: 'morning' as const,
      title: 'Walking tour',
      transferToNext: null
    };
    const { props, updateActivity } = setup({
      destination: destination({ activities: [activity] })
    });
    const { result } = renderHook(() => useTripActivityEditor(props));

    act(() => result.current.edit(activity));
    expect(result.current).toMatchObject({
      address: 'Praça do Comércio, Lisbon',
      dayNumber: '2',
      editingId: id<'tripDestinationActivities'>('activity-1'),
      endDayNumber: '2',
      isOpen: true,
      notes: 'North entrance',
      title: 'Walking tour'
    });
    act(() => result.current.patch({ address: 'Updated exact entrance' }));
    await act(() => result.current.submit());

    expect(updateActivity).toHaveBeenCalledWith(
      id<'tripDestinationActivities'>('activity-1'),
      expect.objectContaining({ address: 'Updated exact entrance' })
    );
  });

  test('derives bounded day choices from the destination schedule', () => {
    const { props } = setup();
    const { result } = renderHook(() => useTripActivityEditor(props));
    expect(result.current.dayOptions).toEqual([2, 3, 4]);

    const unscheduled = setup({
      destination: destination({ endDay: null, startDay: null }),
      tripDayCount: 3
    });
    const fallback = renderHook(() => useTripActivityEditor(unscheduled.props));
    expect(fallback.result.current.dayOptions).toEqual([1, 2, 3]);
  });

  test('uploads in parallel, enforces five files, and reports partial failures', async () => {
    media.upload
      .mockResolvedValueOnce(id<'media'>('media-a'))
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('offline'));
    const { props } = setup();
    const { result } = renderHook(() => useTripActivityEditor(props));
    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
      new File(['c'], 'c.pdf', { type: 'application/pdf' })
    ];

    await act(() => result.current.uploadAttachments(files));
    expect(media.upload).toHaveBeenCalledTimes(3);
    expect(result.current.attachments).toEqual([{ id: id<'media'>('media-a'), name: 'a.pdf' }]);
    expect(result.current.uploadMessage).toBe('2 could not be uploaded.');

    act(() =>
      result.current.patch({
        attachments: [1, 2, 3, 4, 5].map((value) => ({
          id: id<'media'>(`media-${value}`),
          name: `${value}.pdf`
        }))
      })
    );
    await act(() => result.current.uploadAttachments([files[0]!]));
    expect(result.current.uploadMessage).toBe('Remove a file before uploading another.');
  });
});
