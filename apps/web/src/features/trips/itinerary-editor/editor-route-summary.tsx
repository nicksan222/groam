import Shell from '@groam/ui/components/shell/client';
import { destinationChangeKey } from '@/features/trips/hooks/itinerary-proposal-changes';
import { useItineraryProposalChangeList } from '@/features/trips/hooks/use-itinerary-proposal-changes';
import { ItineraryProposalHighlight } from '@/features/trips/itinerary-proposal-highlight/itinerary-proposal-highlight';
import { RemovedItinerarySection } from '@/features/trips/trip-destinations/removed-itinerary-section';
import type { Destination, TripDetail } from '@/types/trips';
import { EditorDestinationPhoto } from './editor-destination-photo';
export function EditorRouteSummary({
  trip,
  activeIds = [],
  onSelect
}: {
  trip: TripDetail;
  activeIds?: Destination['id'][];
  onSelect: (id: Destination['id']) => void;
}) {
  const changes = useItineraryProposalChangeList();
  const activeStops = new Set(activeIds);
  return (
    <Shell.Card padding="md" stack="md">
      <Shell.SectionHeader
        density="compact"
        title="Your route"
        description={
          <>
            {trip.totalDurationDays
              ? `${trip.totalDurationDays} ${trip.totalDurationDays === 1 ? 'day' : 'days'}`
              : 'Length open'}{' '}
            · {trip.destinations.length}{' '}
            {trip.destinations.length === 1 ? 'destination' : 'destinations'}
          </>
        }
      />
      <ol className="space-y-2">
        {trip.destinations.map((stop, index) => (
          <li key={stop.id}>
            <ItineraryProposalHighlight
              change={changes?.find((item) => item.key === destinationChangeKey(stop)) ?? null}
            >
              <button
                type="button"
                aria-pressed={activeStops.has(stop.id)}
                onClick={() => {
                  onSelect(stop.id);
                }}
                className="group flex w-full items-center gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted/50 aria-pressed:border-primary/20 aria-pressed:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="relative shrink-0">
                  <EditorDestinationPhoto
                    src={stop.coverUrl}
                    name=""
                    className="size-16 rounded-lg"
                  />
                  <span className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full border border-border bg-background text-[10px] font-semibold shadow-sm">
                    {index + 1}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block break-words text-sm font-medium">{stop.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {stop.startDay
                      ? stop.startDay === stop.endDay
                        ? `Day ${stop.startDay}`
                        : `Days ${stop.startDay}–${stop.endDay}`
                      : 'Days not assigned'}
                  </span>
                </span>
              </button>
            </ItineraryProposalHighlight>
          </li>
        ))}
      </ol>
      <RemovedItinerarySection
        changes={(changes ?? []).filter(
          (change) => change.change === 'removed' && change.entity !== 'packing'
        )}
      />
      {!trip.destinations.length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Your destinations will appear here as you build the idea.
        </p>
      ) : null}
    </Shell.Card>
  );
}
