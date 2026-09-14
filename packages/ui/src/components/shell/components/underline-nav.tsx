'use client';

import { cn } from '@groam/ui/lib/utils';
import type { UnderlineNavProps } from '#src/components/shell/types/banner';
import { SHELL_UNDERLINE_NAV } from '#src/lib/shell-layout';
import TabContainer from './tab-container';

/** Bordered underline tab strip for entity section navigation. */
const UnderlineNav = ({
  'aria-label': ariaLabel,
  children,
  className,
  pageInset,
  ...props
}: UnderlineNavProps) => (
  <nav
    aria-label={ariaLabel}
    className={cn(SHELL_UNDERLINE_NAV, className)}
    data-slot="shell-underline-nav"
    {...props}
  >
    <TabContainer pageInset={pageInset} position="top" variant="underline">
      {children}
    </TabContainer>
  </nav>
);

export default UnderlineNav;
