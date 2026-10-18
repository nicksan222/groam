'use client';

import { Skeleton } from '@groam/ui/components/skeleton';
import { cn } from '@groam/ui/lib/utils';
import type { SectionHeaderProps } from '#src/components/shell/types/banner';
import { SHELL_DESCRIPTION, SHELL_SECTION_TITLE } from '#src/lib/shell-layout';

function LoadingHeading({ compact }: { compact: boolean }) {
  return (
    <>
      <Skeleton className={compact ? 'h-[11px] w-16' : 'h-3 w-16'} />
      <Skeleton className={cn('max-w-full', compact ? 'h-7 w-20 sm:h-8' : 'h-7 w-28 sm:h-9')} />
      <Skeleton className={cn('max-w-full', compact ? 'h-5 w-56' : 'h-5 w-64')} />
    </>
  );
}

function Heading({
  badge,
  compact,
  description,
  Icon,
  title
}: Pick<SectionHeaderProps, 'badge' | 'description' | 'title'> & {
  compact: boolean;
  Icon: SectionHeaderProps['icon'];
}) {
  return (
    <>
      {badge ? (
        <p className="truncate text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {badge}
        </p>
      ) : compact ? null : (
        <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {Icon ? <Icon className="size-3" /> : null}
          Trip section
        </p>
      )}
      <h2 className={cn('min-w-0 truncate', SHELL_SECTION_TITLE)}>{title}</h2>
      {description != null ? (
        <p className={cn('min-w-0 truncate', SHELL_DESCRIPTION)}>{description}</p>
      ) : null}
    </>
  );
}

function Trailing({ isLoading, trailing }: Pick<SectionHeaderProps, 'isLoading' | 'trailing'>) {
  if (isLoading) return <Skeleton className="h-8 w-24 shrink-0 rounded-md" />;
  return trailing ? <div className="shrink-0">{trailing}</div> : null;
}

const SectionHeader = ({
  badge,
  density = 'default',
  description,
  icon: Icon,
  isLoading = false,
  title,
  trailing
}: SectionHeaderProps) => {
  const compact = density === 'compact';

  return (
    <header className={cn('dashboard-reveal', compact ? 'space-y-1.5' : 'space-y-4')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          {isLoading ? (
            <LoadingHeading compact={compact} />
          ) : (
            <Heading
              badge={badge}
              compact={compact}
              description={description}
              Icon={Icon}
              title={title}
            />
          )}
        </div>
        <Trailing isLoading={isLoading} trailing={trailing} />
      </div>
    </header>
  );
};

export default SectionHeader;
