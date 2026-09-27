import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { CalendarDays, MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  destinationsForDay,
  editorDayDestinations
} from '@/features/trips/hooks/editor-day-destinations';
import { buildTripPlanner, entryPeriod } from '@/features/trips/hooks/trip-day-planner';
import type {
  EditorActivitySelection,
  ItineraryEditorMode,
  ItineraryEditorProps
} from '@/types/itinerary-editor';
import type { PlannerEntry } from '@/types/trip-planner';
import { EditorActivityForm } from './editor-activity-form';
import { EditorAddPlan } from './editor-add-plan';
import { EditorDayCanvas } from './editor-day-canvas';
import { EditorDayHeader } from './editor-day-header';
import { EditorDestinationSheet } from './editor-destination-sheet';
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
  const [uploading, setUploading] = useState(false);
  const [selection, setSelection] = useState<EditorActivitySelection | null>(null);
  const destination = trip.destinations.find((item) => item.id === stopId);
  const openDestination = (id: string | undefined, section: ItineraryEditorMode = 'route') => {
    setStopId(id);
    setDetailSection(section);
  };
  const selectPlan = (entry: PlannerEntry, day: number) => {
    if (uploading) return;
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
        inline: true,
        day,
        period: entryPeriod(entry, day)
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
        description="Build each day in place. Add an activity under its time of day, or select a plan to edit it here."
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
              disabled={uploading}
              hasDestinations={trip.destinations.length > 0}
              onActivity={() => setAdding(true)}
              onStay={() => openDestination(trip.destinations[0]?.id, 'stays')}
              onTravel={() => openDestination(trip.destinations[0]?.id, 'travel')}
              onDestination={onAddDestination}
            />
          </div>
          <Shell.Card className="divide-y divide-border overflow-hidden" aria-label="Trip schedule">
            {days.map((day) => {
              const available = destinationsForDay(trip.destinations, day.day);
              const active = selection?.day === day.day ? selection : null;
              const selectedDestination = trip.destinations.find(
                (item) => item.id === active?.destinationId
              );
              return (
                <section aria-label={`Day ${day.day} schedule`} key={day.day}>
                  <EditorDayHeader
                    day={day.day}
                    startDate={trip.startDate}
                    destinations={editorDayDestinations(day, trip.destinations)}
                    hasPlans={day.entries.length > 0 || day.stays.length > 0}
                    onOpenDestination={(id) => openDestination(id)}
                  />
                  {trip.destinations.length ? (
                    <EditorDayCanvas
                      activeEditor={
                        active && selectedDestination
                          ? {
                              period: active.period,
                              content: (
                                <EditorActivityForm
                                  key={`${active.activityId ?? 'new'}:${active.day}:${active.period}`}
                                  selection={active}
                                  destination={selectedDestination}
                                  destinations={available}
                                  trip={trip}
                                  actions={activityActions}
                                  onChooseDestination={(id) =>
                                    setSelection({ ...active, destinationId: id })
                                  }
                                  onClose={() =>
                                    setSelection((current) => (current === active ? null : current))
                                  }
                                  onUploadingChange={setUploading}
                                />
                              )
                            }
                          : undefined
                      }
                      canAdd={available.length > 0}
                      day={day}
                      editorLocked={uploading}
                      onAdd={(period) => {
                        if (uploading || !available[0]) return;
                        setSelection((current) =>
                          current?.day === day.day &&
                          current.period === period &&
                          !current.activityId
                            ? null
                            : { destinationId: available[0].id, day: day.day, period, inline: true }
                        );
                      }}
                      onEdit={(entry) => selectPlan(entry, day.day)}
                    />
                  ) : day.day === 1 ? (
                    <div className="border-t border-border px-6 py-10 text-center">
                      <MapPin className="mx-auto size-8 text-primary" />
                      <h3 className="mt-4 text-sm font-semibold">
                        A place to start. A day to fill.
                      </h3>
                      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
                        Choose your first destination, then turn this open day into a plan.
                      </p>
                      <Button className="mt-6" onClick={onAddDestination}>
                        <Plus />
                        Add first destination
                      </Button>
                    </div>
                  ) : null}
                </section>
              );
            })}
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
