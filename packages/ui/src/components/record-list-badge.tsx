import { Badge } from '@groam/ui/components/badge';
import { cn } from '@groam/ui/lib/utils';
import type { ComponentProps } from 'react';

/** Quiet, consistent labels for record lists; urgent states use their dedicated indicators. */
export function RecordListBadge({
  className,
  ...props
}: Omit<ComponentProps<typeof Badge>, 'variant'>) {
  return (
    <Badge
      className={cn('border-border/60 bg-background/40 text-muted-foreground', className)}
      variant="outline"
      {...props}
    />
  );
}
