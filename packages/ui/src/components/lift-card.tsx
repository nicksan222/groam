import { Slot } from '@radix-ui/react-slot';
import type * as React from 'react';
import { shellCardClassName } from '#src/lib/shell-card';

export type LiftCardProps = React.ComponentProps<'div'> & {
  asChild?: boolean;
};

function LiftCard({ asChild = false, className, ...props }: LiftCardProps) {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      className={shellCardClassName({ className, variant: 'lift' })}
      data-slot="lift-card"
      {...props}
    />
  );
}

export { LiftCard };
