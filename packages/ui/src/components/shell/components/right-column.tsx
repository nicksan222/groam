'use client';

import { useColumnsBreakpoint } from '#src/components/shell/context/use-columns-breakpoint';
import type { RightColumnProps } from '#src/components/shell/types/columns';
import { shellSplitAsideClassName } from '#src/lib/shell-layout';

/** Supporting content with responsive sticky positioning inherited from TwoColumns. */
export default function RightColumn({
  as: Component = 'aside',
  children,
  ...props
}: RightColumnProps) {
  const breakpoint = useColumnsBreakpoint();
  return (
    <Component
      className={shellSplitAsideClassName({
        breakpoint,
        stack: 'lg',
        sticky: 'near'
      })}
      data-slot="shell-right-column"
      {...props}
    >
      {children}
    </Component>
  );
}
