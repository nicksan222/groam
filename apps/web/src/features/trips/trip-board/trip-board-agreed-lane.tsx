import { Button } from '@groam/ui/components/button';
import { ArrowRight } from 'lucide-react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { AgreedDay } from '@/types/trip-board';
import { agreedCardCount } from './agreed-days';
import { TripBoardEmpty } from './trip-board-empty';
import { TripBoardGlance } from './trip-board-glance';
import { TripBoardLane } from './trip-board-lane';
import { TripBoardPlanCard } from './trip-board-plan-card';

/** What the group has settled: the trip at a glance, then the agreed itinerary under day headings. */
export function TripBoardAgreedLane({ days, trip }: { days: AgreedDay[]; trip: TripDetail }) {
  return (
    <TripBoardLane
      count={agreedCardCount(days)}
      footer={
        <Button
          asChild
          className="text-muted-foreground"
          data-testid={testIds.tripBoardPlanLink}
          size="sm"
          variant="ghost"
        >
          <Link params={{ section: 'overview', tripId: trip.id }} to="/trips/$tripId/$section">
            See the full plan
            <ArrowRight />
          </Link>
        </Button>
      }
      lane="agreed"
    >
      <TripBoardGlance trip={trip} />
      {days.length === 0 ? (
        <TripBoardEmpty>
          Nothing agreed yet. Ideas land here once the group applies them.
        </TripBoardEmpty>
      ) : (
        days.map(({ cards, day }) => (
          <section aria-labelledby={`agreed-day-${day}`} className="flex flex-col gap-2" key={day}>
            <h3
              className="px-1 pt-1 text-xs font-semibold text-muted-foreground"
              id={`agreed-day-${day}`}
            >
              Day {day}
            </h3>
            {cards.map((card) => (
              <TripBoardPlanCard card={card} key={card.key} tripId={trip.id} />
            ))}
          </section>
        ))
      )}
    </TripBoardLane>
  );
}
