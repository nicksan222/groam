import { tripCostInput, tripCostSplit } from '@/features/trips/trip-forms/trip-cost';
import type {
  DestinationMoveClearsTravel,
  DestinationScheduleDraft,
  DestinationScheduleSource,
  StayDraft,
  StaySource
} from '@/types/trips';
import type { TripDestinationSchedule, TripStayInput } from './use-trips';

export type {
  DestinationMoveClearsTravel,
  DestinationScheduleDraft,
  DestinationScheduleSource,
  StayDraft,
  StaySource
};

export function destinationScheduleDraft(
  destination: DestinationScheduleSource
): DestinationScheduleDraft {
  return {
    endDay: destination.endDay?.toString() ?? '',
    notes: destination.dayNotes ?? '',
    startDay: destination.startDay?.toString() ?? ''
  };
}

export function canSaveDestinationSchedule(draft: DestinationScheduleDraft): boolean {
  return (draft.startDay === '') === (draft.endDay === '');
}

export function destinationScheduleHasChanged(
  draft: DestinationScheduleDraft,
  destination: DestinationScheduleSource
) {
  const initial = destinationScheduleDraft(destination);
  return (
    draft.endDay !== initial.endDay ||
    draft.notes !== initial.notes ||
    draft.startDay !== initial.startDay
  );
}

export function destinationScheduleFromDraft(
  draft: DestinationScheduleDraft
): TripDestinationSchedule {
  const hasSchedule = draft.startDay !== '' && draft.endDay !== '';
  return {
    dayNotes: draft.notes.trim() || undefined,
    ...(hasSchedule ? { endDay: Number(draft.endDay), startDay: Number(draft.startDay) } : {})
  };
}

export function stayDraftFor(
  destination: { endDay: null | number; startDay: null | number },
  stay?: StaySource
): StayDraft {
  const firstDay = destination.startDay ?? 1;
  return {
    address: stay?.address ?? '',
    attachments: stay?.attachments.map(({ id, name }) => ({ id, name })) ?? [],
    checkInDay: String(stay?.checkInDay ?? firstDay),
    checkInTime: stay?.checkInTime ?? '',
    checkOutDay: String(stay?.checkOutDay ?? destination.endDay ?? firstDay),
    checkOutTime: stay?.checkOutTime ?? '',
    cost: stay?.costAmount?.toString() ?? '',
    costSplit: tripCostSplit(stay?.costSplit),
    notes: stay?.notes ?? '',
    title: stay?.title ?? ''
  };
}

export function stayCostError(cost: string): string | null {
  if (cost === '') return null;
  const amount = Number(cost);
  if (!Number.isFinite(amount) || amount < 0) return 'Cost must be zero or more.';
  if (amount > 1_000_000_000) return 'Cost is too large.';
  return null;
}

export function canSubmitStay(draft: StayDraft): boolean {
  const checkInDay = Number(draft.checkInDay);
  const checkOutDay = Number(draft.checkOutDay);
  const invalidRange =
    !Number.isInteger(checkInDay) ||
    !Number.isInteger(checkOutDay) ||
    checkOutDay < checkInDay ||
    (checkOutDay === checkInDay &&
      draft.checkOutTime !== '' &&
      (draft.checkInTime === '' || draft.checkOutTime <= draft.checkInTime));
  return draft.title.trim() !== '' && stayCostError(draft.cost) === null && !invalidRange;
}

export function stayInputFromDraft(draft: StayDraft): TripStayInput {
  return {
    address: draft.address.trim() || undefined,
    attachmentIds: draft.attachments.map(({ id }) => id),
    cost: tripCostInput(draft.cost, draft.costSplit),
    notes: draft.notes.trim() || undefined,
    schedule: {
      checkInDay: Number(draft.checkInDay),
      ...(draft.checkInTime ? { checkInTime: draft.checkInTime } : {}),
      checkOutDay: Number(draft.checkOutDay),
      ...(draft.checkOutTime ? { checkOutTime: draft.checkOutTime } : {})
    },
    title: draft.title.trim()
  };
}

export function destinationMoveClearsTravel(
  destinations: readonly { transferToNext: unknown }[],
  index: number,
  hasArrivalTransfer: boolean,
  hasDepartureTransfer: boolean
): DestinationMoveClearsTravel {
  const lastIndex = destinations.length - 1;
  const hasTransferAround = (from: number, to: number) =>
    destinations.slice(Math.max(0, from), to).some((item) => item.transferToNext !== null);
  return {
    earlier:
      hasTransferAround(index - 2, index + 1) ||
      (index === 1 && hasArrivalTransfer) ||
      (index === lastIndex && hasDepartureTransfer),
    later:
      hasTransferAround(index - 1, index + 2) ||
      (index === 0 && hasArrivalTransfer) ||
      (index === lastIndex - 1 && hasDepartureTransfer)
  };
}
