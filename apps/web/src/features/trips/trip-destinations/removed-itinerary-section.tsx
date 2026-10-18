import Shell from '@groam/ui/components/shell/client';
import type { ItineraryChange } from '@/features/trips/hooks/itinerary-proposal-changes';
import { RemovedItineraryItem } from '@/features/trips/itinerary-proposal-highlight/removed-itinerary-item';

export function RemovedItinerarySection({ changes }: { changes: ItineraryChange[] }) {
  if (changes.length === 0) return null;
  return (
    <section aria-label="Removed from shared trip" className="mt-4 space-y-3">
      <Shell.Eyebrow tone="section">Removed from shared trip</Shell.Eyebrow>
      {changes.map((change) => (
        <RemovedItineraryItem change={change} key={change.key} />
      ))}
    </section>
  );
}
