import type { ReactNode } from 'react';

/** The dashed note a lane shows in place of cards when it has none. */
export function TripBoardEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}
