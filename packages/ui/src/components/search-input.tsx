import { Input } from '@groam/ui/components/input';
import { cn } from '@groam/ui/lib/utils';
import { Search } from 'lucide-react';
import type * as React from 'react';

function SearchInput({
  className,
  inputClassName,
  type = 'search',
  ...props
}: React.ComponentProps<'input'> & { inputClassName?: string }) {
  return (
    <div className={cn('relative min-w-0 flex-1', className)} data-slot="search-input">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        className={cn('h-8 bg-background pl-8 shadow-xs/5', inputClassName)}
        type={type}
        {...props}
      />
    </div>
  );
}

export { SearchInput };
