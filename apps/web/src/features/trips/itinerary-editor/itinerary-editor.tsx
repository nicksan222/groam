import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { CalendarDays, MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import { editorDayDestinations } from '@/features/trips/hooks/editor-day-destinations';
import { buildTripPlanner } from '@/features/trips/hooks/trip-day-planner';
import type {
  EditorActivitySelection,
  ItineraryEditorMode,
  ItineraryEditorProps
} from '@/types/itinerary-editor';
import type { PlannerEntry } from '@/types/trip-planner';
import { EditorActivitySheet } from './editor-activity-sheet';
import { EditorAddPlan } from './editor-add-plan';
import { EditorDayCanvas } from './editor-day-canvas';
import { EditorDayHeader } from './editor-day-header';
import { EditorDestinationSheet } from './editor-destination-sheet';
import { EditorEmptyDay } from './editor-empty-day';
import { EditorPlanActions } from './editor-plan-actions';
import { EditorRouteSummary } from './editor-route-summary';
import { EditorTripDates } from './editor-trip-dates';

export function ItineraryEditor(props: ItineraryEditorProps) {
  const { trip, activityActions, updateTrip, onOpenOverview } = props;
  const onAddDestination = props.onAddDestination ?? onOpenOverview;
  const planner = buildTripPlanner(trip);
  const days = planner.days.length
    ? planner.days
    : [{ day: 1, destinations: [], entries: [], stays: [] }];
  const [detailSection, setDetailSection] = useState<ItineraryEditorMode>('route');
  const [stopId, setStopId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [selection, setSelection] = useState<EditorActivitySelection | null>(null);
  const destination = trip.destinations.find((item) => item.id === stopId);
  const editingDestination = trip.destinations.find((item) => item.id === selection?.destinationId);
  const openDestination = (id: string | undefined, section: ItineraryEditorMode = 'route') => {
    setStopId(id);
    setDetailSection(section);
  };
  const addActivity = () => {
    setAdding(true);
  };
  const selectPlan = (entry: PlannerEntry, day: number) => {
    const owner = trip.destinations.find((stop) =>
      entry.kind === 'activity'
        ? stop.activities.some((activity) => activity.id === entry.activity.id)
        : entry.kind === 'stay'
          ? stop.stays.some((stay) => stay.id === entry.stay.id)
          : stop.transferToNext === entry.transfer ||
            stop.activities.some((activity) => activity.transferToNext === entry.transfer)
    );
    if (entry.kind === 'activity' && owner)
      setSelection({
        destinationId: owner.id,
        activityId: entry.activity.id,
        day,
        period: entry.period
      });
    else
      openDestination(
        owner?.id ??
          (entry.kind === 'travel' && entry.transfer === trip.departureTransfer
            ? trip.destinations.at(-1)?.id
            : trip.destinations[0]?.id),
        entry.kind === 'stay' ? 'stays' : 'travel'
      );
  };
  return (
    <Shell.Section aria-label="Itinerary editor">
      <Shell.SectionHeader
        density="compact"
        title="Itinerary"
        description="The whole trip, day by day. Select any plan to edit its details."
        trailing={
          <Button variant="outline" size="sm" onClick={() => setDatesOpen(true)}>
            <CalendarDays />
            {trip.totalDurationDays ? 'Trip dates' : 'Set trip length'}
          </Button>
        }
      />
      <Shell.TwoColumns>
        <Shell.LeftColumn>
          <div className="flex justify-end py-2">
            <EditorPlanActions
              hasDestinations={trip.destinations.length > 0}
              onActivity={addActivity}
              onStay={() => openDestination(trip.destinations[0]?.id, 'stays')}
              onTravel={() => openDestination(trip.destinations[0]?.id, 'travel')}
              onDestination={onAddDestination}
            />
          </div>
          <Shell.Card className="divide-y divide-border overflow-hidden" aria-label="Trip schedule">
            {days.map((day) => (
              <section key={day.day} aria-label={`Day ${day.day} schedule`}>
                <EditorDayHeader
                  day={day.day}
                  startDate={trip.startDate}
                  destinations={editorDayDestinations(day, trip.destinations)}
                  hasPlans={day.entries.length > 0 || day.stays.length > 0}
                  onOpenDestination={(id) => openDestination(id)}
                />
                {trip.destinations.length ? (
                  <EditorDayCanvas day={day} onEdit={(entry) => selectPlan(entry, day.day)} />
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
                ) : (
                  <EditorEmptyDay />
                )}
              </section>
            ))}
          </Shell.Card>
        </Shell.LeftColumn>
        <Shell.RightColumn>
          <EditorRouteSummary
            trip={trip}
            activeIds={destination ? [destination.id] : []}
            onSelect={(id) => openDestination(id)}
          />
        </Shell.RightColumn>
      </Shell.TwoColumns>
      {adding ? (
        <EditorAddPlan
          dayCount={days.length}
          destinations={trip.destinations}
          onClose={() => setAdding(false)}
          onChoose={(next) => {
            setAdding(false);
            setSelection(next);
          }}
        />
      ) : null}
      {selection && editingDestination ? (
        <EditorActivitySheet
          key={`${selection.destinationId}:${selection.activityId ?? 'new'}:${selection.day}`}
          selection={selection}
          destination={editingDestination}
          trip={trip}
          actions={activityActions}
          onClose={() => setSelection(null)}
        />
      ) : null}
      {destination ? (
        <EditorDestinationSheet
          key={`${destination.id}:${detailSection}`}
          props={props}
          destination={destination}
          section={detailSection}
          onSelect={setStopId}
          onClose={() => setStopId(undefined)}
        />
      ) : null}
      {datesOpen ? (
        <EditorTripDates trip={trip} updateTrip={updateTrip} onClose={() => setDatesOpen(false)} />
      ) : null}
    </Shell.Section>
  );
}
