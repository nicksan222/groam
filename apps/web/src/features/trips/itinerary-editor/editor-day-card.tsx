import { MapPin, Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Heading } from '@groam/ui/components/heading';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import {
  destinationsForDay,
  editorDayDestinations
} from '@/features/trips/hooks/editor-day-destinations';
import { plannerDate } from '@/features/trips/hooks/trip-day-planner';
import { useItineraryProposalChangeList } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import { PlannerDayFrame } from '@/features/trips/trip-planner/planner-day-frame';
import type {
  EditorActivitySelection,
  EditorDayCardProps,
  EditorDetailSelection
} from '@/types/itinerary-editor';
import type { PlannerDay } from '@/types/trip-planner';
import { EditorDayCanvas } from './editor-day-canvas';
import { EditorDayPlaces } from './editor-day-places';
import { EditorInlineDetails } from './editor-inline-details';
import { EditorRouteStop } from './editor-route-stop';

function activeEntryKey(
  day: PlannerDay,
  activity: EditorActivitySelection | null,
  detail: EditorDetailSelection | null
) {
  if (activity?.activityId)
    return day.entries.find(
      (entry) => entry.kind === 'activity' && entry.activity.id === activity.activityId
    )?.key;
  return detail && 'entryKey' in detail ? detail.entryKey : undefined;
}

export function EditorDayCard(cardProps: EditorDayCardProps) {
  const {
    day,
    props,
    selection,
    detail,
    uploading,
    setSelection,
    setDetail,
    onAdd,
    onEdit,
    onAddDestination
  } = cardProps;
  const { trip } = props;
  const changes = useItineraryProposalChangeList() ?? [];
  const available = destinationsForDay(trip.destinations, day.day);
  const active = selection?.day === day.day ? selection : null;
  const selectedDetail = detail?.day === day.day ? detail : null;
  const routeDestination =
    selectedDetail?.kind === 'route'
      ? trip.destinations.find((item) => item.id === selectedDetail.destinationId)
      : undefined;
  const entryKey = activeEntryKey(day, active, selectedDetail);
  const hasInlineEditor =
    active !== null || (selectedDetail !== null && selectedDetail.kind !== 'route');
  const primary = editorDayDestinations(day, trip.destinations);
  const date = plannerDate(trip.startDate, day.day);
  return (
    <PlannerDayFrame
      ariaLabel={`Day ${day.day} schedule`}
      date={date}
      day={day.day}
      photo={primary[0] ? { name: primary[0].name, src: primary[0].coverUrl } : undefined}
      subtitle={
        <EditorDayPlaces
          changes={changes}
          day={day.day}
          destinations={primary}
          onManageDestination={(id) => {
            setSelection(null);
            setDetail({ kind: 'route', day: day.day, destinationId: id });
          }}
        />
      }
    >
      {routeDestination ? (
        <div className="border-b border-border p-4 sm:p-6">
          <EditorRouteStop {...props} destination={routeDestination} />
        </div>
      ) : null}
      {trip.destinations.length ? (
        <EditorDayCanvas
          currency={trip.currency}
          day={day}
          canAdd={available.length > 0}
          editorLocked={uploading}
          activeEditor={
            hasInlineEditor
              ? { entryKey, content: <EditorInlineDetails {...cardProps} /> }
              : undefined
          }
          onAdd={(kind) => onAdd(kind, day.day)}
          onEdit={(entry) => onEdit(entry, day.day)}
        />
      ) : day.day === 1 ? (
        <div className="border-t border-border px-6 py-12 text-center">
          <MapPin className="mx-auto size-8 text-primary" />
          <Heading level={3} size="sm" className="mt-4">
            A place to start. A day to fill.
          </Heading>
          <MutedCopy size="xs" className="mx-auto mt-2 max-w-sm">
            Choose your first destination, then turn this open day into a plan.
          </MutedCopy>
          <Button className="mt-6" onClick={onAddDestination}>
            <Plus />
            Add first destination
          </Button>
        </div>
      ) : null}
    </PlannerDayFrame>
  );
}
