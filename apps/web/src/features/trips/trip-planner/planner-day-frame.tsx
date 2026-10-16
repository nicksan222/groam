import { EditorDestinationPhoto } from '@/features/trips/itinerary-editor/editor-destination-photo';
import type { PlannerDayFrameProps } from '@/types/trip-planner';

/** One day as a compact card: numbered header with place line and photo, body below. */
export function PlannerDayFrame({
  ariaLabel,
  children,
  date,
  day,
  photo,
  subtitle
}: PlannerDayFrameProps) {
  return (
    <section
      aria-label={ariaLabel}
      className="min-w-0 scroll-mt-6 overflow-hidden rounded-lg border border-border bg-card"
      data-slot="planner-day"
      id={`trip-day-${day}`}
      tabIndex={-1}
    >
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-2.5 sm:px-5">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold tabular-nums text-primary"
        >
          {day}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold tracking-tight">
            Day {day}
            {date ? (
              <span className="text-xs font-normal text-muted-foreground">{date}</span>
            ) : null}
          </h3>
          <div className="min-w-0 truncate text-xs text-muted-foreground">{subtitle}</div>
        </div>
        {photo?.src ? (
          <EditorDestinationPhoto
            className="hidden h-9 w-14 shrink-0 rounded sm:block"
            name={photo.name}
            src={photo.src}
          />
        ) : null}
      </header>
      {children}
    </section>
  );
}
