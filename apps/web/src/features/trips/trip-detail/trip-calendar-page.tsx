import { addIsoDays, type PlanCalendarSlot } from '@groam/ui/lib/plan-calendar';
import { useState } from 'react';
import { buildTripPlanner } from '@/features/trips/hooks/trip-day-planner';
import { buildTripPlanCalendar } from '@/features/trips/hooks/trip-plan-calendar';
import { usePendingCalendarActivity } from '@/features/trips/hooks/use-pending-calendar-activity';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { CalendarActivityDialog } from '@/features/trips/trip-calendar/calendar-activity-dialog';
import { calendarActivityDraft } from '@/features/trips/trip-calendar/calendar-slot';
import { TripEmptyItinerary } from '@/features/trips/trip-destinations/trip-empty-itinerary';
import { TripPlanCalendar } from '@/features/trips/trip-planner/trip-plan-calendar';
import { testIds } from '@/lib/test-ids';
import type { CalendarActivityDraft, TripCalendarPlanning } from '@/types/trip-planner';
import { TripSectionPanel } from './trip-section-panel';

/** The activity being planned, drawn where it will go while its dialog is open. */
const DRAFT_ID = 'calendar-draft';

/**
 * The Calendar tab: the whole plan at a glance on a calendar. Clicking or dragging across empty
 * time plans an activity there (see `TripCalendarPlanning`); without `planning` it is read-only.
 * `day` (from `?day=N`) opens the calendar on that trip day. With `fill` the calendar takes the
 * whole page and scrolls inside itself; without it, as inside an idea, it is a framed block.
 */
export function TripCalendarPage({
  day,
  fill = false,
  planning,
  trip
}: {
  day?: number;
  fill?: boolean;
  planning?: TripCalendarPlanning;
  trip: TripDetail;
}) {
  const [draft, setDraft] = useState<{ draft: CalendarActivityDraft; slot: PlanCalendarSlot }>();
  usePendingCalendarActivity({
    addActivity: planning?.mode === 'add' ? planning.addActivity : undefined,
    proposalId: planning?.mode === 'add' ? planning.proposalId : undefined,
    trip
  });
  const planner = buildTripPlanner(trip);
  const calendar = planner.days.length ? buildTripPlanCalendar(trip, planner) : null;
  const initialDate = calendar && day ? addIsoDays(calendar.startDate, day - 1) : undefined;
  const events =
    calendar && draft
      ? [
          ...calendar.events,
          { id: DRAFT_ID, title: 'New activity', tone: 'activity' as const, ...draft.slot }
        ]
      : calendar?.events;

  const plan = (slot: PlanCalendarSlot) => {
    if (!calendar || draft) return;
    setDraft({ draft: calendarActivityDraft(calendar.startDate, slot), slot });
  };
  const submit: Parameters<typeof CalendarActivityDialog>[0]['onSubmit'] = async (
    destination,
    input
  ) => {
    if (!planning) return false;
    if (planning.mode === 'add') return planning.addActivity(destination.id, input);
    // The idea holds it once started; cancelling the start leaves nothing behind.
    planning.startIdea({ input, sourceDestinationId: destination.id });
    return true;
  };

  return (
    <TripSectionPanel fill={fill} testId={testIds.tripCalendarPage} title="Calendar">
      {calendar && events ? (
        <TripPlanCalendar
          calendar={{ ...calendar, events }}
          fill={fill}
          initialDate={initialDate}
          onCreate={planning ? plan : undefined}
        />
      ) : (
        <TripEmptyItinerary />
      )}
      {planning && draft ? (
        <CalendarActivityDialog
          draft={draft.draft}
          mode={planning.mode}
          onClose={() => setDraft(undefined)}
          onSubmit={submit}
          trip={trip}
        />
      ) : null}
    </TripSectionPanel>
  );
}
