import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { MapPin, Plus } from 'lucide-react';
import {
  destinationsForDay,
  editorDayDestinations
} from '@/features/trips/hooks/editor-day-destinations';
import { useItineraryProposalChangeList } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import type {
  EditorActivitySelection,
  EditorDayCardProps,
  EditorDetailSelection
} from '@/types/itinerary-editor';
import type { PlannerDay } from '@/types/trip-planner';
import { EditorDayCanvas } from './editor-day-canvas';
import { EditorDayHeader } from './editor-day-header';
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
  return (
    <Shell.Card as="section" aria-label={`Day ${day.day} schedule`} className="overflow-hidden">
      <EditorDayHeader
        day={day.day}
        startDate={trip.startDate}
        destinations={editorDayDestinations(day, trip.destinations)}
        changes={changes}
        onManageDestination={(id) => {
          setSelection(null);
          setDetail({ kind: 'route', day: day.day, destinationId: id });
        }}
      />
      {routeDestination ? (
        <div className="border-b border-border p-4 sm:p-6">
          <EditorRouteStop {...props} destination={routeDestination} />
        </div>
      ) : null}
      {trip.destinations.length ? (
        <EditorDayCanvas
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
        <div className="border-t border-border px-6 py-10 text-center">
          <MapPin className="mx-auto size-8 text-primary" />
          <h3 className="mt-4 text-sm font-semibold">A place to start. A day to fill.</h3>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
            Choose your first destination, then turn this open day into a plan.
          </p>
          <Button className="mt-6" onClick={onAddDestination}>
            <Plus />
            Add first destination
          </Button>
        </div>
      ) : null}
    </Shell.Card>
  );
}
