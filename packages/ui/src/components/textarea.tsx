import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'border-input placeholder:text-muted-foreground/72 selection:bg-primary selection:text-primary-foreground flex min-h-20 w-full min-w-0 resize-y rounded-lg border bg-background px-3 py-2 text-base shadow-xs/5 transition-shadow outline-none not-dark:bg-clip-padding disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-64 md:text-sm dark:bg-background',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24',
        'aria-invalid:border-destructive/36 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/24',
        className
      )}
      data-slot="textarea"
      {...props}
    />
  );
}
