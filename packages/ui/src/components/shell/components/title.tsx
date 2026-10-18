import { cn } from '@groam/ui/lib/utils';
import type React from 'react';

import type { TitleProps } from '#src/components/shell/types';
import { SHELL_TITLE } from '#src/lib/shell-layout';

/**
 * Shell Title component
 */
const Title: React.FC<TitleProps> = ({ children, className, hideOnMobile = false, ...props }) => {
  return (
    <h1 className={cn(SHELL_TITLE, hideOnMobile && 'hidden md:block', className)} {...props}>
      {children}
    </h1>
  );
};

export default Title;
