import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground/72 selection:bg-primary selection:text-primary-foreground relative flex h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-base shadow-xs/5 transition-shadow outline-none not-dark:bg-clip-padding file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-64 md:text-sm dark:bg-background',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24',
        'aria-invalid:border-destructive/36 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/24',
        className
      )}
      {...props}
    />
  );
}

export { Input };
