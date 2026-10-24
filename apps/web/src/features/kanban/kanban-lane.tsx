import { Heading } from '@groam/ui/components/heading';
import { cn } from '@groam/ui/lib/utils';
import { type ComponentType, type ReactNode, useId } from 'react';
import type { KanbanDropDecision } from '@/types/kanban';
import { KanbanDropHint } from './kanban-drop-hint';
import { useKanbanLaneDrop } from './use-kanban-lane-drop';

const TONES = {
  default: 'bg-muted/50',
  quiet: 'border border-dashed border-border bg-transparent',
  warning: 'border border-warning/25 bg-warning/5'
} as const;

/** The lane's surface: its tone (none when flat), tinted while a card it would take is lifted. */
function laneSurface(
  tone: keyof typeof TONES,
  flat: boolean,
  outcome: KanbanDropDecision['outcome'] | undefined,
  hovered: boolean
) {
  return cn(
    'relative flex min-w-0 flex-col gap-2 rounded-xl p-3 motion-safe:transition-[box-shadow,background-color] motion-safe:duration-200',
    flat ? 'p-0' : TONES[tone],
    outcome === 'allowed' && 'bg-primary/5 ring-1 ring-primary/20',
    outcome === 'allowed' && hovered && 'bg-primary/10 ring-primary/30'
  );
}

/**
 * One column of a kanban: its header (an optional icon, the name, the count, and what the lane is
 * for), whatever sits under the header (`meta`), the cards, and a footer. It is a drop target: a
 * lane the lifted card may enter takes a soft tint, and a refused one says why over itself. A quiet
 * lane is dashed and without a fill; a warning lane takes a faint warning tint. A flat lane drops
 * its surface and names itself only to assistive technology, for a page that shows it alone.
 */
export function KanbanLane<Lane extends string>({
  children,
  className,
  count,
  flat = false,
  footer,
  icon: Icon,
  lane,
  meta,
  subtitle,
  testId,
  title,
  tone = 'default'
}: {
  children: ReactNode;
  className?: string;
  /** The number beside the name: the count, or "shown of total" under a filter. */
  count: ReactNode;
  /** Drawn without its surface, for a page that shows this lane alone under the lane tabs. */
  flat?: boolean;
  footer?: ReactNode;
  icon?: ComponentType<{ 'aria-hidden'?: boolean; className?: string }>;
  lane: Lane;
  meta?: ReactNode;
  subtitle?: ReactNode;
  testId?: string;
  title: string;
  tone?: keyof typeof TONES;
}) {
  const headingId = useId();
  const { decision, hovered, setNodeRef } = useKanbanLaneDrop(lane);
  return (
    <section
      aria-labelledby={headingId}
      className={cn(laneSurface(tone, flat, decision?.outcome, hovered), className)}
      data-drop={decision?.outcome}
      data-lane={lane}
      data-over={hovered || undefined}
      data-testid={testId}
      ref={setNodeRef}
    >
      {decision?.outcome === 'refused' && hovered ? (
        <KanbanDropHint reason={decision.reason} />
      ) : null}
      <header className="flex flex-col gap-1 px-1">
        {/* A flat lane's tab already names it and counts it; the heading stays for assistive tech. */}
        <div className={flat ? 'sr-only' : 'flex items-center gap-2'}>
          {Icon ? (
            <Icon
              aria-hidden
              className={cn(
                'size-4',
                tone === 'warning' ? 'text-warning-foreground' : 'text-muted-foreground'
              )}
            />
          ) : null}
          <Heading level={2} size="sm" id={headingId}>
            {title}
          </Heading>
          <span className="text-sm text-muted-foreground tabular-nums">{count}</span>
        </div>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </header>
      {meta ? <div className="px-1">{meta}</div> : null}
      {children}
      {footer ? <footer className="px-1 text-xs text-muted-foreground">{footer}</footer> : null}
    </section>
  );
}
