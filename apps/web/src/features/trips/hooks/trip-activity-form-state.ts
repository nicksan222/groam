import {
  DEFAULT_TRIP_COST_SPLIT,
  tripCostInput,
  tripCostSplit
} from '@/features/trips/trip-forms/trip-cost';
import type {
  ActivityAttachmentDraft,
  ActivityFormState,
  TimeBlock,
  TripActivity,
  TripActivitySubmitState,
  TripDestinationWithActivities
} from '@/types/trips';
import type { TripDestinationActivityInput } from './use-trips';

export type {
  ActivityAttachmentDraft,
  ActivityFormState,
  TimeBlock,
  TripActivity,
  TripActivitySubmitState,
  TripDestinationWithActivities
};

export function emptyActivityForm(destination: TripDestinationWithActivities): ActivityFormState {
  const firstDay = String(destination.startDay ?? 1);
  return {
    address: '',
    attachments: [],
    cost: '',
    costSplit: DEFAULT_TRIP_COST_SPLIT,
    dayNumber: firstDay,
    editingId: null,
    endDayNumber: firstDay,
    endTime: '',
    isOpen: false,
    notes: '',
    startTime: '',
    timeBlock: 'morning',
    title: ''
  };
}

export function activityFormForEdit(activity: TripActivity): ActivityFormState {
  return {
    address: activity.address ?? '',
    attachments: activity.attachments.map(({ id, name }) => ({ id, name })),
    cost: activity.costAmount?.toString() ?? '',
    costSplit: tripCostSplit(activity.costSplit),
    dayNumber: String(activity.dayNumber),
    editingId: activity.id,
    endDayNumber: String(activity.endDayNumber),
    endTime: activity.endTime ?? '',
    isOpen: true,
    notes: activity.notes ?? '',
    startTime: activity.startTime ?? '',
    timeBlock: activity.timeBlock,
    title: activity.title
  };
}

export function canSubmitTripActivity(state: TripActivitySubmitState): boolean {
  const cost = state.cost === '' ? null : Number(state.cost);
  const invalidCost = cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 1_000_000_000);
  const invalidTimeRange =
    state.endTime !== '' &&
    (state.startTime === '' ||
      (state.dayNumber === state.endDayNumber && state.endTime <= state.startTime));
  return !(
    state.isPending ||
    state.isUploading ||
    invalidCost ||
    !state.title.trim() ||
    !state.dayNumber ||
    !state.endDayNumber ||
    invalidTimeRange
  );
}

export function activityInputFromForm(form: ActivityFormState): TripDestinationActivityInput {
  const startDay = Number(form.dayNumber);
  const endDay = Number(form.endDayNumber);
  return {
    address: form.address.trim() || undefined,
    attachmentIds: form.attachments.map(({ id }) => id),
    cost: tripCostInput(form.cost, form.costSplit),
    notes: form.notes.trim() || undefined,
    schedule: {
      day: startDay,
      ...(form.endTime ? { endTime: form.endTime } : {}),
      ...(endDay === startDay ? {} : { endDay }),
      ...(form.startTime ? { startTime: form.startTime } : {}),
      timeBlock: form.timeBlock
    },
    title: form.title.trim()
  };
}

export function tripActivityEditorCopy(isEditing: boolean) {
  return isEditing
    ? {
        description: 'Update the place, timing, and documents for this plan.',
        submitLabel: 'Save activity',
        title: 'Edit activity'
      }
    : {
        description: 'Add the exact place, timing, and every useful document.',
        submitLabel: 'Add activity',
        title: 'Add activity'
      };
}
