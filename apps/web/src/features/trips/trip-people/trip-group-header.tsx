import { Heading } from '@groam/ui/components/heading';
import { cn } from '@groam/ui/lib/utils';
import type { ComponentType } from 'react';

const TONES = {
  muted: 'bg-muted text-muted-foreground',
  success: 'bg-success/15 text-success-foreground',
  warning: 'bg-warning/15 text-warning-foreground'
} as const;

/**
 * A manifest group's header: a tinted icon tile, the title, a small numeric count chip and the
 * muted reason. It sits a little further from the group above than from its own list.
 */
export function TripGroupHeader({
  count,
  icon: Icon,
  reason,
  title,
  titleId,
  tone
}: {
  count: number;
  icon: ComponentType<{ className?: string }>;
  reason?: string;
  title: string;
  titleId: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="mt-2 mb-2 flex items-center gap-3">
      <span
        aria-hidden
        className={cn('grid size-[22px] shrink-0 place-items-center rounded-md', TONES[tone])}
      >
        <Icon className="size-3.5" />
      </span>
      <Heading level={3} size="base" id={titleId}>
        {title}
      </Heading>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground tabular-nums">
        {count}
      </span>
      {reason ? (
        <span className="text-sm text-muted-foreground max-sm:hidden">{reason}</span>
      ) : null}
    </div>
  );
}
