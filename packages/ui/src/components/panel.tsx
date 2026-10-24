import type * as React from 'react';
import { cn } from '#src/lib/utils';

export type PanelProps = React.ComponentProps<'div'> & {
  /** `section` for a named region (give it an `aria-label`); the default `div` adds no landmark. */
  as?: 'div' | 'section';
};

/** A clipped, bordered, rounded-lg frame; add `bg-card` or padding through `className`. */
function Panel({ as: Component = 'div', children, className, ...props }: PanelProps) {
  return (
    <Component
      className={cn('overflow-hidden rounded-lg border border-border', className)}
      data-slot="panel"
      {...props}
    >
      {children}
    </Component>
  );
}

export { Panel };
