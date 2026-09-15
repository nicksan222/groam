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
  default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
  secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
  destructive:
    'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
  outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
  amber: 'border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400',
  sky: 'border-transparent bg-sky-500/10 text-sky-600 dark:text-sky-400',
  blue: 'border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400',
  rose: 'border-transparent bg-rose-500/10 text-rose-600 dark:text-rose-400',
  red: 'border-transparent bg-red-500/10 text-red-600 dark:text-red-400',
  emerald: 'border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  green: 'border-transparent bg-green-500/10 text-green-600 dark:text-green-400',
  violet: 'border-transparent bg-violet-500/10 text-violet-600 dark:text-violet-400'
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'span'> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium transition-[color,box-shadow] [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        VARIANTS[variant],
        className
      )}
      data-slot="badge"
      {...props}
    />
  );
}
