import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { DescriptionProps } from '#src/components/shell/types';
import { SHELL_DESCRIPTION } from '#src/lib/shell-layout';

const Description: React.FC<DescriptionProps> = ({
  children,
  className,
  suppressHydrationWarning,
  'data-testid': dataTestId
}) => {
  if (children == null || typeof children === 'boolean') return null;

  return (
    <div
      className={cn(SHELL_DESCRIPTION, className)}
      data-testid={dataTestId}
      suppressHydrationWarning={suppressHydrationWarning}
    >
      {children}
    </div>
  );
};

export default Description;
