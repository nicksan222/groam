import type * as React from 'react';
import { cn } from '#src/lib/utils';

/**
 * One row. Fill it with the slot parts, in any order: `List.Leading`, `List.Icon`, `List.Main`
 * (title, description, inline facts, aside), `List.Meta`, `List.Avatar`, `List.Age`, and
 * `List.Expanded`. Absent slots take no room. On wide screens the slots sit in columns with the
 * title's first line as the baseline; on a phone the row is icon, text, avatar.
 *
 * `cursor` marks the keyboard cursor (accent background and a primary bar), `selected` a chosen
 * row, `attention` an item waiting on the viewer (a faint primary bar), `deferred` a row in a long
 * list the browser may skip while off screen.
 */
function ListRow({
  attention = false,
  className,
  cursor = false,
  deferred = false,
  selected = false,
  ...props
}: React.ComponentProps<'li'> & {
  attention?: boolean;
  cursor?: boolean;
  /** Lets the browser skip layout and paint while the row is far off screen (long lists). */
  deferred?: boolean;
  selected?: boolean;
}) {
  return (
    <li
      className={cn(
        'group/row relative isolate grid grid-cols-[auto_minmax(0,1fr)_auto] items-start border-b border-border/60 py-3 pr-4 pl-4 text-[13.5px] hover:bg-accent/40 md:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto_auto] md:gap-y-1 md:pr-6',
        attention &&
          'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary/50',
        deferred && '[contain-intrinsic-size:auto_6rem] [content-visibility:auto]',
        selected && 'md:bg-primary/7',
        cursor &&
          'md:bg-accent md:before:absolute md:before:inset-y-0 md:before:left-0 md:before:w-0.5 md:before:bg-primary',
        className
      )}
      data-cursor={cursor || undefined}
      data-selected={selected || undefined}
      data-slot="list-row"
      {...props}
    />
  );
}

export { ListRow };
