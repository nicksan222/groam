import { MutedCopy } from '@groam/ui/components/muted-copy';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';

export function IdeaSectionHeading({
  badge,
  className,
  description,
  icon,
  title,
  titleId
}: {
  badge?: ReactNode;
  className?: string;
  description: string;
  icon?: ReactNode;
  title: string;
  titleId?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold" id={titleId}>
            {title}
          </h3>
        </div>
        <MutedCopy size="xs" className="mt-1">
          {description}
        </MutedCopy>
      </div>
      {badge}
    </div>
  );
}
