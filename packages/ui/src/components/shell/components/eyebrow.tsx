'use client';

import { cn } from '@groam/ui/lib/utils';
import type { EyebrowProps } from '#src/components/shell/types/banner';
import { shellEyebrowVariants } from '#src/lib/shell-card';

/** Compact uppercase label used above section titles and next-step prompts. */
const Eyebrow = ({
  as: Component = 'p',
  children,
  className,
  size,
  strong,
  tone,
  ...props
}: EyebrowProps) => (
  <Component
    className={cn(shellEyebrowVariants({ size, strong, tone }), className)}
    data-slot="shell-eyebrow"
    data-size={size ?? 'default'}
    data-tone={tone ?? 'muted'}
    {...props}
  >
    {children}
  </Component>
);

export default Eyebrow;
