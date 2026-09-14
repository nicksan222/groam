import type * as React from 'react';
import { cn } from '#src/lib/utils';

export type PanelProps = React.ComponentProps<'section'>;

function Panel({ children, className, ...props }: PanelProps) {
  return (
    <section
      className={cn('overflow-hidden rounded-xl border border-border', className)}
      {...props}
    >
      {children}
    </section>
  );
}

export { Panel };
