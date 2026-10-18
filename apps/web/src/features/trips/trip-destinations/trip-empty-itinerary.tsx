import { Button } from '@groam/ui/components/button';
import { Compass, MapPin, Plus, Sun } from 'lucide-react';
import { testIds } from '@/lib/test-ids';

export function TripEmptyItinerary({ onAddDestination }: { onAddDestination?: () => void }) {
  return (
    <section
      aria-label="Empty itinerary"
      className="relative overflow-hidden rounded-2xl border border-border bg-muted/20 px-5 py-8 text-center sm:py-10"
    >
      <div
        aria-hidden
        className="relative mx-auto mb-6 flex h-24 max-w-sm items-center justify-center gap-8 sm:gap-12"
      >
        <div className="absolute inset-x-8 top-1/2 border-t border-dashed border-primary/30" />
        <div className="relative grid size-14 -rotate-12 place-items-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm">
          <Compass className="size-6" />
        </div>
        <div className="relative grid size-20 -translate-y-2 rotate-6 place-items-center rounded-3xl border border-primary/20 bg-background text-primary shadow-sm">
          <MapPin className="size-9" strokeWidth={1.5} />
        </div>
        <div className="relative grid size-14 rotate-12 place-items-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm">
          <Sun className="size-6" />
        </div>
      </div>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {onAddDestination
          ? 'Start with your first destination'
          : 'The itinerary is still wide open'}
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {onAddDestination
          ? 'Choose the first place to explore. Build the rest of your journey around it.'
          : 'Places to explore, somewhere to stay, and days to remember. This is where it all comes together.'}
      </p>
      {onAddDestination ? (
        <Button className="mt-6" data-testid={testIds.tripActionAddStop} onClick={onAddDestination}>
          <Plus /> Add first destination
        </Button>
      ) : (
        <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>Destinations</span>
          <span aria-hidden>·</span>
          <span>Stays</span>
          <span aria-hidden>·</span>
          <span>Experiences</span>
        </div>
      )}
    </section>
  );
}
