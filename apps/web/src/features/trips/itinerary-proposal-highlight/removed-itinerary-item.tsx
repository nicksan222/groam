import {
  compactChangeSummary,
  type ItineraryChange
} from '@/features/trips/hooks/itinerary-proposal-changes';
import { ItineraryProposalHighlight } from './itinerary-proposal-highlight';

export function RemovedItineraryItem({ change }: { change: ItineraryChange }) {
  const summary = compactChangeSummary(change);
  return (
    <ItineraryProposalHighlight change={change}>
      <article>
        <h3 className="text-sm font-semibold">{change.label}</h3>
        {summary ? <p className="mt-1 text-xs text-muted-foreground">{summary}</p> : null}
      </article>
    </ItineraryProposalHighlight>
  );
}
