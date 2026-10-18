import { TripTransferForm } from '@/features/trips/trip-transfer-form/trip-transfer-form';
import type {
  EditorTravelLeg,
  EditorTravelTarget,
  ItineraryEditorProps
} from '@/types/itinerary-editor';

function boundaryLeg(
  props: ItineraryEditorProps,
  target: EditorTravelTarget
): EditorTravelLeg | null {
  const { trip, activityActions: actions } = props;
  if (target.kind === 'arrival') {
    const destination = trip.destinations[0];
    if (!destination) return null;
    return {
      fromLabel: 'Trip origin',
      toLabel: destination.name,
      transfer: trip.arrivalTransfer,
      kind: 'destination',
      minimumDay: 1,
      maximumDay: destination.startDay ?? 1,
      save: (input) => actions.setBoundaryTransfer('arrival', input),
      remove: () =>
        trip.arrivalTransfer
          ? actions.removeBoundaryTransfer(trip.arrivalTransfer.id)
          : Promise.resolve(false)
    };
  }
  if (target.kind === 'departure') {
    const destination = trip.destinations.at(-1);
    if (!destination) return null;
    const minimumDay = destination.endDay ?? 1;
    return {
      fromLabel: destination.name,
      toLabel: 'Return destination',
      transfer: trip.departureTransfer,
      kind: 'destination',
      minimumDay,
      maximumDay: trip.totalDurationDays ?? minimumDay,
      save: (input) => actions.setBoundaryTransfer('departure', input),
      remove: () =>
        trip.departureTransfer
          ? actions.removeBoundaryTransfer(trip.departureTransfer.id)
          : Promise.resolve(false)
    };
  }
  return null;
}

function travelLeg(
  props: ItineraryEditorProps,
  target: EditorTravelTarget
): EditorTravelLeg | null {
  if (target.kind === 'arrival' || target.kind === 'departure') return boundaryLeg(props, target);
  const { trip, activityActions: actions } = props;
  if (target.kind === 'destination') {
    const index = trip.destinations.findIndex((item) => item.id === target.fromId);
    const destination = trip.destinations[index];
    const next = trip.destinations[index + 1];
    if (!destination || !next) return null;
    const transfer = destination.transferToNext;
    return {
      fromLabel: destination.name,
      toLabel: next.name,
      transfer,
      kind: 'destination',
      minimumDay: destination.endDay ?? 1,
      maximumDay: next.startDay ?? destination.endDay ?? 1,
      save: (input) => actions.setDestinationTransfer(destination.id, next.id, input),
      remove: () =>
        transfer ? actions.removeDestinationTransfer(transfer.id) : Promise.resolve(false)
    };
  }
  const destination = trip.destinations.find((item) =>
    item.activities.some((activity) => activity.id === target.fromId)
  );
  const index =
    destination?.activities.findIndex((activity) => activity.id === target.fromId) ?? -1;
  const activity = destination?.activities[index];
  const next = destination?.activities[index + 1];
  if (!activity || !next) return null;
  const transfer = activity.transferToNext;
  return {
    fromLabel: activity.title,
    toLabel: next.title,
    transfer,
    kind: 'activity',
    minimumDay: activity.endDayNumber,
    maximumDay: next.dayNumber,
    save: (input) => actions.setActivityTransfer(activity.id, next.id, input),
    remove: () => (transfer ? actions.removeActivityTransfer(transfer.id) : Promise.resolve(false))
  };
}

export function EditorTravelForm({
  props,
  target,
  onClose
}: {
  props: ItineraryEditorProps;
  target: EditorTravelTarget;
  onClose: () => void;
}) {
  const leg = travelLeg(props, target);
  if (!leg) return null;
  const save: EditorTravelLeg['save'] = async (input) => {
    const saved = await leg.save(input);
    if (saved) onClose();
    return saved;
  };
  const remove = async () => {
    const removed = await leg.remove();
    if (removed) onClose();
    return removed;
  };
  return (
    <section
      aria-label={leg.transfer ? 'Edit travel' : 'Add travel'}
      className="rounded-xl border border-border bg-card"
    >
      <TripTransferForm
        currency={props.trip.currency}
        fromLabel={leg.fromLabel}
        initial={leg.transfer}
        kind={leg.kind}
        maximumDay={Math.max(leg.minimumDay, leg.maximumDay)}
        minimumDay={leg.minimumDay}
        onCancel={onClose}
        onRemove={remove}
        onSave={save}
        toLabel={leg.toLabel}
        tripStartDate={props.trip.startDate}
      />
    </section>
  );
}
