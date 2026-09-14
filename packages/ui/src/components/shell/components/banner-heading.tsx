'use client';

import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { BannerHeadingProps } from '#src/components/shell/types/banner';
import {
  SHELL_BANNER_DESCRIPTION,
  SHELL_BANNER_HEADING,
  SHELL_BANNER_TITLE,
  SHELL_PAGE_INSET
} from '#src/lib/shell-layout';

/**
 * Settings/group-style title row: heading, optional description, and trailing actions.
 */
const BannerHeading: React.FC<BannerHeadingProps> = ({
  actions,
  children,
  className,
  description,
  title,
  titleTestId,
  ...props
}) => (
  <div className={cn(SHELL_BANNER_HEADING, SHELL_PAGE_INSET, className)} {...props}>
    <div className="min-w-0 flex-1">
      <h1 className={SHELL_BANNER_TITLE} data-testid={titleTestId}>
        {title}
      </h1>
      {description ? <p className={SHELL_BANNER_DESCRIPTION}>{description}</p> : null}
      {children}
    </div>
    {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
  </div>
);

export default BannerHeading;
