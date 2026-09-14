import { cn } from '@groam/ui/lib/utils';
import type React from 'react';

import type { FooterProps } from '#src/components/shell/types';
import { SHELL_HEADER_PADDING } from '#src/lib/shell-layout';

const Footer: React.FC<FooterProps> = ({ children, className }) => (
  <div
    className={cn(
      'sticky bottom-0 z-10 w-full border-t bg-background',
      SHELL_HEADER_PADDING,
      className
    )}
  >
    {children}
  </div>
);

export default Footer;
