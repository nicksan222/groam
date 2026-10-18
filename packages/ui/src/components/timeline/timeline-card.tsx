'use client';

import type * as React from 'react';
import { shellCardClassName } from '#src/lib/shell-card';
import { cn } from '#src/lib/utils';

export type TimelineCardSurface = 'default' | 'lift' | 'panel';

export type TimelineCardProps = React.ComponentProps<'article'> & {
  surface?: TimelineCardSurface;
};

export type TimelineCardHeaderProps = React.ComponentProps<'header'>;
export type TimelineCardBodyProps = React.ComponentProps<'div'>;
export type TimelineCardActionsProps = React.ComponentProps<'footer'>;

const defaultSurfaceClassName = 'overflow-hidden rounded-md border bg-background text-foreground';

function timelineCardSurfaceClassName(surface: TimelineCardSurface = 'default') {
  if (surface === 'lift') {
    return shellCardClassName({ variant: 'lift' });
  }
  if (surface === 'panel') {
    return shellCardClassName({ variant: 'panel' });
  }
  return defaultSurfaceClassName;
}

function TimelineCard({ className, ref, surface, ...props }: TimelineCardProps) {
  return (
    <article
      data-slot="timeline-card"
      data-surface={surface ?? 'default'}
      className={cn(timelineCardSurfaceClassName(surface), className)}
      ref={ref}
      {...props}
    />
  );
}

function TimelineCardHeader({ className, ref, ...props }: TimelineCardHeaderProps) {
  return (
    <header
      data-slot="timeline-card-header"
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 bg-muted/25 px-3 py-2',
        className
      )}
      ref={ref}
      {...props}
    />
  );
}

function TimelineCardBody({ className, ref, ...props }: TimelineCardBodyProps) {
  return (
    <div
      data-slot="timeline-card-body"
      className={cn('px-3 py-3', className)}
      ref={ref}
      {...props}
    />
  );
}

function TimelineCardActions({ className, ref, ...props }: TimelineCardActionsProps) {
  return (
    <footer
      data-slot="timeline-card-actions"
      className={cn('flex items-center justify-end gap-2 px-3 pb-3', className)}
      ref={ref}
      {...props}
    />
  );
}

export { TimelineCard, TimelineCardActions, TimelineCardBody, TimelineCardHeader };
