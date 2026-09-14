'use client';

import { cn } from '@groam/ui/lib/utils';
import type { NoticeBannerProps } from '#src/components/shell/types/banner';
import {
  SHELL_NOTICE_DESCRIPTION,
  SHELL_NOTICE_TITLE,
  SHELL_PAGE_INSET
} from '#src/lib/shell-layout';

/** Full-bleed elevated notice band under entity tabs (shared plan / idea workspace). */
const NoticeBanner = ({
  action,
  className,
  description,
  detail,
  icon: Icon,
  title,
  ...props
}: NoticeBannerProps) => (
  <div
    className={cn(
      'relative z-[1] flex w-full min-w-0 items-center justify-between gap-3 bg-muted/40 py-2.5 shadow-sm',
      SHELL_PAGE_INSET,
      className
    )}
    role="note"
    {...props}
  >
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
    >
      <Icon className="size-4" />
    </span>
    <div className="min-w-0 flex-1">
      <p className={SHELL_NOTICE_TITLE}>{title}</p>
      <p className={SHELL_NOTICE_DESCRIPTION}>
        {detail ? (
          <>
            <span className="text-foreground/80">{detail}</span>
            <span aria-hidden> · </span>
          </>
        ) : null}
        {description}
      </p>
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export default NoticeBanner;
