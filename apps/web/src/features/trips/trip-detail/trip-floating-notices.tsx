import type { ReactNode } from 'react';

/**
 * Page notices float as a card above the bottom edge. The dock stays in flow after the body, so
 * the end of the page is never hidden behind it; it hides itself when every notice renders
 * nothing.
 */
export function TripFloatingNotices({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-none sticky bottom-0 z-20 flex shrink-0 flex-col items-center gap-2 px-6 pt-2 pb-4 empty:hidden *:pointer-events-auto *:m-0 *:max-h-[60svh] *:w-full *:max-w-3xl *:overflow-y-auto *:border *:bg-popover *:shadow-lg"
      data-slot="trip-floating-notices"
    >
      {children}
    </div>
  );
}
