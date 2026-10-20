/**
 * The card language shared by every board card (issues, ideas, plan entries, the glance), modelled
 * on Jira: a raised surface with no outline, a plain title, a row of filled lozenges, and a footer.
 * Layout (grid or stack) is the card's own.
 */
export const cardSurface =
  'relative min-w-0 rounded-md bg-card px-3 py-2.5 text-card-foreground shadow-sm ring-1 ring-foreground/5 transition-[box-shadow,background-color] hover:shadow-md hover:ring-foreground/10 has-[a:hover]:shadow-md';

/** The card's focal point. */
export const cardTitle = 'min-w-0 break-words text-sm leading-5 font-normal';

/** The row of chips that closes every card. */
export const cardMetaRow = 'flex min-w-0 flex-wrap items-center gap-1 empty:hidden';

/** A small filled fact: a label, a date, a condition. Add a tone to make it a status lozenge. */
export const cardChip =
  'inline-flex h-5 min-w-0 max-w-full items-center gap-1 rounded-[3px] bg-muted px-1.5 text-[11px] leading-4 font-medium text-muted-foreground transition-colors [&>svg]:size-3 [&>svg]:shrink-0';

/** Status lozenges: a tinted fill with bold uppercase text. */
export const cardChipTone = {
  destructive: 'bg-destructive/15 font-bold uppercase tracking-wide text-destructive',
  primary: 'bg-primary/15 font-bold uppercase tracking-wide text-primary',
  success: 'bg-success/20 font-bold uppercase tracking-wide text-success-foreground',
  warning: 'bg-warning/20 font-bold uppercase tracking-wide text-warning-foreground'
} as const;

/** Hover and focus for a chip that is itself a link or button. */
export const cardChipInteractive =
  'outline-none hover:text-foreground hover:ring-1 hover:ring-foreground/15 focus-visible:ring-2 focus-visible:ring-ring';

/** Makes the title link cover the whole card; slots above it set `relative z-10`. */
export const cardStretchedLink =
  'outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring';
