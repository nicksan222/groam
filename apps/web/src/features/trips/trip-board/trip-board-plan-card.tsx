import type { Id } from '@groam/backend/data-model';
import { cardChip, cardStretchedLink } from '@groam/ui/lib/board-card';
import { MapPin } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';
import type { AgreedCard } from '@/types/trip-board';
import { TripBoardCard } from './trip-board-card';

/** One agreed stop or entry; the title links to that day on the plan page. */
export function TripBoardPlanCard({ card, tripId }: { card: AgreedCard; tripId: Id<'trips'> }) {
  return (
    <TripBoardCard
      chips={
        <span className={cardChip}>
          {card.kind === 'stop' ? <MapPin aria-hidden="true" /> : null}
          {card.label}
        </span>
      }
      description={card.detail && card.detail !== card.title ? card.detail : null}
      title={
        <Link
          className={cardStretchedLink}
          params={{ section: 'overview', tripId }}
          search={{ day: card.day }}
          to="/trips/$tripId/$section"
        >
          {card.title}
        </Link>
      }
    />
  );
}
