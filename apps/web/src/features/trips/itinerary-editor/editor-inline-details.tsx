import { destinationsForDay } from '@/features/trips/hooks/editor-day-destinations';
import type { EditorDayCardProps } from '@/types/itinerary-editor';
import { EditorActivityForm } from './editor-activity-form';
import { EditorStayForm } from './editor-stay-form';
import { EditorTravelChoices } from './editor-travel-choices';
import { EditorTravelForm } from './editor-travel-form';

export function EditorInlineDetails({
  day,
  props,
  selection,
  detail,
  setSelection,
  setDetail,
  setUploading
}: EditorDayCardProps) {
  const { trip, activityActions } = props;
  const active = selection?.day === day.day ? selection : null;
  const selectedDetail = detail?.day === day.day ? detail : null;
  if (active) {
    const destination = trip.destinations.find((item) => item.id === active.destinationId);
    if (!destination) return null;
    const destinations = destinationsForDay(trip.destinations, day.day);
    return (
      <EditorActivityForm
        key={`${active.activityId ?? 'new'}:${active.day}:${active.period}`}
        selection={active}
        destination={destination}
        destinations={destinations}
        trip={trip}
        actions={activityActions}
        onChooseDestination={(id) => setSelection({ ...active, destinationId: id })}
        onClose={() => setSelection((current) => (current === active ? null : current))}
        onUploadingChange={setUploading}
      />
    );
  }
  if (selectedDetail?.kind === 'stay') {
    const destination = trip.destinations.find((item) => item.id === selectedDetail.destinationId);
    if (!destination) return null;
    return (
      <EditorStayForm
        key={`${selectedDetail.destinationId}:${selectedDetail.stayId ?? 'new'}`}
        props={props}
        destination={destination}
        day={day.day}
        stayId={selectedDetail.stayId}
        onClose={() => setDetail((current) => (current === selectedDetail ? null : current))}
      />
    );
  }
  if (selectedDetail?.kind === 'travel')
    return (
      <EditorTravelForm
        key={`${selectedDetail.target.kind}:${selectedDetail.target.fromId ?? ''}`}
        props={props}
        target={selectedDetail.target}
        onClose={() => setDetail((current) => (current === selectedDetail ? null : current))}
      />
    );
  if (selectedDetail?.kind === 'travel-choices')
    return (
      <EditorTravelChoices
        trip={trip}
        day={day.day}
        onChoose={(target) => setDetail({ kind: 'travel', day: day.day, target })}
        onClose={() => setDetail(null)}
      />
    );
  return null;
}
