/**
 * A person as a button: a quiet wash on hover, a stronger one with the 2px primary bar while their
 * card is open, and a focus ring.
 */
export const personTrigger =
  'cursor-pointer text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[state=open]:bg-accent data-[state=open]:shadow-[inset_2px_0_0_var(--color-primary)] motion-reduce:transition-none';
