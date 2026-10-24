import { Markdown } from '@groam/ui/components/markdown';
import type { ReactNode } from 'react';

/** A plan card's lower part, under the title: its notes as reading text, then a row of facts. */
export function PlanCardBody({ children, notes }: { children?: ReactNode; notes: string | null }) {
  return (
    <div className="mt-3 space-y-3 sm:ps-12">
      {notes ? (
        <Markdown className="max-w-prose break-words text-foreground/80">{notes}</Markdown>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2 empty:hidden">{children}</div>
    </div>
  );
}
