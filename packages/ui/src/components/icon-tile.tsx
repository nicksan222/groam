import type * as React from 'react';
import { cn } from '#src/lib/utils';

const sizeClass = {
  lg: 'size-10',
  md: 'size-9',
  sm: 'size-8',
  xs: 'size-6'
} as const;

const radiusClass = {
  full: 'rounded-full',
  lg: 'rounded-lg',
  md: 'rounded-md',
  xl: 'rounded-xl'
} as const;

const variantClass = {
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
  outline: 'border border-border text-foreground',
  'outline-muted': 'border border-border text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  solid: 'bg-primary text-primary-foreground'
} as const;

export type IconTileProps = React.ComponentProps<'span'> & {
  radius?: keyof typeof radiusClass;
  size?: keyof typeof sizeClass;
  variant?: keyof typeof variantClass;
};

function IconTile({
  children,
  className,
  radius = 'lg',
  size = 'md',
  variant = 'primary',
  ...props
}: IconTileProps) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center',
        sizeClass[size],
        radiusClass[radius],
        variantClass[variant],
        className
      )}
      data-slot="icon-tile"
      {...props}
    >
      {children}
    </span>
  );
}

export { IconTile };
