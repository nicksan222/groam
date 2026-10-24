import { TripResearchSection } from '@/features/research/research-list/trip-research-section';
import { QueuePanel } from '@/features/trip-queue/queue-panel';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { TripMapPage } from '@/features/trips/trip-map/trip-map-page';
import { TripPackingPanel } from '@/features/trips/trip-packing/trip-packing-panel';
import { TripPeoplePanel } from '@/features/trips/trip-people/trip-people-panel';
import { TripPlanPanel } from '@/features/trips/trip-plan/trip-plan-panel';
import type { TripTabSection } from '@/features/trips/trip-sections';
import type { PollFeed } from '@/types/queue';
import type { PlannedCalendarActivity } from '@/types/trips';
import { TripCalendarPage } from './trip-calendar-page';
import { TripHistoryPage } from './trip-history-page';

/** One section of a shared trip (see `tripSectionConfig`). */
export function ActiveTripSection({
  day,
  onStartCalendarIdea,
  onStartPackingIdea,
  onStartVersion,
  pollFeed,
  section,
  startingIdea,
  trip
}: {
  day?: number;
  onStartPackingIdea?: (claimGear?: string) => void;
  /** Starts an idea that opens on its calendar, for an activity planned on this one. */
  onStartCalendarIdea?: (activity: PlannedCalendarActivity) => void;
  onStartVersion?: () => void;
  /** The trip's polls, opened once by the page and shared with the assistant's context. */
  pollFeed?: PollFeed;
  section: TripTabSection;
  startingIdea?: boolean;
  trip: TripDetail;
}) {
  const archived = trip.archivedAt !== null;
  switch (section) {
    case 'activity':
      return <TripHistoryPage trip={trip} />;
    case 'calendar':
      return (
        <TripCalendarPage
          day={day}
          fill
          planning={
            onStartCalendarIdea && !archived && trip.permissions.canPropose && !trip.proposal
              ? { mode: 'propose', startIdea: onStartCalendarIdea }
              : undefined
          }
          trip={trip}
        />
      );
    case 'map':
      return <TripMapPage trip={trip} />;
    case 'ideas':
      return <QueuePanel key="idea" kind="idea" onStartIdea={onStartVersion} trip={trip} />;
    case 'issues':
      return <QueuePanel key="issue" kind="issue" trip={trip} />;
    case 'polls':
      return <QueuePanel key="poll" kind="poll" pollFeed={pollFeed} trip={trip} />;
    case 'packing':
      return (
        <TripPackingPanel
          onStartPackingIdea={onStartPackingIdea}
          startingIdea={startingIdea}
          trip={trip}
        />
      );
    case 'people':
      return <TripPeoplePanel trip={trip} />;
    case 'plan':
      return <TripPlanPanel day={day} trip={trip} />;
    case 'research':
      return <TripResearchSection archived={archived} tripId={trip.id} />;
  }
}
