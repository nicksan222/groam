'use client';

import { cn } from '@groam/ui/lib/utils';
import type { CardBodyProps } from '#src/components/shell/types/banner';
import { shellCardBodyVariants } from '#src/lib/shell-card';
import { shellStackClassName } from '#src/lib/shell-layout';

/** Padded body inside `Shell.Card` when the root uses `padding="none"`. */
const CardBody = ({
  as: Component = 'div',
  children,
  className,
  padding = 'md',
  stack,
  ...props
}: CardBodyProps) => (
  <Component
    className={cn(
      shellCardBodyVariants({ padding }),
      stack ? shellStackClassName({ stack }) : undefined,
      className
    )}
    data-padding={padding}
    data-slot="shell-card-body"
    {...props}
  >
    {children}
  </Component>
);

export default CardBody;
