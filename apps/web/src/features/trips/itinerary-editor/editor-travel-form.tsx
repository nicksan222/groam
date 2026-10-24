import { TripTransferForm } from '@/features/trips/trip-transfer-form/trip-transfer-form';
import type {
  EditorTravelLeg,
  EditorTravelTarget,
  ItineraryEditorProps
} from '@/types/itinerary-editor';
import { travelLeg } from './editor-travel-legs';

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
