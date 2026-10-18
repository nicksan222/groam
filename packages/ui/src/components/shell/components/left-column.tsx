'use client';

import { useColumnsBreakpoint } from '#src/components/shell/context/use-columns-breakpoint';
import type { LeftColumnProps } from '#src/components/shell/types/columns';
import { shellStackClassName } from '#src/lib/shell-layout';

/** Primary content; comes first in the DOM and in the mobile layout. */
export default function LeftColumn({ as: Component = 'div', children, ...props }: LeftColumnProps) {
  useColumnsBreakpoint();
  return (
    <Component
      className={shellStackClassName({ stack: 'lg' })}
      data-slot="shell-left-column"
      {...props}
    >
      {children}
    </Component>
  );
}
