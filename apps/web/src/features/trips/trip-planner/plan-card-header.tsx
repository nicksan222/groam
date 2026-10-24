import type { ReactNode } from 'react';

/** The card's top row: a tile, a title, and an optional control at the end. */
export function PlanCardHeader({ children }: { children: ReactNode }) {
  return <div className="flex items-start gap-4">{children}</div>;
}
