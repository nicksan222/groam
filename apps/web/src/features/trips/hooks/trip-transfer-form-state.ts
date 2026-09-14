import { tripCostInput, tripCostSplit } from '@/features/trips/trip-forms/trip-cost';
import type {
  InitialTransfer,
  TransferAttachmentDraft,
  TransferDraft,
  TransferFormAction,
  TransferFormState,
  TransferKind
} from '@/types/trips';
import type { TripTransferInput } from './use-trips';

export const MAX_TRANSFER_ATTACHMENTS = 5;
const MAX_TRANSFER_DURATION_MINUTES = 10_080;

export type {
  InitialTransfer,
  TransferAttachmentDraft,
  TransferDraft,
  TransferFormAction,
  TransferFormState,
  TransferKind
};

export function initialTransferDraft(
  initial: InitialTransfer | null,
  kind: TransferKind,
  minimumDay: number
): TransferDraft {
  return {
    attachments: initial?.attachments.map(({ id, name }) => ({ id, name })) ?? [],
    cost: initial?.costAmount?.toString() ?? '',
    costSplit: tripCostSplit(initial?.costSplit),
    duration: initial?.durationMinutes?.toString() ?? '',
    endDay: String(initial?.timing?.endDay ?? minimumDay),
    endTime: initial?.timing?.endTime ?? '',
    mode: initial?.mode ?? (kind === 'activity' ? 'walk' : 'train'),
    notes: initial?.notes ?? '',
    startDay: String(initial?.timing?.startDay ?? minimumDay),
    startTime: initial?.timing?.startTime ?? '',
    timingEnabled: initial?.timing !== null && initial?.timing !== undefined
  };
}

export function tripTransferFormReducer(
  state: TransferFormState,
  action: TransferFormAction
): TransferFormState {
  switch (action.type) {
    case 'changeMode':
      return { ...state, draft: { ...state.draft, mode: action.mode }, status: null };
    case 'changeSplit':
      return { ...state, draft: { ...state.draft, costSplit: action.split }, status: null };
    case 'changeText':
      return {
        ...state,
        draft: { ...state.draft, [action.field]: action.value },
        status: null
      };
    case 'changeTiming':
      return {
        ...state,
        draft: {
          ...state.draft,
          endDay: String(action.endDay),
          endTime: action.endTime,
          startDay: String(action.startDay),
          startTime: action.startTime,
          timingEnabled: true
        },
        status: null
      };
    case 'changeTimingEnabled':
      return {
        ...state,
        draft: { ...state.draft, timingEnabled: action.enabled },
        status: null
      };
    case 'appendAttachments':
      return {
        ...state,
        draft: {
          ...state.draft,
          attachments: [...state.draft.attachments, ...action.attachments]
        }
      };
    case 'removeAttachment':
      return {
        ...state,
        draft: {
          ...state.draft,
          attachments: state.draft.attachments.filter(({ id }) => id !== action.mediaId)
        },
        status: null
      };
    case 'setOperation':
      return { ...state, operation: action.operation };
    case 'setStatus':
      return { ...state, status: action.status };
  }
}

export function transferCostError(cost: string): string | null {
  if (cost === '') return null;
  const amount = Number(cost);
  if (!Number.isFinite(amount) || amount < 0) return 'Cost must be zero or more.';
  if (amount > 1_000_000_000) return 'Cost is too large.';
  return null;
}

export function transferDurationError(duration: string): string | null {
  if (duration === '') return null;
  const minutes = Number(duration);
  if (!Number.isInteger(minutes)) return 'Use a whole number of minutes.';
  if (minutes < 1) return 'Duration must be at least 1 minute.';
  if (minutes > MAX_TRANSFER_DURATION_MINUTES) return 'Duration cannot exceed 7 days.';
  return null;
}

export function transferTimingError(draft: TransferDraft): string | null {
  if (!draft.timingEnabled) return null;
  if (draft.startTime === '') return 'Add a departure time.';
  if (draft.endTime !== '' && draft.startDay === draft.endDay && draft.endTime <= draft.startTime) {
    return 'Arrival must be after departure.';
  }
  return null;
}

export function transferDraftsMatch(left: TransferDraft, right: TransferDraft): boolean {
  const timingMatches =
    !left.timingEnabled ||
    (left.endDay === right.endDay &&
      left.endTime === right.endTime &&
      left.startDay === right.startDay &&
      left.startTime === right.startTime);
  return (
    left.cost === right.cost &&
    left.costSplit === right.costSplit &&
    left.duration === right.duration &&
    left.mode === right.mode &&
    left.notes === right.notes &&
    left.timingEnabled === right.timingEnabled &&
    timingMatches &&
    left.attachments.length === right.attachments.length &&
    left.attachments.every((attachment, index) => attachment.id === right.attachments[index]?.id)
  );
}

export function transferInputFromDraft(draft: TransferDraft): TripTransferInput {
  return {
    attachmentIds: draft.attachments.map(({ id }) => id),
    cost: tripCostInput(draft.cost, draft.costSplit),
    duration: draft.duration === '' ? undefined : { minutes: Number(draft.duration) },
    mode: draft.mode,
    notes: draft.notes.trim() || undefined,
    timing: !draft.timingEnabled
      ? undefined
      : {
          ...(draft.endDay === draft.startDay ? {} : { endDay: Number(draft.endDay) }),
          ...(draft.endTime ? { endTime: draft.endTime } : {}),
          startDay: Number(draft.startDay),
          startTime: draft.startTime
        }
  };
}
