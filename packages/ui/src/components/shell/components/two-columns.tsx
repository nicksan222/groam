'use client';

import { assertColumns } from '#src/components/shell/context/assert-columns';
import { ColumnsBreakpointContext } from '#src/components/shell/context/columns-context';
import type { TwoColumnsProps } from '#src/components/shell/types/columns';
import { shellSplitClassName } from '#src/lib/shell-layout';

/** Responsive page scaffold. Compose LeftColumn and RightColumn as children. */
export default function TwoColumns({ as: Component = 'div', children, ...props }: TwoColumnsProps) {
  assertColumns(children);
  return (
    <ColumnsBreakpointContext value="xl">
      <Component
        className={shellSplitClassName({ asideWidth: 'sm', gap: 'md' })}
        data-slot="shell-two-columns"
        {...props}
      >
        {children}
      </Component>
    </ColumnsBreakpointContext>
  );
}
