import type * as React from 'react';
import { cn } from '#src/lib/utils';

/** The picture at the right edge of the row: an avatar. Shown on phones too. */
function ListAvatar({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'ml-3 flex h-5 w-[22px] items-center justify-self-center max-md:col-start-3 md:col-start-6 md:row-start-1',
        className
      )}
      data-slot="list-avatar"
      {...props}
    />
  );
}

export { ListAvatar };
