import type { ReactNode } from 'react';
import { TripPassNotch } from './trip-pass-notch';

/**
 * The pass's tear-off stub: "Your seat", its value, and a small line. A dashed divider with two
 * notches in the page colour separates it from the pass: vertical from the wide container,
 * horizontal before that.
 */
export function TripPassStub({
  children,
  value
}: {
  /** The small line: who made the seat free, or the pay button. */
  children?: ReactNode;
  value: string;
}) {
  return (
    <div className="relative flex shrink-0 flex-row items-baseline justify-center gap-2 border-t-[1.5px] border-dashed border-input px-4 py-3 @3xl/people:w-56 @3xl/people:flex-col @3xl/people:items-start @3xl/people:justify-center @3xl/people:gap-1 @3xl/people:border-t-0 @3xl/people:border-l-[1.5px] @3xl/people:px-6 @3xl/people:py-0">
      <TripPassNotch className="-top-2 -left-2" surface="background" />
      <TripPassNotch
        className="-top-2 -right-2 @3xl/people:top-auto @3xl/people:right-auto @3xl/people:-bottom-2 @3xl/people:-left-2"
        surface="background"
      />
      <span className="text-xs text-muted-foreground">Your seat</span>
      <span className="text-base font-semibold @3xl/people:text-xl @3xl/people:leading-tight">
        {value}
      </span>
      {children ? <span className="text-xs text-muted-foreground">{children}</span> : null}
    </div>
  );
}
