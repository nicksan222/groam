import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { CalendarDays, Plus } from 'lucide-react';
import { useState } from 'react';
import { destinationsForDay } from '@/features/trips/hooks/editor-day-destinations';
import { isPackingEntity } from '@/features/trips/hooks/itinerary-proposal-changes';
import { buildTripPlanner, entryPeriod } from '@/features/trips/hooks/trip-day-planner';
import { useItineraryProposalChangeList } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import { RemovedItinerarySection } from '@/features/trips/trip-destinations/removed-itinerary-section';
import type {
  EditorActivitySelection,
  EditorDetailSelection,
  ItineraryEditorProps
} from '@/types/itinerary-editor';
import type { PlannerDay, PlannerEntry } from '@/types/trip-planner';
import type { TripDetail } from '@/types/trips';
import { EditorDayCard } from './editor-day-card';
import { EditorRouteStop } from './editor-route-stop';

import { targetForTravel, untimedTravelDay } from './editor-travel-targets';
import { EditorTripDates } from './editor-trip-dates';

/** Untimed travel has no planner day; show it on its natural day so it can still be edited. */
function withUntimedTravel(trip: TripDetail, days: PlannerDay[], untimed: PlannerEntry[]) {
  return days.map((day) => {
    const extra = untimed.filter((entry) => {
      const target = targetForTravel(trip, entry);
      return target ? Math.min(untimedTravelDay(trip, target), days.length) === day.day : false;
    });
    return extra.length ? { ...day, entries: [...day.entries, ...extra] } : day;
  });
}

export function ItineraryEditor(props: ItineraryEditorProps) {
  const { trip, updateTrip, onOpenOverview } = props;
  const onAddDestination = props.onAddDestination ?? onOpenOverview;
  const planner = buildTripPlanner(trip);
  const days = withUntimedTravel(
    trip,
    planner.days.length ? planner.days : [{ day: 1, destinations: [], entries: [], stays: [] }],
    planner.unscheduledTravel
  );
  const changes = useItineraryProposalChangeList() ?? [];
  const [selection, setSelection] = useState<EditorActivitySelection | null>(null);
  const [detail, setDetail] = useState<EditorDetailSelection | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selectPlan = (entry: PlannerEntry, day: number) => {
    if (uploading) return;
    setSelection(null);
    if (entry.kind === 'activity') {
      const owner = trip.destinations.find((stop) =>
        stop.activities.some((activity) => activity.id === entry.activity.id)
      );
      if (owner)
        setSelection({
          destinationId: owner.id,
          activityId: entry.activity.id,
          inline: true,
          day,
          period: entryPeriod(entry, day)
        });
      setDetail(null);
      return;
    }
    if (entry.kind === 'stay') {
      const owner = trip.destinations.find((stop) =>
        stop.stays.some((stay) => stay.id === entry.stay.id)
      );
      if (owner)
        setDetail({
          kind: 'stay',
          day,
          destinationId: owner.id,
          stayId: entry.stay.id,
          entryKey: entry.key
        });
      return;
    }
    const target = targetForTravel(trip, entry);
    setDetail(
      target
        ? { kind: 'travel', day, target, entryKey: entry.key }
        : { kind: 'travel-choices', day }
    );
  };

  const addToDay = (kind: 'activity' | 'stay' | 'travel' | 'destination', day: number) => {
    if (kind === 'destination') {
      onAddDestination();
      return;
    }
    const available = destinationsForDay(trip.destinations, day);
    if (!available[0] || uploading) return;
    setSelection(null);
    if (kind === 'activity') {
      setDetail(null);
      setSelection({ destinationId: available[0].id, day, period: 'full_day', inline: true });
    } else if (kind === 'stay') {
      setDetail({ kind: 'stay', day, destinationId: available[0].id });
    } else {
      setDetail({ kind: 'travel-choices', day });
    }
  };

  // A destination opened from a day card renders there; list it only once.
  const openRouteId = detail?.kind === 'route' ? detail.destinationId : null;
  const toSchedule = planner.unscheduledDestinations.filter(
    (destination) => destination.id !== openRouteId
  );

  return (
    <Shell.Section aria-label="Itinerary editor">
      <Shell.SectionHeader
        density="compact"
        title="Itinerary"
        description="Shape each day as you go. All your plans, in one place."
        trailing={
          <Button variant="outline" size="sm" onClick={() => setDatesOpen(true)}>
            <CalendarDays />
            {trip.totalDurationDays ? 'Trip dates' : 'Set trip length'}
          </Button>
        }
      />
      <div className="space-y-4">
        {days.map((day) => (
          <EditorDayCard
            key={day.day}
            day={day}
            props={props}
            selection={selection}
            detail={detail}
            uploading={uploading}
            setSelection={setSelection}
            setDetail={setDetail}
            setUploading={setUploading}
            onAdd={addToDay}
            onEdit={selectPlan}
            onAddDestination={onAddDestination}
          />
        ))}
        {toSchedule.length ? (
          <section className="space-y-3" aria-label="Destinations to schedule">
            <h3 className="text-sm font-semibold">Destinations to schedule</h3>
            {toSchedule.map((destination) => (
              <EditorRouteStop key={destination.id} {...props} destination={destination} />
            ))}
          </section>
        ) : null}
        <RemovedItinerarySection
          changes={changes.filter(
            (change) => change.change === 'removed' && !isPackingEntity(change.entity)
          )}
        />
        <Button variant="outline" size="sm" onClick={onAddDestination}>
          <Plus />
          Add destination
        </Button>
      </div>
      {datesOpen ? (
        <EditorTripDates trip={trip} updateTrip={updateTrip} onClose={() => setDatesOpen(false)} />
      ) : null}
    </Shell.Section>
  );
}
