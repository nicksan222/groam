import type * as React from 'react';
import { cn } from '#src/lib/utils';

/**
 * The row's glyph (a status icon), aligned to the title's first line. Use `media` for a picture
 * taller than a line, such as a chat avatar: it centers on the row instead.
 */
function ListIcon({
  className,
  media = false,
  ...props
}: React.ComponentProps<'span'> & { media?: boolean }) {
  return (
    <span
      className={cn(
        'mr-3 flex min-w-4 justify-center max-md:col-start-1 md:col-start-2 md:row-start-1',
        media ? 'self-center md:row-span-2' : 'h-5 items-center',
        className
      )}
      data-slot="list-icon"
      {...props}
    />
  );
}

export { ListIcon };
