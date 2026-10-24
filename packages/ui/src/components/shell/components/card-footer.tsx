'use client';

import { cn } from '@groam/ui/lib/utils';
import type { CardFooterProps } from '#src/components/shell/types/banner';
import { shellCardFooterVariants } from '#src/lib/shell-card';

/** Footer band inside `Shell.Card` for actions and meta rows. */
const CardFooter = ({
  as: Component = 'div',
  children,
  className,
  density = 'compact',
  ...props
}: CardFooterProps) => (
  <Component
    className={cn(shellCardFooterVariants({ density }), className)}
    data-density={density}
    data-slot="shell-card-footer"
    {...props}
  >
    {children}
  </Component>
);

export default CardFooter;
