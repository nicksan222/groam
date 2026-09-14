import { cva } from 'class-variance-authority';

const hideTerminalConnectors =
  'first:after:hidden last:before:hidden only:after:hidden only:before:hidden';

/** Shared connector + rhythm styles for {@link TimelineItem}. */
export const timelineItemVariants = cva('relative flex items-start', {
  variants: {
    variant: {
      default: [
        'gap-3 py-2',
        // Connectors sit above and below the badge — never behind it.
        'before:absolute before:top-9 before:bottom-0 before:left-[13px] before:w-px before:bg-border',
        'after:absolute after:top-0 after:left-[13px] after:h-2 after:w-px after:bg-border',
        hideTerminalConnectors
      ].join(' '),
      minimal: [
        'gap-3.5 py-2.5',
        // Segmented hairline: stops at the 20px marker instead of running through it.
        'before:absolute before:top-[1.875rem] before:bottom-0 before:left-[9.5px] before:w-px before:bg-border/60',
        'after:absolute after:top-0 after:left-[9.5px] after:h-2.5 after:w-px after:bg-border/60',
        hideTerminalConnectors
      ].join(' '),
      activity: [
        'gap-3 py-2',
        // Segmented hairline centered on the 24px actor avatar.
        'before:absolute before:top-8 before:bottom-0 before:left-[11.5px] before:w-px before:bg-border/60',
        'after:absolute after:top-0 after:left-[11.5px] after:h-2 after:w-px after:bg-border/60',
        hideTerminalConnectors
      ].join(' '),
      route: [
        'gap-5 py-4',
        // 128×160 photo markers: 16px padding + 128px tile = 144px (top-36). Line centered at 80px.
        'before:absolute before:top-36 before:bottom-0 before:left-20 before:w-px before:bg-border',
        'after:absolute after:top-0 after:left-20 after:h-4 after:w-px after:bg-border',
        hideTerminalConnectors
      ].join(' ')
    },
    condensed: {
      true: 'py-1',
      false: ''
    }
  },
  compoundVariants: [
    {
      variant: 'minimal',
      condensed: true,
      className: 'py-1.5'
    },
    {
      // Quiet system rows: tighter padding with hairline still meeting the 24px badge.
      variant: 'activity',
      condensed: true,
      className: 'py-1.5 before:top-[1.875rem] after:h-1.5'
    }
  ],
  defaultVariants: {
    variant: 'default',
    condensed: false
  }
});

/** Marker styles for {@link TimelineBadge}. */
export const timelineBadgeVariants = cva(
  'relative z-[4] flex shrink-0 items-center justify-center overflow-hidden ring-2 ring-background',
  {
    variants: {
      variant: {
        default:
          'h-7 w-7 rounded-lg border border-border bg-muted/50 text-foreground [&>svg]:h-3.5 [&>svg]:w-3.5',
        minimal:
          'h-5 w-5 rounded-full border border-border/80 bg-muted/40 text-[10px] font-medium leading-none tabular-nums text-muted-foreground [&>svg]:h-3 [&>svg]:w-3',
        activity:
          'h-6 w-6 rounded-full border border-border bg-muted text-[10px] font-semibold leading-none text-foreground [&>svg]:h-3 [&>svg]:w-3',
        route:
          'h-32 w-40 rounded-xl border border-border bg-muted p-0 text-foreground [&>svg]:h-7 [&>svg]:w-7'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

/** Content column styles for {@link TimelineBody}. */
export const timelineBodyVariants = cva(
  'min-w-0 flex-1 text-sm text-muted-foreground flex flex-col justify-center',
  {
    variants: {
      variant: {
        default: '',
        minimal: 'min-h-5 py-0',
        activity: 'min-h-6 py-0',
        route: 'min-h-32 py-0'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

/** Root layout styles for {@link Timeline}. */
export const timelineRootVariants = cva('flex flex-col', {
  variants: {
    variant: {
      default: '',
      minimal: '',
      activity: '',
      route: ''
    },
    clipSidebar: {
      true: '[&>[data-slot=timeline-item]:first-child]:pt-0 [&>[data-slot=timeline-item]:last-child]:pb-0',
      false: ''
    }
  },
  compoundVariants: [
    {
      // clipSidebar zeros first-item padding; start the outgoing rail at the 28px badge.
      class: '[&>[data-slot=timeline-item]:first-child]:before:top-7',
      clipSidebar: true,
      variant: 'default'
    },
    {
      class: '[&>[data-slot=timeline-item]:first-child]:before:top-5',
      clipSidebar: true,
      variant: 'minimal'
    },
    {
      // clipSidebar zeros first-item padding; start the outgoing rail at the 24px avatar.
      class: '[&>[data-slot=timeline-item]:first-child]:before:top-6',
      clipSidebar: true,
      variant: 'activity'
    },
    {
      // clipSidebar zeros first-item padding; start the outgoing rail at the 128px photo.
      class: '[&>[data-slot=timeline-item]:first-child]:before:top-32',
      clipSidebar: true,
      variant: 'route'
    }
  ],
  defaultVariants: {
    clipSidebar: false,
    variant: 'default'
  }
});
