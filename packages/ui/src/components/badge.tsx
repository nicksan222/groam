import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'amber'
  | 'sky'
  | 'blue'
  | 'rose'
  | 'red'
  | 'emerald'
  | 'green'
  | 'violet';

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'border-transparent bg-primary/10 text-primary [a&]:hover:bg-primary/15',
  secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
  destructive:
    'border-transparent bg-destructive/10 text-destructive [a&]:hover:bg-destructive/15 focus-visible:ring-destructive/20',
  outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
  amber: 'border-transparent bg-warning/10 text-warning',
  sky: 'border-transparent bg-info/10 text-info',
  blue: 'border-transparent bg-primary/10 text-primary',
  rose: 'border-transparent bg-destructive/10 text-destructive',
  red: 'border-transparent bg-destructive/10 text-destructive',
  emerald: 'border-transparent bg-success/10 text-success',
  green: 'border-transparent bg-success/10 text-success',
  violet: 'border-transparent bg-avatar-mauve text-avatar-mauve-foreground'
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'span'> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium transition-[color,background-color,border-color,box-shadow] [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        VARIANTS[variant],
        className
      )}
      data-slot="badge"
      {...props}
    />
  );
}
