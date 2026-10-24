import type { ReactNode } from 'react';

/** A number set in tabular figures, so the surrounding words keep their normal spacing. */
export function PackingCount({ children }: { children: ReactNode }) {
  return <span className="tabular-nums">{children}</span>;
}
