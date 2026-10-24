import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

const sizeClass = {
  sm: 'text-sm leading-relaxed',
  xs: 'text-xs leading-5'
} as const;

export type MutedCopyProps = React.ComponentProps<'p'> & {
  /** `p` for a paragraph; `span` inside paragraphs, buttons, or inline text; `div` for block containers. */
  as?: 'div' | 'p' | 'span';
  size?: keyof typeof sizeClass;
};

function MutedCopy({ as: Tag = 'p', className, size = 'sm', ...props }: MutedCopyProps) {
  return (
    <Tag
      className={cn('text-muted-foreground', sizeClass[size], className)}
      data-slot="muted-copy"
      {...props}
    />
  );
}

export { MutedCopy };
