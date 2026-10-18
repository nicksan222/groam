import { Button } from '@groam/ui/components/button';
import { ArrowRight, Route, X } from 'lucide-react';
import type { EditorTravelTarget } from '@/types/itinerary-editor';
import type { TripDetail } from '@/types/trips';
import { travelChoicesForDay } from './editor-travel-targets';

export function EditorTravelChoices({
  trip,
  day,
  onChoose,
  onClose
}: {
  trip: TripDetail;
  day: number;
  onChoose: (target: EditorTravelTarget) => void;
  onClose: () => void;
}) {
  const choices = travelChoicesForDay(trip, day);
  return (
    <section
      aria-label={`Add travel to Day ${day}`}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">Add travel to Day {day}</h4>
        <Button aria-label="Close travel choices" size="icon-sm" variant="ghost" onClick={onClose}>
          <X />
        </Button>
      </div>
      {choices.length ? (
        <div className="grid gap-2">
          {choices.map(({ label, target }) => (
            <Button
              key={`${target.kind}:${target.fromId ?? ''}`}
              variant="outline"
              className="h-auto justify-start py-3 text-left"
              onClick={() => onChoose(target)}
            >
              <Route className="text-primary" />
              {label}
              <ArrowRight className="ml-auto" />
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          All available journeys for this day are planned.
        </p>
      )}
    </section>
  );
}
