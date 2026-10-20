import { cardMetaRow, cardSurface, cardTitle } from '@groam/ui/lib/board-card';
import { cn } from '@groam/ui/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

/**
 * The shared card for the board's idea, plan and glance cards, laid out like an issue card: a
 * title, an optional description, and a row of lozenges at the bottom, led by the status.
 */
export function TripBoardCard({
  aside,
  chips,
  className,
  description,
  title,
  ...props
}: Omit<ComponentProps<'article'>, 'children' | 'title'> & {
  /** Leads the chip row, for example a status lozenge. */
  aside?: ReactNode;
  /** The facts that close the card, each a `cardChip`. */
  chips?: ReactNode;
  /** Muted text under the title. */
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <article {...props} className={cn(cardSurface, 'flex flex-col gap-2', className)}>
      <h3 className={cardTitle}>{title}</h3>
      {description ? (
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
      <div className={cardMetaRow}>
        {aside}
        {chips}
      </div>
    </article>
  );
}
