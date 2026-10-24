import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

const cardVariants = {
  default:
    'relative flex flex-col gap-4 rounded-lg border border-border bg-card pb-4 text-card-foreground md:gap-6 md:pb-6',
  plain: 'relative rounded-lg border border-border bg-card text-card-foreground',
  inset:
    'relative flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-4 transition-colors hover:border-border'
} as const;

export type CardVariant = keyof typeof cardVariants;

/**
 * `expand` is for a card that appears after its data loads, above content that is already on screen
 * (a "your turn" strip, a notice): its space opens so what is below glides down instead of
 * jumping. Leave it off for cards that are there from the first paint.
 */
function Card({
  className,
  expand = false,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & { expand?: boolean; variant?: CardVariant }) {
  const card = <div data-slot="card" className={cn(cardVariants[variant], className)} {...props} />;
  return expand ? <div className="expand-in">{card}</div> : card;
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-4 pt-4 md:px-6 md:pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-4 md:px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center px-4 md:px-6 [.border-t]:pt-6', className)}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
