import { cn } from '@groam/ui/lib/utils';

/** Truncating meta/attachment link with muted → primary hover. */
export const mutedMetaLinkClassName =
  'inline-flex max-w-48 items-center gap-1 text-xs text-muted-foreground hover:text-primary';

/** Non-interactive twin of {@link mutedMetaLinkClassName}. */
export const mutedMetaLabelClassName =
  'inline-flex max-w-48 items-center gap-1 text-xs text-muted-foreground';

export function mutedMetaLinkClass(className?: string) {
  return cn(mutedMetaLinkClassName, className);
}

export function mutedMetaLabelClass(className?: string) {
  return cn(mutedMetaLabelClassName, className);
}
