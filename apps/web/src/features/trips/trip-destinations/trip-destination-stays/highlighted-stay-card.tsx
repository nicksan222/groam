import { stayChangeKey } from '@/features/trips/hooks/itinerary-proposal-changes';
import { useItineraryChange } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import { StayCard } from './stay-card';
import type { Stay } from './stay-types';

export function HighlightedStayCard({
  canManage,
  currency,
  onEdit,
  onRemove,
  stay,
  tripStartDate
}: {
  canManage: boolean;
  currency: string;
  onEdit: () => void;
  onRemove: () => void;
  stay: Stay;
  tripStartDate: null | string;
}) {
  const change = useItineraryChange(stayChangeKey(stay));
  return (
    <ItineraryProposalHighlight change={change}>
      <StayCard
        canManage={canManage}
        currency={currency}
        onEdit={onEdit}
        onRemove={onRemove}
        stay={stay}
        tripStartDate={tripStartDate}
      />
    </ItineraryProposalHighlight>
  );
}
