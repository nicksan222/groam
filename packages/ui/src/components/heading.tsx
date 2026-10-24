import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

const sizeClass = {
  base: 'text-base font-semibold',
  lg: 'text-lg font-semibold tracking-tight',
  sm: 'text-sm font-semibold',
  xl: 'text-xl font-semibold tracking-tight',
  xs: 'text-xs font-medium'
} as const;

export type HeadingProps = React.ComponentProps<'h2'> & {
  /** The outline level: `h2` to `h6`. It never changes the look; `size` does. Page titles are `Shell.Header`. */
  level: 2 | 3 | 4 | 5 | 6;
  /** Type scale. Omit it to inherit the surrounding font size (semibold). */
  size?: keyof typeof sizeClass;
};

/**
 * A section or card heading below the page title. Pass `id` for an `aria-labelledby` target and
 * layout or color classes through `className`.
 */
function Heading({ className, level, size, ...props }: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      className={cn(size ? sizeClass[size] : 'font-semibold', className)}
      data-slot="heading"
      {...props}
    />
  );
}

export { Heading };
